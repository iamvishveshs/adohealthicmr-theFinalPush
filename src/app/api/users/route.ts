import { NextRequest, NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/db';
import { getAllUsers } from '@/lib/pg-auth';
import { getFallbackUsers } from '@/lib/fallback-users';
import { requireAdmin } from '@/backend/lib/auth';
import { getAllAnswers } from '@/lib/store';

export const dynamic = 'force-dynamic';

export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    if (!hasDatabase()) {
      const allFallbackUsers = await getFallbackUsers();
      // Filter out admins in fallback mode
      const users = allFallbackUsers.filter(u =>(u.role as string) !== 'admin');
      return NextResponse.json({ success: true, users, count: users.length });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Force the role to 'user' so admins are strictly excluded
    const opts: { role?: 'user' | 'admin'; search?: string } = { role: 'user' };
    if (search) opts.search = search;

    const usersList = await getAllUsers(opts);

    // Fetch all answers across the platform
    const allAnswers = await getAllAnswers();

    // Map users and strictly attach ONLY their specific answers
    const users = usersList.map((u) => {
      const userSpecificAnswers = allAnswers.filter((ans) => ans.userId === u.id);

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        answers: userSpecificAnswers, // Correctly isolated
      };
    });

    return NextResponse.json({ success: true, users, count: users.length });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});