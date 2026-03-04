import { NextRequest, NextResponse } from 'next/server';
import { getAnswers, upsertAnswer, upsertAnswers, getQuestionById, getQuestions } from '@/lib/store';
import { sendAnswerNotification } from '@/backend/lib/email';
import { requireAuth } from '@/backend/lib/auth';
import { isExpressEnabled, proxyToExpress } from '@/lib/express-proxy';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const userIdParam = searchParams.get('userId');
    const queryUserId = user.role === 'admin' && userIdParam ? userIdParam : user.userId;

    if (isExpressEnabled()) {
      const params = new URLSearchParams();
      if (queryUserId) params.set('userId', queryUserId);
      if (moduleId) params.set('moduleId', moduleId);
      const q = params.toString();
      const res = await proxyToExpress(`/api/answers${q ? '?' + q : ''}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const moduleIdNum = moduleId ? parseInt(moduleId) : undefined;
    const answers = await getAnswers(queryUserId, isNaN(moduleIdNum as number) ? undefined : moduleIdNum);

    return NextResponse.json({ success: true, answers });
  } catch (error) {
    console.error('Error fetching answers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch answers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();

    // ==========================================
    // BULK UPLOAD LOGIC (Optimized for single query)
    // ==========================================
    if (Array.isArray(body.answers)) {
      const { moduleId, answers } = body;
      const moduleIdNum = typeof moduleId === 'string' ? parseInt(moduleId, 10) : moduleId;

      if (!moduleIdNum || !answers.length) {
        return NextResponse.json({ error: 'moduleId and answers array are required' }, { status: 400 });
      }

      // Fetch questions ONCE to verify correct answers
      const moduleQuestions = await getQuestions(moduleIdNum);

      const bulkData = answers.map((ans: any) => {
        const qIdNum = typeof ans.questionId === 'string' ? parseInt(ans.questionId, 10) : ans.questionId;
        const question = moduleQuestions.find(q => q.id === qIdNum);

        let isCorrect: boolean | undefined;
        if (question && question.correctAnswer !== undefined) {
          if (typeof ans.answer === 'number') isCorrect = ans.answer === question.correctAnswer;
          else if (typeof ans.answer === 'string') isCorrect = ans.answer === question.options?.[question.correctAnswer];
        }

        return {
          userId: user.userId,
          moduleId: moduleIdNum,
          questionId: qIdNum,
          answer: String(ans.answer),
          isCorrect,
        };
      });

      // ONE database hit for all answers
      const records = await upsertAnswers(bulkData);

      return NextResponse.json(
        { success: true, message: 'Bulk answers submitted successfully', answers: records },
        { status: 201 }
      );
    }

    // ==========================================
    // SINGLE UPLOAD LOGIC (Fallback)
    // ==========================================
    const { moduleId, questionId, answer } = body;
    const moduleIdNum = typeof moduleId === 'string' ? parseInt(moduleId, 10) : moduleId;
    const questionIdNum = typeof questionId === 'string' ? parseInt(questionId, 10) : questionId;

    if (moduleIdNum == null || questionIdNum == null || answer === undefined) {
      return NextResponse.json({ error: 'moduleId, questionId, and answer are required' }, { status: 400 });
    }

    const question = await getQuestionById(questionIdNum, moduleIdNum);
    let isCorrect: boolean | undefined;
    if (question && question.correctAnswer !== undefined) {
      if (typeof answer === 'number') isCorrect = answer === question.correctAnswer;
      else if (typeof answer === 'string') isCorrect = answer === question.options[question.correctAnswer];
    }

    const record = await upsertAnswer({
      userId: user.userId,
      moduleId: moduleIdNum,
      questionId: questionIdNum,
      answer: String(answer),
      isCorrect,
    });

    return NextResponse.json({ success: true, message: 'Answer submitted successfully', answer: record }, { status: 201 });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 