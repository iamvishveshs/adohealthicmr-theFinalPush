import { NextResponse } from 'next/server';
import { getModules, getQuestions } from '@/lib/store';
import { isExpressEnabled, proxyToExpress } from '@/lib/express-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isExpressEnabled()) {
      const res = await proxyToExpress('/api/data/load');
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const modules = await getModules();
    const allQuestions = await getQuestions();
    const questionsByModule: Record<string, Array<{ id: number; question: string; options: string[]; correctAnswer?: number }>> = {};
    for (const q of allQuestions) {
      const key = String(q.moduleId);
      if (!questionsByModule[key]) questionsByModule[key] = [];
      questionsByModule[key].push({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
      });
    }
    return NextResponse.json({
      modules: modules.map((m) => ({ id: m.id, title: m.title, description: m.description, color: m.color })),
      questions: questionsByModule,
      answers: {},
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error loading data:', error);
    return NextResponse.json({
      modules: [],
      questions: {},
      answers: {},
      lastUpdated: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
