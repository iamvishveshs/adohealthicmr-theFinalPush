import { NextRequest, NextResponse } from 'next/server';
import {
  getModules,
  getQuestions,
  getAnswers,
  getAllAnswers,
  getVideos,
  getStoreStatus,
} from '@/lib/store';
import { requireAuth } from '@/backend/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const moduleIdParam = searchParams.get('moduleId');
    const moduleIdNum = moduleIdParam ? parseInt(moduleIdParam) : undefined;
    const moduleFilter = moduleIdNum != null && !isNaN(moduleIdNum) ? moduleIdNum : undefined;

    const status = getStoreStatus();
    const totalModules = status.modules;
    const totalQuestions = status.questions;
    const totalUsers = user.role === 'admin' ? status.users : undefined;
    const totalVideos = getVideos(moduleFilter).length;

    let answerStats: {
      totalAnswers: number;
      correctAnswers: number;
      incorrectAnswers: number;
      accuracyRate: string;
      uniqueUsersAnswered?: number;
    };
    if (user.role === 'admin') {
      const allAnswersList = getAllAnswers(moduleFilter);
      const totalAnswers = allAnswersList.length;
      const correctAnswers = allAnswersList.filter((a) => a.isCorrect).length;
      const uniqueUsersAnswered = new Set(allAnswersList.map((a) => a.userId)).size;
      answerStats = {
        totalAnswers,
        correctAnswers,
        incorrectAnswers: totalAnswers - correctAnswers,
        accuracyRate: totalAnswers > 0 ? ((correctAnswers / totalAnswers) * 100).toFixed(2) : '0',
        uniqueUsersAnswered,
      };
    } else {
      const userAnswers = getAnswers(user.userId, moduleFilter);
      const totalAnswers = userAnswers.length;
      const correctAnswers = userAnswers.filter((a) => a.isCorrect).length;
      answerStats = {
        totalAnswers,
        correctAnswers,
        incorrectAnswers: totalAnswers - correctAnswers,
        accuracyRate: totalAnswers > 0 ? ((correctAnswers / totalAnswers) * 100).toFixed(2) : '0',
      };
    }

    const moduleStats = await getModules();
    const moduleDetails = await Promise.all(
      moduleStats.map(async (module) => {
        const questions = await getQuestions(module.id);
        const questionsCount = questions.length;
        const videosCount = getVideos(module.id).length;
        const moduleAnswers =
          user.role === 'admin' ? getAllAnswers(module.id) : getAnswers(user.userId, module.id);
        const totalAnswers = moduleAnswers.length;
        const correctAnswers = moduleAnswers.filter((a) => a.isCorrect).length;
        return {
          moduleId: module.id,
          moduleTitle: module.title,
          questionsCount,
          videosCount,
          totalAnswers,
          correctAnswers,
          accuracyRate: totalAnswers > 0 ? ((correctAnswers / totalAnswers) * 100).toFixed(2) : '0',
        };
      })
    );

    return NextResponse.json({
      success: true,
      statistics: {
        overview: {
          totalModules,
          totalQuestions,
          totalUsers,
          totalVideos,
        },
        answers: answerStats,
        modules: moduleDetails,
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
