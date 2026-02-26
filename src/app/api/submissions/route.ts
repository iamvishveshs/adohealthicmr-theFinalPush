import { NextRequest, NextResponse } from 'next/server';
import { getAllAnswers, getModuleById } from '@/lib/store';
import { requireAdmin } from '@/backend/lib/auth';
import { isExpressEnabled, proxyToExpress } from '@/lib/express-proxy';

export const dynamic = 'force-dynamic';

/** Admin only: return all user question/answer submissions. */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    if (isExpressEnabled()) {
      const res = await proxyToExpress('/api/submissions');
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const all = getAllAnswers();
    const modules = new Map<number, string>();
    const submissions = await Promise.all(
      all.map(async (a) => {
        let moduleTitle = modules.get(a.moduleId);
        if (moduleTitle === undefined) {
          const mod = await getModuleById(a.moduleId);
          moduleTitle = mod?.title ?? `Module ${a.moduleId}`;
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
    // Newest first
    submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
