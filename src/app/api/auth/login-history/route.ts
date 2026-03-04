import { NextRequest, NextResponse } from 'next/server';
import { getLoginHistory } from '@/lib/pg-auth';
import { requireAdmin } from '@/backend/lib/auth';

export const dynamic = 'force-dynamic';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const all = await getLoginHistory(500);
    const total = all.length;
    const logins = all.slice(offset, offset + limit).map((login) => ({
      id: `${login.userId}-${login.loginAt}`,
      userId: login.userId,
      username: login.username,
      email: login.email,
      role: login.role,
      loginAt: login.loginAt,
      ipAddress: login.ipAddress,
      userAgent: login.userAgent,
    }));
    return NextResponse.json({
      success: true,
      data: {
        logins,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Get login history error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch login history',
        message: 'An error occurred while fetching login history.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = requireAdmin(handler);