import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/auth';
import { isExpressEnabled, proxyToExpress } from '@/lib/express-proxy';

export const dynamic = 'force-dynamic';

export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const data = await request.json();
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }
    if (isExpressEnabled()) {
      const res = await proxyToExpress('/api/data/save', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return NextResponse.json(result, { status: res.status });
    }

    // Legacy direct save is no longer supported in the Postgres-backed store.
    // This endpoint now requires the Express backend to handle data persistence.
    return NextResponse.json(
      {
        error: 'Direct data save is not supported in this deployment. Please enable the Express backend or update the database directly.',
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json(
      { error: 'Failed to save data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
