import { NextRequest, NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/db';
import { getUserById, updateUserById, deleteUserById } from '@/lib/pg-auth';
import { getFallbackUserById, updateFallbackUser, deleteFallbackUser } from '@/lib/fallback-users';
import { requireAdmin, getCurrentUser } from '@/backend/lib/auth';
import { getAnswers } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const userId = resolvedParams.id;

    if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only view your own profile' },
        { status: 403 }
      );
    }

    let user;
    if (hasDatabase()) {
      user = await getUserById(userId);
    } else {
      user = await getFallbackUserById(userId);
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch this specific user's answers if using the database
    let userAnswers: any[] = [];
    if (hasDatabase()) {
      userAnswers = await getAnswers(userId);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        answers: userAnswers // Included the answers in the response
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const userId = resolvedParams.id;
    const { username, email, role, password } = await request.json();

    if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own profile' },
        { status: 403 }
      );
    }

    if (role && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can change user roles' },
        { status: 403 }
      );
    }

    if (hasDatabase()) {
      const updateData: Parameters<typeof updateUserById>[1] = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (role && currentUser.role === 'admin') updateData.role = role;
      if (password) updateData.password = password;

      const user = await updateUserById(userId, updateData);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
      });
    }

    const updateData: { email?: string; username?: string; password?: string } = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    const user = await updateFallbackUser(userId, updateData);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const DELETE = requireAdmin(async (
  request: NextRequest,
  user,
  context: { params: Promise<{ id: string }> | { id: string } }
) => {
  try {
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const userId = resolvedParams.id;

    if (user.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const ok = hasDatabase()
      ? await deleteUserById(userId)
      : await deleteFallbackUser(userId);

    if (!ok) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});