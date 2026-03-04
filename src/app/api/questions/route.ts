import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, createQuestion } from '@/lib/store';
import { requireAdmin } from '@/backend/lib/auth';
import { isExpressEnabled, proxyToExpress } from '@/lib/express-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (isExpressEnabled()) {
      const { searchParams } = new URL(request.url);
      const q = searchParams.toString();
      const res = await proxyToExpress(`/api/questions${q ? '?' + q : ''}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const moduleIdNum = moduleId ? parseInt(moduleId) : undefined;
    const questions = await getQuestions(isNaN(moduleIdNum as number) ? undefined : moduleIdNum);

    // FIX: Parse the stringified options array into a real JavaScript array
    const formattedQuestions = questions.map((q: any) => {
      let parsedOptions = q.options;
      if (typeof q.options === 'string') {
        try {
          parsedOptions = JSON.parse(q.options);
        } catch (e) {
          console.error("Failed to parse options for question:", q.id);
          parsedOptions = [];
        }
      }
      return { ...q, options: parsedOptions };
    });

    return NextResponse.json({ success: true, questions: formattedQuestions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    if (isExpressEnabled()) {
      const res = await proxyToExpress('/api/questions', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const { id, moduleId, question, options, correctAnswer } = body;
    if (!id || !moduleId || !question || !options || !Array.isArray(options)) {
      return NextResponse.json(
        { error: 'All fields (id, moduleId, question, options) are required' },
        { status: 400 }
      );
    }
    if (options.length < 2) {
      return NextResponse.json(
        { error: 'Question must have at least 2 options' },
        { status: 400 }
      );
    }
    const newQuestion = await createQuestion({ id, moduleId, question, options, correctAnswer });
    return NextResponse.json(
      { success: true, message: 'Question created successfully', question: newQuestion },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question', details: message },
      { status: 500 }
    );
  }
});