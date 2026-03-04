import { NextRequest, NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/db';
import {
  ensureAuthSchema,
  getDefaultAdminUser,
  getUserByUsername,
  getUserByEmail,
  verifyUserPassword,
  verifyUserPasswordByEmail,
  verifyDefaultAdminCredentials,
  addLoginHistory,
  createUserByEmail,
} from '@/lib/pg-auth';
import {
  getFallbackUserByEmail,
  createFallbackUser,
  verifyFallbackPassword,
} from '@/lib/fallback-users';
import { generateToken } from '@/backend/lib/auth';
import { getRolePermissions, isValidRole } from '@/backend/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;
    const isUserLoginByEmail = typeof email === 'string' && email.trim() && typeof password === 'string';
    const isAdminLoginByUsername = typeof username === 'string' && username.trim() && typeof password === 'string';

    if (!isUserLoginByEmail && !isAdminLoginByUsername) {
      return NextResponse.json(
        { error: 'Credentials required', message: 'Use email + password for User Login, or username + password for Admin Login.' },
        { status: 400 }
      );
    }

    // --- User login by email + password (simple: enter email, set password; create account if new) ---
    if (isUserLoginByEmail) {
      const trimmedEmail = (email as string).trim().toLowerCase();
      if (!password) {
        return NextResponse.json({ error: 'Password required', message: 'Please enter your password.' }, { status: 400 });
      }

      // When DB not configured: use file-based fallback store
      if (!hasDatabase()) {
        let user = await getFallbackUserByEmail(trimmedEmail);
        if (!user) {
          try {
            user = await createFallbackUser(trimmedEmail, password);
          } catch (err) {
            console.error('Create fallback user error:', err);
            return NextResponse.json({ error: 'Sign up failed', message: 'Could not create account. Try again or use a different email.' }, { status: 500 });
          }
        } else {
          if (!verifyFallbackPassword(user, password)) {
            return NextResponse.json({ error: 'Invalid credentials', message: 'Email or password is incorrect' }, { status: 401 });
          }
        }
        const token = generateToken({ userId: user.id, username: user.email, role: user.role });
        const permissions = getRolePermissions(user.role);
        const response = NextResponse.json(
          {
            success: true,
            message: 'User login successful',
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
            permissions: { ...permissions, isAdmin: false, isUser: true },
          },
          { status: 200 }
        );
        response.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
        return response;
      }

      await ensureAuthSchema();
      let user = await getUserByEmail(trimmedEmail);
      if (!user) {
        try {
          user = await createUserByEmail(trimmedEmail, password);
        } catch (err: any) {
          console.error('Create user by email error:', err);
          // Check if it's a duplicate user error (user was created between check and insert)
          const isDuplicateError = err?.code === '23505' ||
                                   err?.message?.includes('duplicate') ||
                                   err?.message?.includes('already exists') ||
                                   err?.message?.toLowerCase().includes('user with');

          if (isDuplicateError) {
            // User was created by another request, try to get it again
            user = await getUserByEmail(trimmedEmail);
            if (!user) {
              return NextResponse.json({
                error: 'Account exists',
                message: 'An account with this email already exists. Please log in with your password.'
              }, { status: 409 });
            }
            // Verify password for the existing user
            const valid = await verifyUserPasswordByEmail(trimmedEmail, password);
            if (!valid) {
              return NextResponse.json({ error: 'Invalid credentials', message: 'Email or password is incorrect' }, { status: 401 });
            }
          } else {
            // Other database or system errors
            const errorMessage = err?.message || 'Unknown error';
            console.error('Unexpected error creating user:', errorMessage);
            return NextResponse.json({
              error: 'Sign up failed',
              message: 'Could not create account. Please try again or contact support if the problem persists.'
            }, { status: 500 });
          }
        }
      } else {
        // User exists, verify password
        const valid = await verifyUserPasswordByEmail(trimmedEmail, password);
        if (!valid) {
          return NextResponse.json({ error: 'Invalid credentials', message: 'Email or password is incorrect' }, { status: 401 });
        }
      }
      if (!user) {
        return NextResponse.json({ error: 'User not found', message: 'Could not retrieve user information.' }, { status: 500 });
      }
      if (!isValidRole(user.role)) {
        return NextResponse.json({ error: 'Invalid user role', message: 'User has an invalid role. Contact administrator.' }, { status: 403 });
      }
      const token = generateToken({ userId: user.id, username: user.username, role: user.role });
      const permissions = getRolePermissions(user.role);
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      // Add login history, but don't fail login if it fails
      try {
        await addLoginHistory({
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          loginAt: new Date(),
          ipAddress: ipAddress.split(',')[0].trim(),
          userAgent: userAgent.substring(0, 500),
        });
      } catch (historyError) {
        // Log but don't fail the login
        console.error('Failed to add login history (non-blocking):', historyError);
      }
      const response = NextResponse.json(
        {
          success: true,
          message: 'User login successful',
          user: { id: user.id, username: user.username, email: user.email, role: user.role },
          permissions: { ...permissions, isAdmin: user.role === 'admin', isUser: user.role === 'user' },
        },
        { status: 200 }
      );
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return response;
    }

    // --- Admin / username login ---
    if (!password) {
      return NextResponse.json({ error: 'Password required', message: 'Please enter your password.' }, { status: 400 });
    }

    // When DB is not configured: allow default admin login (adohealthicmr / Welcome@25) for dev
    if (!hasDatabase()) {
      if (verifyDefaultAdminCredentials(username, password)) {
        const user = getDefaultAdminUser();
        const token = generateToken({ userId: user.id, username: user.username, role: user.role });
        const permissions = getRolePermissions('admin');
        const response = NextResponse.json(
          {
            success: true,
            message: 'Admin login successful',
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
            permissions: { ...permissions, isAdmin: true, isUser: false },
          },
          { status: 200 }
        );
        response.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
        return response;
      }
      return NextResponse.json(
        { error: 'Database not configured', message: 'Invalid password.' },
        { status: 503 }
      );
    }

    await ensureAuthSchema();
    const user = await getUserByUsername(username.trim());
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials', message: 'Username or password is incorrect' }, { status: 401 });
    }
    const valid = await verifyUserPassword(username.trim(), password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials', message: 'Username or password is incorrect' }, { status: 401 });
    }
    if (!isValidRole(user.role)) {
      return NextResponse.json({ error: 'Invalid user role', message: 'User has an invalid role. Contact administrator.' }, { status: 403 });
    }
    const token = generateToken({ userId: user.id, username: user.username, role: user.role });
    const permissions = getRolePermissions(user.role);
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    // Add login history, but don't fail login if it fails
    try {
      await addLoginHistory({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        loginAt: new Date(),
        ipAddress: ipAddress.split(',')[0].trim(),
        userAgent: userAgent.substring(0, 500),
      });
    } catch (historyError) {
      // Log but don't fail the login
      console.error('Failed to add login history (non-blocking):', historyError);
    }
    const response = NextResponse.json(
      {
        success: true,
        message: user.role === 'admin' ? 'Admin login successful' : 'User login successful',
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        permissions: { ...permissions, isAdmin: user.role === 'admin', isUser: user.role === 'user' },
      },
      { status: 200 }
    );
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login', message: 'An error occurred during login. Please try again.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}