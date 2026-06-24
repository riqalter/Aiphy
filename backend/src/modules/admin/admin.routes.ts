import { Elysia, t } from 'elysia';
import { requireRole } from '../auth/auth.middleware';
import { AdminCourseService } from './admin-course.service';
import { AdminUserService } from './admin-user.service';
import { AIService } from '../ai/ai.service';
import { NotificationService } from '../notification/notification.service';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { db } from '../../config/database';
import { aiTokenUsage } from '../../db/schema/ai';
import { users } from '../../db/schema/users';
import { eq, sql } from 'drizzle-orm';

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  // Wrap all admin endpoints with RBAC checking
  .use(requireRole(['super_admin', 'content_admin']))

  // --- COURSE CRUD ---

  .post(
    '/courses',
    async ({ user, body }) => {
      const course = await AdminCourseService.createCourse({
        ...body,
        createdBy: user!.id,
      });
      return {
        success: true,
        message: 'Course created successfully',
        data: course,
      };
    },
    {
      body: t.Object({
        title: t.String({ minLength: 2 }),
        category: t.String(),
        level: t.Enum({ beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' } as const),
        description: t.String(),
        price: t.Optional(t.Integer({ minimum: 0 })),
        originalPrice: t.Optional(t.Integer({ minimum: 0 })),
        thumbnailUrl: t.Optional(t.String()),
        isPublished: t.Optional(t.Boolean()),
      }),
    }
  )

  .put(
    '/courses/:id',
    async ({ params, body }) => {
      const course = await AdminCourseService.updateCourse(params.id, body);
      return {
        success: true,
        message: 'Course updated successfully',
        data: course,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 2 })),
        category: t.Optional(t.String()),
        level: t.Optional(t.Enum({ beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' } as const)),
        description: t.Optional(t.String()),
        price: t.Optional(t.Integer({ minimum: 0 })),
        originalPrice: t.Optional(t.Integer({ minimum: 0 })),
        thumbnailUrl: t.Optional(t.String()),
        isPublished: t.Optional(t.Boolean()),
      }),
    }
  )

  .delete(
    '/courses/:id',
    async ({ params }) => {
      const result = await AdminCourseService.deleteCourse(params.id);
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // --- MODULE CRUD ---

  .post(
    '/courses/:courseId/modules',
    async ({ params, body }) => {
      const newModule = await AdminCourseService.createModule(params.courseId, body);
      return {
        success: true,
        message: 'Module created successfully',
        data: newModule,
      };
    },
    {
      params: t.Object({ courseId: t.String() }),
      body: t.Object({
        title: t.String({ minLength: 2 }),
        description: t.Optional(t.String()),
        order: t.Optional(t.Integer({ minimum: 1 })),
      }),
    }
  )

  .put(
    '/modules/:id',
    async ({ params, body }) => {
      const updatedModule = await AdminCourseService.updateModule(params.id, body);
      return {
        success: true,
        message: 'Module updated successfully',
        data: updatedModule,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 2 })),
        description: t.Optional(t.String()),
        order: t.Optional(t.Integer({ minimum: 1 })),
      }),
    }
  )

  .delete(
    '/modules/:id',
    async ({ params }) => {
      const result = await AdminCourseService.deleteModule(params.id);
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // --- LESSON CRUD ---

  .post(
    '/modules/:moduleId/lessons',
    async ({ params, body }) => {
      const newLesson = await AdminCourseService.createLesson(params.moduleId, body);
      return {
        success: true,
        message: 'Lesson created successfully',
        data: newLesson,
      };
    },
    {
      params: t.Object({ moduleId: t.String() }),
      body: t.Object({
        title: t.String({ minLength: 2 }),
        type: t.Enum({ video: 'video', text: 'text', coding: 'coding', quiz: 'quiz' } as const),
        duration: t.Optional(t.Integer({ minimum: 0 })),
        contentBody: t.Optional(t.String()),
        mediaUrl: t.Optional(t.String()),
        order: t.Optional(t.Integer({ minimum: 1 })),
      }),
    }
  )

  .put(
    '/lessons/:id',
    async ({ params, body }) => {
      const updatedLesson = await AdminCourseService.updateLesson(params.id, body);
      return {
        success: true,
        message: 'Lesson updated successfully',
        data: updatedLesson,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 2 })),
        type: t.Optional(t.Enum({ video: 'video', text: 'text', coding: 'coding', quiz: 'quiz' } as const)),
        duration: t.Optional(t.Integer({ minimum: 0 })),
        contentBody: t.Optional(t.String()),
        mediaUrl: t.Optional(t.String()),
        order: t.Optional(t.Integer({ minimum: 1 })),
      }),
    }
  )

  .delete(
    '/lessons/:id',
    async ({ params }) => {
      const result = await AdminCourseService.deleteLesson(params.id);
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // --- QUIZ MANAGEMENT ---

  // Get quiz for a lesson (by lessonId)
  .get(
    '/quiz/:lessonId',
    async ({ params }) => {
      const quiz = await AdminCourseService.getQuizWithQuestions(params.lessonId);
      return { success: true, data: quiz };
    },
    { params: t.Object({ lessonId: t.String() }) }
  )

  // Create or replace quiz for a lesson
  .post(
    '/quiz/:lessonId',
    async ({ params, body }) => {
      const quiz = await AdminCourseService.getOrCreateQuiz(params.lessonId, body);
      return { success: true, message: 'Quiz saved', data: quiz };
    },
    {
      params: t.Object({ lessonId: t.String() }),
      body: t.Object({
        title: t.String({ minLength: 2 }),
        passingScore: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
        timeLimitSeconds: t.Optional(t.Integer({ minimum: 0 })),
      }),
    }
  )

  // Add a question to a quiz
  .post(
    '/quiz/:lessonId/questions',
    async ({ params, body }) => {
      const question = await AdminCourseService.addQuestion(params.lessonId, body);
      return { success: true, message: 'Question added', data: question };
    },
    {
      params: t.Object({ lessonId: t.String() }),
      body: t.Object({
        text: t.String({ minLength: 5 }),
        options: t.Array(t.String({ minLength: 1 }), { minItems: 2 }),
        correctAnswer: t.String({ minLength: 1 }),
        explanation: t.Optional(t.String()),
      }),
    }
  )

  // Update a quiz question
  .put(
    '/quiz-questions/:questionId',
    async ({ params, body }) => {
      const question = await AdminCourseService.updateQuestion(params.questionId, body);
      return { success: true, message: 'Question updated', data: question };
    },
    {
      params: t.Object({ questionId: t.String() }),
      body: t.Object({
        text: t.Optional(t.String({ minLength: 5 })),
        options: t.Optional(t.Array(t.String({ minLength: 1 }), { minItems: 2 })),
        correctAnswer: t.Optional(t.String({ minLength: 1 })),
        explanation: t.Optional(t.String()),
      }),
    }
  )

  // Delete a quiz question
  .delete(
    '/quiz-questions/:questionId',
    async ({ params }) => {
      const result = await AdminCourseService.deleteQuestion(params.questionId);
      return result;
    },
    { params: t.Object({ questionId: t.String() }) }
  )

  // --- FILE UPLOAD ---

  .post(
    '/upload',
    async ({ body }) => {
      const file = body.file;
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const uploadDir = './uploads';
      
      // Ensure upload directory exists
      const fs = require('fs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      await Bun.write(`${uploadDir}/${fileName}`, file);
      
      // We will map this to the public static server endpoint
      const fileUrl = `/uploads/${fileName}`;
      
      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: fileUrl,
          fileName,
        },
      };
    },
    {
      body: t.Object({
        file: t.File({
          maxSize: 10 * 1024 * 1024, // 10MB
          error: 'File is required and must be under 10MB',
        }),
      }),
    }
  )

  // --- AI CONTENT GENERATOR ---

  .post(
    '/ai/generate-outline',
    async ({ body }) => {
      const outline = await AIService.generateOutline(body.topic);
      return {
        success: true,
        data: outline,
      };
    },
    {
      body: t.Object({
        topic: t.String({ minLength: 2 }),
      }),
    }
  )

  // --- DASHBOARD STATS & ACTIVITY ---

  .get('/stats', async () => {
    const stats = await AdminUserService.getStats();
    return {
      success: true,
      data: stats,
    };
  })

  .get('/activity', async () => {
    const feed = await AdminUserService.getRecentActivity();
    return {
      success: true,
      data: feed,
    };
  })

  // --- USER MANAGEMENT ---

  .get(
    '/users',
    async ({ query }) => {
      const usersList = await AdminUserService.listUsers(query.search);
      return {
        success: true,
        data: usersList,
      };
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
      }),
    }
  )

  .post(
    '/users',
    async ({ body }) => {
      const newUser = await AdminUserService.createUser(body);
      return {
        success: true,
        message: 'User created successfully by admin',
        data: newUser,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' }),
        password: t.Optional(t.String({ minLength: 8 })),
        role: t.Optional(t.Enum({ learner: 'learner', instructor: 'instructor', content_admin: 'content_admin', super_admin: 'super_admin' } as const)),
      }),
    }
  )

  .put(
    '/users/:id',
    async ({ params, body }) => {
      const updated = await AdminUserService.updateUser(params.id, body);
      return {
        success: true,
        message: 'User updated successfully',
        data: updated,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2 })),
        role: t.Optional(t.Enum({ learner: 'learner', instructor: 'instructor', content_admin: 'content_admin', super_admin: 'super_admin' } as const)),
        status: t.Optional(t.Enum({ active: 'active', inactive: 'inactive', suspended: 'suspended' } as const)),
        planName: t.Optional(t.Enum({ 'Basic Learner': 'Basic Learner', 'Pro Learner': 'Pro Learner' } as const)),
      }),
    }
  )

  .delete(
    '/users/:id',
    async ({ params }) => {
      const result = await AdminUserService.deleteUser(params.id);
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // --- AI & SYSTEM CONFIGURATION ---

  // 11. Get AI system settings
  .get('/ai-config', async () => {
    if (redis.status !== 'ready' && redis.status !== 'connecting') {
      await redis.connect();
    }
    const configStr = await redis.get('ai_config');
    if (configStr) {
      return {
        success: true,
        data: JSON.parse(configStr),
      };
    }
    // Return defaults
    return {
      success: true,
      data: {
        model: env.LLM_MODEL || 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: "Anda adalah AIphy Tutor, asisten pembelajaran kecerdasan buatan adaptif yang cerdas, ramah, dan interaktif untuk pemula di Indonesia. Tugas utama Anda adalah menjelaskan materi secara interaktif, menyederhanakan bahasa teknis yang kompleks menjadi mudah dimengerti, dan memberikan analogi yang relevan di kehidupan sehari-hari.",
      },
    };
  })

  // 12. Save AI system settings
  .post(
    '/ai-config',
    async ({ body }) => {
      if (redis.status !== 'ready' && redis.status !== 'connecting') {
        await redis.connect();
      }
      await redis.set('ai_config', JSON.stringify(body));
      return {
        success: true,
        message: 'AI configuration updated successfully',
      };
    },
    {
      body: t.Object({
        model: t.String(),
        temperature: t.Number(),
        maxTokens: t.Integer(),
        systemPrompt: t.String(),
      }),
    }
  )

  // 13. Get AI Token usage logs (from ai_token_usage table)
  .get('/ai-logs', async () => {
    const logs = await db
      .select({
        id: aiTokenUsage.id,
        userId: aiTokenUsage.userId,
        userName: users.name,
        model: aiTokenUsage.model,
        promptTokens: aiTokenUsage.promptTokens,
        completionTokens: aiTokenUsage.completionTokens,
        estimatedCost: aiTokenUsage.estimatedCost,
        createdAt: aiTokenUsage.createdAt,
      })
      .from(aiTokenUsage)
      .leftJoin(users, eq(aiTokenUsage.userId, users.id))
      .orderBy(sql`${aiTokenUsage.createdAt} DESC`)
      .limit(55);

    return {
      success: true,
      data: logs.map(l => ({
        id: l.id,
        userName: l.userName || 'Unknown User',
        model: l.model,
        promptTokens: l.promptTokens,
        completionTokens: l.completionTokens,
        estimatedCost: Number(l.estimatedCost || 0).toFixed(4),
        createdAt: l.createdAt,
      })),
    };
  })

  // 14. Send/Broadcast notification to a user or all users
  .post(
    '/notifications',
    async ({ body }) => {
      const { userId, type, title, message } = body;

      if (userId === 'all') {
        const allUsers = await db.select({ id: users.id }).from(users);
        const insertions = allUsers.map(u => 
          NotificationService.createNotification({
            userId: u.id,
            type: type ?? 'info',
            title,
            message,
          })
        );
        await Promise.all(insertions);
        return { success: true, message: `Notification broadcasted to ${allUsers.length} users` };
      } else {
        const notif = await NotificationService.createNotification({
          userId,
          type: type ?? 'info',
          title,
          message,
        });
        return { success: true, message: 'Notification sent successfully', data: notif };
      }
    },
    {
      body: t.Object({
        userId: t.String(),
        type: t.Optional(t.Enum({ info: 'info', success: 'success', warning: 'warning', streak: 'streak', badge: 'badge' } as const)),
        title: t.String({ minLength: 2 }),
        message: t.String({ minLength: 2 }),
      }),
    }
  );
