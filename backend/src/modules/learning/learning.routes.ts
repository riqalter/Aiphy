import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/auth.middleware';
import { LearningService } from './learning.service';

export const learningRoutes = new Elysia()
  // Guard all endpoints under auth
  .use(requireAuth)

  // 1. Mark lesson as completed
  .put(
    '/api/courses/:courseId/lessons/:lessonId/complete',
    async ({ user, params }) => {
      return await LearningService.completeLesson(user!.id, params.courseId, params.lessonId);
    },
    {
      params: t.Object({
        courseId: t.String(),
        lessonId: t.String(),
      }),
    }
  )

  // 2. Get course completion progress percentage
  .get(
    '/api/courses/:courseId/progress',
    async ({ user, params }) => {
      const percentage = await LearningService.getCourseProgressPercent(user!.id, params.courseId);
      return {
        success: true,
        data: {
          percentage,
        },
      };
    },
    {
      params: t.Object({
        courseId: t.String(),
      }),
    }
  )

  // 3. Get quiz questions (public/learner facing - correct answers hidden)
  .get(
    '/api/quiz/:lessonId',
    async ({ params }) => {
      const quiz = await LearningService.getQuiz(params.lessonId);
      return {
        success: true,
        data: quiz,
      };
    },
    {
      params: t.Object({
        lessonId: t.String(),
      }),
    }
  )

  // 4. Submit quiz answers for grading and AI feedback
  .post(
    '/api/quiz/:lessonId/submit',
    async ({ user, params, body }) => {
      const result = await LearningService.submitQuiz(user!.id, params.lessonId, body.answers);
      return {
        success: true,
        message: 'Quiz submitted successfully',
        data: result,
      };
    },
    {
      params: t.Object({
        lessonId: t.String(),
      }),
      body: t.Object({
        answers: t.Record(t.String(), t.String(), {
          error: 'Answers must be a map of questionId -> userSelectedChoice',
        }),
      }),
    }
  )

  // 5. Get quiz attempt history for a lesson
  .get(
    '/api/quiz/:lessonId/attempts',
    async ({ user, params }) => {
      const result = await LearningService.getQuizAttempts(user!.id, params.lessonId);
      return {
        success: true,
        data: result,
      };
    },
    {
      params: t.Object({
        lessonId: t.String(),
      }),
    }
  )

  // 6. Get user streak data
  .get('/api/user/streak', async ({ user }) => {
    const streak = await LearningService.getUserStreak(user!.id);
    return {
      success: true,
      data: streak,
    };
  })

  // 6. Get user last active study session
  .get('/api/user/active-study', async ({ user }) => {
    const active = await LearningService.getActiveStudy(user!.id);
    return {
      success: true,
      data: active,
    };
  })

  // 7. Get user earned badges
  .get('/api/user/badges', async ({ user }) => {
    const badgesList = await LearningService.getUserBadges(user!.id);
    return {
      success: true,
      data: badgesList,
    };
  });
