import { db } from '../../config/database';
import { users, userProfiles } from '../../db/schema/users';
import { userSubscriptions, subscriptionPlans } from '../../db/schema/subscriptions';
import { supportTickets } from '../../db/schema/support';
import { courses, lessons, courseEnrollments } from '../../db/schema/courses';
import { aiTokenUsage } from '../../db/schema/ai';
import { eq, and, sql, or, like } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { hashPassword } from '../../lib/hash';

export class AdminUserService {
  // --- ADMIN DASHBOARD STATS ---

  static async getStats() {
    // 1. Total Users
    const usersCountQuery = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    
    // 2. Total Courses
    const coursesCountQuery = await db.select({ count: sql<number>`COUNT(*)` }).from(courses);

    // 3. Open Tickets
    const ticketsCountQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'open'));

    // 4. Token usage aggregate
    const tokenQuery = await db
      .select({
        totalInput: sql<number>`COALESCE(SUM(${aiTokenUsage.promptTokens}), 0)`,
        totalOutput: sql<number>`COALESCE(SUM(${aiTokenUsage.completionTokens}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${aiTokenUsage.estimatedCost}), 0)`,
      })
      .from(aiTokenUsage);

    return {
      usersCount: usersCountQuery[0].count,
      coursesCount: coursesCountQuery[0].count,
      openTicketsCount: ticketsCountQuery[0].count,
      aiStats: {
        totalInputTokens: Number(tokenQuery[0].totalInput),
        totalOutputTokens: Number(tokenQuery[0].totalOutput),
        totalTokens: Number(tokenQuery[0].totalInput) + Number(tokenQuery[0].totalOutput),
        estimatedCostUSD: Number(tokenQuery[0].totalCost),
      },
    };
  }

  // --- RECENT ACTIVITY FEED ---

  static async getRecentActivity() {
    // Fetch recent course enrollments as activities
    const enrollments = await db
      .select({
        id: courseEnrollments.id,
        userId: courseEnrollments.userId,
        userName: users.name,
        action: sql<string>`'enrolled'`,
        detail: courses.title,
        timestamp: courseEnrollments.enrolledAt,
      })
      .from(courseEnrollments)
      .innerJoin(users, eq(courseEnrollments.userId, users.id))
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .orderBy(sql`enrolled_at DESC`)
      .limit(10);

    // Fetch recent tickets
    const tickets = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        userName: users.name,
        action: sql<string>`'ticket_created'`,
        detail: supportTickets.subject,
        timestamp: supportTickets.createdAt,
      })
      .from(supportTickets)
      .innerJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(sql`created_at DESC`)
      .limit(10);

    // Merge and sort activities by timestamp desc
    const combined = [...enrollments, ...tickets].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return combined.slice(0, 10);
  }

  // --- USER MANAGEMENT ---

  static async listUsers(search?: string) {
    const query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        planName: subscriptionPlans.name,
      })
      .from(users)
      .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
      .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id));

    if (search) {
      const searchTerm = `%${search}%`;
      return await query.where(
        or(
          like(users.name, searchTerm),
          like(users.email, searchTerm)
        )
      );
    }

    return await query;
  }

  static async createUser(data: { name: string; email: string; password?: string; role?: 'learner' | 'instructor' | 'content_admin' | 'super_admin' }) {
    const existing = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      throw new BadRequestError('Email already registered');
    }

    const passwordHash = data.password ? await hashPassword(data.password) : await hashPassword('Aiphy1234!');

    return await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role ?? 'learner',
          status: 'active',
        })
        .returning();

      await tx.insert(userProfiles).values({
        userId: newUser.id,
        skillLevel: 'beginner',
      });

      return newUser;
    });
  }

  static async updateUser(
    userId: string,
    data: { name?: string; role?: 'learner' | 'instructor' | 'content_admin' | 'super_admin'; status?: 'active' | 'inactive' | 'suspended' }
  ) {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new NotFoundError('User not found');
    }

    return updated;
  }

  static async deleteUser(userId: string) {
    const [deleted] = await db.delete(users).where(eq(users.id, userId)).returning();
    if (!deleted) {
      throw new NotFoundError('User not found');
    }
    return { success: true, message: 'User deleted successfully' };
  }
}
