import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/auth.middleware';
import { CodeRunnerService } from './runner.service';

export const runnerRoutes = new Elysia({ prefix: '/api/code' })
  // Protect route with authentication
  .use(requireAuth)

  // Run python script inside sandbox
  .post(
    '/run',
    async ({ user, body }) => {
      const result = await CodeRunnerService.runPythonCode(user!.id, body.code);
      return {
        success: true,
        message: 'Code executed successfully',
        data: result,
      };
    },
    {
      body: t.Object({
        code: t.String({ minLength: 1, error: 'Code content is required' }),
      }),
    }
  );
