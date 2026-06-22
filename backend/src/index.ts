import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { env } from './config/env';
import { AppError } from './lib/errors';
import { pgClient } from './config/database';
import { redis } from './config/redis';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/user/user.routes';
import { courseRoutes } from './modules/course/course.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { cartRoutes } from './modules/cart/cart.routes';
import { learningRoutes } from './modules/learning/learning.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { runnerRoutes } from './modules/code-runner/runner.routes';
import { notificationRoutes } from './modules/notification/notification.routes';
import { searchRoutes } from './modules/search/search.routes';
import { helpRoutes } from './modules/help/help.routes';

const app = new Elysia()
  .use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
  }))
  .use(swagger({
    path: '/swagger',
    documentation: {
      info: {
        title: 'AIphy Backend API',
        version: '1.0.0',
        description: 'Backend API for AIphy adaptive learning platform',
      },
    },
  }))
  .onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    // Handle Elysia internal validation errors
    if (code === 'VALIDATION' || ('type' in error && error.type === 'validation')) {
      set.status = 422;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: (error as any).message,
          details: 'summary' in error ? error.summary : (error as any).all || null,
        },
      };
    }

    // Handle Elysia internal route not found errors
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
      };
    }

    // Default error response for unhandled errors
    set.status = 500;
    console.error('[Unhandled Error]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: env.NODE_ENV === 'development' ? (error as any).message || String(error) : 'Something went wrong',
      },
    };
  })
  .get('/', () => ({
    success: true,
    message: 'Welcome to AIphy API. Visit /swagger for documentation.',
  }))
  .get('/api/health', async () => {
    let dbStatus = 'UNKNOWN';
    let redisStatus = 'UNKNOWN';

    try {
      await pgClient`SELECT 1`;
      dbStatus = 'OK';
    } catch (err: any) {
      console.error('[HealthCheck] DB Error:', err.message);
      dbStatus = 'DOWN';
    }

    try {
      // Connect if not already connected
      if (redis.status !== 'ready' && redis.status !== 'connecting') {
        await redis.connect();
      }
      const ping = await redis.ping();
      redisStatus = ping === 'PONG' ? 'OK' : 'DOWN';
    } catch (err: any) {
      console.error('[HealthCheck] Redis Error:', err.message);
      redisStatus = 'DOWN';
    }

    const overallStatus = dbStatus === 'OK' && redisStatus === 'OK' ? 'UP' : 'DEGRADED';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  })
  .use(authRoutes)
  .use(userRoutes)
  .use(courseRoutes)
  .use(adminRoutes)
  .use(cartRoutes)
  .use(learningRoutes)
  .use(aiRoutes)
  .use(runnerRoutes)
  .use(notificationRoutes)
  .use(searchRoutes)
  .use(helpRoutes)
  .get('/uploads/*', async ({ params, set }) => {
    const filePath = `./uploads/${params['*']}`;
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      set.status = 404;
      return 'File not found';
    }
    return file;
  });

app.listen(env.PORT, () => {
  console.log(`🚀 AIphy backend running on http://localhost:${env.PORT}`);
  console.log(`📖 Swagger API documentation at http://localhost:${env.PORT}/swagger`);
});
export type App = typeof app;
