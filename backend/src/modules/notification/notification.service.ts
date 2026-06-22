import { db } from '../../config/database';
import { notifications } from '../../db/schema/support';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError } from '../../lib/errors';

export class NotificationService {
  // Get all notifications for user
  static async getNotifications(userId: string) {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  // Create a new notification (system internal helper)
  static async createNotification(data: { userId: string; type?: string; title: string; message: string }) {
    const [notif] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type ?? 'info',
        title: data.title,
        message: data.message,
      })
      .returning();

    return notif;
  }

  // Mark notification as read
  static async markAsRead(userId: string, notificationId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (!updated) {
      throw new NotFoundError('Notification not found');
    }

    return updated;
  }

  // Mark all notifications as read for user
  static async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    return { success: true, message: 'All notifications marked as read' };
  }
}
