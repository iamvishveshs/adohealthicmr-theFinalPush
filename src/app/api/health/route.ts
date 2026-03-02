import { NextResponse } from 'next/server';
import { getStoreStatus } from '@/lib/store';
import { hasDatabase } from '@/lib/db';
import { getUserByUsername, getUsersCount } from '@/lib/pg-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = getStoreStatus();
    const dbConfigured = hasDatabase();
    let adminUserExists = false;
    let totalUsers = 0;
    if (dbConfigured) {
      try {
        const adminUser = await getUserByUsername('adohealthicmr');
        adminUserExists = !!adminUser;
        totalUsers = await getUsersCount();
      } catch (e) {
        console.warn('Health: database check failed', e);
      }
    }
    return NextResponse.json({
      status: 'healthy',
      database: dbConfigured ? 'postgres' : 'none (file-based)',
      store: 'in-memory',
      adminUserExists,
      totalUsers,
      modules: status.modules,
      questions: status.questions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
