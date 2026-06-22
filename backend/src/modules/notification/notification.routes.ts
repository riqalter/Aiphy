import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/auth.middleware';
import { NotificationService } from './notification.service';

export const notificationRoutes = new Elysia({ prefix: '/api/notifications' })
  // Protect all notification routes
  .use(requireAuth)

  // 1. Get user notifications
  .get('/', async ({ user }) => {
    const list = await NotificationService.getNotifications(user!.id);
    return {
      success: true,
      data: list,
    };
  })

  // 2. Mark specific notification as read
  .put(
    '/:id/read',
    async ({ user, params }) => {
      const updated = await NotificationService.markAsRead(user!.id, params.id);
      return {
        success: true,
        message: 'Notification marked as read',
        data: updated,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // 3. Mark all as read
  .put('/read-all', async ({ user }) => {
    const result = await NotificationService.markAllAsRead(user!.id);
    return result;
  });
