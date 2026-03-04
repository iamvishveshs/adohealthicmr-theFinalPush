import { NextRequest, NextResponse } from 'next/server';
import { getQuestionById, updateQuestion, deleteQuestion } from '@/lib/store';
import { requireAdmin } from '@/backend/lib/auth';
import { isExpressEnabled, proxyToExpress } from '@/lib/express-proxy';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    if (isExpressEnabled()) {
      const q = searchParams.toString();
      const res = await proxyToExpress(`/api/questions/${id}${q ? '?' + q : ''}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId query parameter is required' }, { status: 400 });
    }
    const questionId = parseInt(id);
    const moduleIdNum = parseInt(moduleId);
    if (isNaN(questionId) || isNaN(moduleIdNum)) {
      return NextResponse.json({ error: 'Invalid question ID or module ID' }, { status: 400 });
    }
    const question: any = await getQuestionById(questionId, moduleIdNum);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // FIX: Parse the stringified options array into a real JavaScript array
    let parsedOptions = question.options;
    if (typeof question.options === 'string') {
      try {
        parsedOptions = JSON.parse(question.options);
      } catch (e) {
        console.error("Failed to parse options for question:", question.id);
        parsedOptions = [];
      }
    }
    const formattedQuestion = { ...question, options: parsedOptions };

    return NextResponse.json({ success: true, question: formattedQuestion });
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const PUT = requireAdmin(async (
  request: NextRequest,
  user,
  context: { params: Promise<{ id: string }> | { id: string } }
) => {
  try {
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const id = resolvedParams.id;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    if (isExpressEnabled()) {
      const res = await proxyToExpress(`/api/questions/${id}?moduleId=${moduleId || ''}`, {
        method: 'PUT',
        body: JSON.stringify({ ...body, moduleId: moduleId ? parseInt(moduleId) : undefined }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId query parameter is required' }, { status: 400 });
    }
    const questionId = parseInt(id);
    const moduleIdNum = parseInt(moduleId);
    if (isNaN(questionId) || isNaN(moduleIdNum)) {
      return NextResponse.json({ error: 'Invalid question ID or module ID' }, { status: 400 });
    }
    const { question, options, correctAnswer } = body;
    if (options && Array.isArray(options) && options.length < 2) {
      return NextResponse.json(
        { error: 'Question must have at least 2 options' },
        { status: 400 }
      );
    }
    const updatedQuestion = await updateQuestion(questionId, moduleIdNum, { question, options, correctAnswer });
    if (!updatedQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: 'Question updated successfully',
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAdmin(async (
  request: NextRequest,
  user,
  context: { params: Promise<{ id: string }> | { id: string } }
) => {
  try {
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const id = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    if (isExpressEnabled()) {
      const res = await proxyToExpress(`/api/questions/${id}?moduleId=${moduleId || ''}`, { method: 'DELETE' });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId query parameter is required' }, { status: 400 });
    }
    const questionId = parseInt(id);
    const moduleIdNum = parseInt(moduleId);
    if (isNaN(questionId) || isNaN(moduleIdNum)) {
      return NextResponse.json({ error: 'Invalid question ID or module ID' }, { status: 400 });
    }
    const ok = await deleteQuestion(questionId, moduleIdNum);
    if (!ok) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});