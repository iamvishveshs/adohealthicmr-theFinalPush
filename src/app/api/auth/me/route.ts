import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/backend/lib/auth';
import { DEFAULT_ADMIN_USERNAME, getDefaultAdminUser, getUserByUsername } from '@/lib/pg-auth';
import { hasDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = await getCurrentUser(request);
    if (!payload) {
      // Return 200 with success: false instead of 401 to avoid console errors
      // This is a status check endpoint, not an error condition
      return NextResponse.json({ success: false, authenticated: false });
    }

    // OTP users: userId is otp:email, no store record
    if (payload.userId.startsWith('otp:')) {
      return NextResponse.json({
        success: true,
        user: { id: payload.userId, username: payload.username, email: payload.userId.replace('otp:', ''), role: payload.role },
      });
    }

    // Default admin when DB not configured (dev fallback)
    if (payload.username === DEFAULT_ADMIN_USERNAME && !hasDatabase()) {
      return NextResponse.json({
        success: true,
        user: getDefaultAdminUser(),
      });
    }

    // Fallback users (no DB): return from JWT payload
    if (!hasDatabase() && payload.role === 'user') {
      return NextResponse.json({
        success: true,
        user: { id: payload.userId, username: payload.username, email: payload.username, role: payload.role },
      });
    }

    const user = await getUserByUsername(payload.username);
    if (!user) {
      // Token valid but user missing in DB (e.g. logged in as default admin without DB)
      if (payload.username === DEFAULT_ADMIN_USERNAME) {
        return NextResponse.json({ success: true, user: getDefaultAdminUser() });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ error: 'Failed to get user information' }, { status: 500 });
  }
}