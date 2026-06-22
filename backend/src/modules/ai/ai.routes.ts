import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/auth.middleware';
import { AIService } from './ai.service';

export const aiRoutes = new Elysia({ prefix: '/api/chat' })
  // Protect all chat routes with authentication
  .use(requireAuth)

  // 1. Create a new conversation session
  .post(
    '/conversations',
    async ({ user, body }) => {
      const conv = await AIService.createConversation(user!.id, body);
      return {
        success: true,
        message: 'Conversation session created successfully',
        data: conv,
      };
    },
    {
      body: t.Object({
        title: t.String({ minLength: 2 }),
        courseId: t.Optional(t.String()),
      }),
    }
  )

  // 2. Get list of user conversation sessions
  .get('/conversations', async ({ user }) => {
    const list = await AIService.getConversations(user!.id);
    return {
      success: true,
      data: list,
    };
  })

  // 3. Get message history of a conversation
  .get(
    '/history/:id',
    async ({ params }) => {
      const history = await AIService.getHistory(params.id);
      return {
        success: true,
        data: history,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // 4. Send a message and stream the AI response (SSE)
  .post(
    '/message',
    async ({ user, body, set }) => {
      const stream = await AIService.sendMessageStream(user!.id, body.conversationId, body.message, body.lessonId);
      
      // Set stream headers
      set.headers['Content-Type'] = 'text/event-stream';
      set.headers['Cache-Control'] = 'no-cache';
      set.headers['Connection'] = 'keep-alive';
      
      return stream;
    },
    {
      body: t.Object({
        conversationId: t.String(),
        message: t.String({ minLength: 1 }),
        lessonId: t.Optional(t.String()),
      }),
    }
  )
  
  // 5. Delete a conversation session
  .delete(
    '/conversations/:id',
    async ({ user, params }) => {
      return await AIService.deleteConversation(user!.id, params.id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
