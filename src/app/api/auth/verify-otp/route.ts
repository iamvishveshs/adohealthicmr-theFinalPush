import { NextRequest, NextResponse } from 'next/server';
import { verifyAndConsumeOTP, getUserByUsername, addLoginHistory } from '@/lib/pg-auth';
import { generateToken } from '@/backend/lib/auth';
import { getRolePermissions, isValidRole } from '@/backend/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, username, otp } = await request.json();
    if (!otp) return NextResponse.json({ error: 'OTP is required', message: 'Please provide the OTP sent to your email' }, { status: 400 });
    if (!email || !username) return NextResponse.json({ error: 'Email and username are required', message: 'Please provide both your email address and username' }, { status: 400 });

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedUsername = username.trim();
    const record = await verifyAndConsumeOTP(trimmedEmail, otp);

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired OTP', message: 'The OTP you entered is invalid or has expired. Please request a new one.' }, { status: 401 });
    }
    if (record.username !== trimmedUsername) {
      return NextResponse.json({ error: 'Invalid credentials', message: 'Username does not match.' }, { status: 401 });
    }

    let userId: string;
    let role: string = 'user';
    const dbUser = await getUserByUsername(trimmedUsername);
    if (dbUser && dbUser.role && isValidRole(dbUser.role)) {
      userId = dbUser.id;
      role = dbUser.role;
    } else {
      userId = `otp:${trimmedEmail}`;
    }

    const token = generateToken({ userId, username: trimmedUsername, role });
    const permissions = getRolePermissions(role as 'user' | 'admin');

    if (dbUser) {
      await addLoginHistory({
        userId: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        role: dbUser.role,
        loginAt: new Date(),
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        userAgent: (request.headers.get('user-agent') || 'unknown').substring(0, 500),
      });
    }

    const response = NextResponse.json(
      {
        success: true,
        message: role === 'admin' ? 'Admin login successful' : 'User login successful',
        user: { id: dbUser?.id ?? userId, username: trimmedUsername, email: trimmedEmail, role },
        permissions: { ...permissions, isAdmin: role === 'admin', isUser: role === 'user' },
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
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP', message: 'An error occurred during OTP verification. Please try again.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}