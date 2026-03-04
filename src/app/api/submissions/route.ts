import { NextRequest, NextResponse } from 'next/server';
import { getAllAnswers, getAnswers, getModuleById } from '@/lib/store';
import { requireAdmin } from '@/backend/lib/auth';
import { isExpressEnabled, proxyToExpress } from '@/lib/express-proxy';

export const dynamic = 'force-dynamic';

export const GET = requireAdmin(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const moduleIdParam = searchParams.get('moduleId');

    if (isExpressEnabled()) {
      const q = searchParams.toString();
      const res = await proxyToExpress(`/api/submissions${q ? '?' + q : ''}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const moduleId = moduleIdParam ? parseInt(moduleIdParam, 10) : undefined;

    // 1. Wait for the database to return the answers
    const all = await getAllAnswers(moduleId);

    const modules = new Map<number, string>();

    // 2. Properly await all map iterations
    const submissions = await Promise.all(
      all.map(async (a) => {
        let moduleTitle = modules.get(a.moduleId);

        if (moduleTitle === undefined) {
          // 3. Wait for the database to get the module details
          const mod = await getModuleById(a.moduleId);
          moduleTitle = mod ? mod.title : 'Unknown Module';
          modules.set(a.moduleId, moduleTitle);
        }

        return {
          userId: a.userId,
          moduleId: a.moduleId,
          moduleTitle,
          questionId: a.questionId,
          answer: a.answer,
          isCorrect: a.isCorrect,
          submittedAt: a.submittedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});