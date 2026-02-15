import { NextRequest, NextResponse } from 'next/server';
import { getAnswers, upsertAnswer, getQuestionById } from '@/lib/store';
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
      // Send notification email (best-effort)
      try {
        // Try to extract an answer record from the proxied response
        const answerRecord =
          data?.answer ?? (Array.isArray(data?.answers) && data.answers.length ? data.answers[0] : undefined);
        const q = answerRecord?.question ?? data?.question;
        const moduleIdNum =
          answerRecord?.moduleId ?? (moduleId ? (isNaN(parseInt(moduleId, 10)) ? undefined : parseInt(moduleId, 10)) : undefined);
        const questionIdNum = answerRecord?.questionId ?? (answerRecord?.question?.id ?? undefined);
        const answerVal = answerRecord?.answer ?? undefined;
        const isCorrect = answerRecord?.isCorrect ?? undefined;

        // Only send notification when we have numeric moduleId and questionId
        if (typeof moduleIdNum === 'number' && typeof questionIdNum === 'number') {
          await sendAnswerNotification('adohealthicr2025@gmail.com', {
            userId: user.userId,
            moduleId: moduleIdNum,
            questionId: questionIdNum,
            questionText: q?.question,
            answer: String(answerVal),
            isCorrect,
          });
        }
      } catch (e) {
        console.error('Error sending answer notification:', e);
      }
      return NextResponse.json(data, { status: res.status });
    }
    const moduleIdNum = moduleId ? parseInt(moduleId) : undefined;
    const answers = getAnswers(queryUserId, isNaN(moduleIdNum as number) ? undefined : moduleIdNum);
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
    const { moduleId, questionId, answer } = body;
    // Normalize numeric IDs (accept string or number in request body)
    const moduleIdNum = typeof moduleId === 'string' ? (isNaN(parseInt(moduleId, 10)) ? undefined : parseInt(moduleId, 10)) : moduleId;
    const questionIdNum = typeof questionId === 'string' ? (isNaN(parseInt(questionId, 10)) ? undefined : parseInt(questionId, 10)) : questionId;
    if (isExpressEnabled()) {
      let isCorrect: boolean | undefined;
      try {
        const qRes = await proxyToExpress(`/api/questions?moduleId=${moduleIdNum ?? moduleId}`);
        const qData = await qRes.json();
        const question = qData.questions?.find((q: { id: number }) => q.id === questionIdNum);
        if (question && question.correctAnswer !== undefined) {
          if (typeof answer === 'number') isCorrect = answer === question.correctAnswer;
          else if (typeof answer === 'string') isCorrect = answer === question.options?.[question.correctAnswer];
        }
      } catch {}
      const res = await proxyToExpress('/api/answers', {
        method: 'POST',
        body: JSON.stringify({ userId: user.userId, moduleId, questionId, answer: String(answer), isCorrect }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    if (moduleIdNum == null || questionIdNum == null || answer === undefined) {
      return NextResponse.json(
        { error: 'moduleId, questionId, and answer are required' },
        { status: 400 }
      );
    }
    const question = await getQuestionById(questionIdNum, moduleIdNum);
    let isCorrect: boolean | undefined;
    if (question && question.correctAnswer !== undefined) {
      if (typeof answer === 'number') {
        isCorrect = answer === question.correctAnswer;
      } else if (typeof answer === 'string') {
        isCorrect = answer === question.options[question.correctAnswer];
      }
    }
    const record = upsertAnswer({
      userId: user.userId,
      moduleId,
      questionId,
      answer: String(answer),
      isCorrect,
    });
    // Send notification email (best-effort)
    try {
      await sendAnswerNotification('adohealthicr2025@gmail.com', {
        userId: user.userId,
        moduleId,
        questionId,
        questionText: question?.question,
        answer: String(answer),
        isCorrect,
      });
    } catch (e) {
      console.error('Error sending answer notification:', e);
    }
    return NextResponse.json(
      { success: true, message: 'Answer submitted successfully', answer: record },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
