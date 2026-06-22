import { db } from '../../config/database';
import { users, userProfiles } from '../../db/schema/users';
import { userSubscriptions, subscriptionPlans } from '../../db/schema/subscriptions';
import { eq } from 'drizzle-orm';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { hashPassword, verifyPassword } from '../../lib/hash';

export class UserService {
  // Get User Profile with details, preferences, and subscriptions
  static async getProfile(userId: string) {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        oauthProvider: users.oauthProvider,
        createdAt: users.createdAt,
        bio: userProfiles.bio,
        learningGoals: userProfiles.learningGoals,
        skillLevel: userProfiles.skillLevel,
        notificationEnabled: userProfiles.notificationEnabled,
        darkMode: userProfiles.darkMode,
        subscription: {
          id: userSubscriptions.id,
          status: userSubscriptions.status,
          expiresAt: userSubscriptions.expiresAt,
          planName: subscriptionPlans.name,
          aiLimit: subscriptionPlans.aiLimit,
        },
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
      .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundError('User not found');
    }

    const res = results[0];
    return {
      id: res.id,
      name: res.name,
      email: res.email,
      role: res.role,
      avatarUrl: res.avatarUrl,
      oauthProvider: res.oauthProvider,
      createdAt: res.createdAt,
      bio: res.bio,
      learningGoals: res.learningGoals ? JSON.parse(res.learningGoals) : [],
      skillLevel: res.skillLevel,
      notificationEnabled: res.notificationEnabled,
      darkMode: res.darkMode,
      subscription: res.subscription.id ? res.subscription : null,
    };
  }

  // Update Profile fields
  static async updateProfile(
    userId: string,
    data: {
      name?: string;
      bio?: string;
      learningGoals?: string[];
      skillLevel?: string;
      notificationEnabled?: boolean;
      darkMode?: boolean;
      avatarUrl?: string;
    }
  ) {
    return await db.transaction(async (tx) => {
      // 1. Update users table if name/avatarUrl is changed
      if (data.name !== undefined || data.avatarUrl !== undefined) {
        await tx
          .update(users)
          .set({
            ...(data.name !== undefined && { name: data.name }),
            ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }

      // 2. Update userProfiles table
      await tx
        .update(userProfiles)
        .set({
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.learningGoals !== undefined && { learningGoals: JSON.stringify(data.learningGoals) }),
          ...(data.skillLevel !== undefined && { skillLevel: data.skillLevel }),
          ...(data.notificationEnabled !== undefined && { notificationEnabled: data.notificationEnabled }),
          ...(data.darkMode !== undefined && { darkMode: data.darkMode }),
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));

      return this.getProfile(userId);
    });
  }

  // Change Password
  static async changePassword(
    userId: string,
    data: { currentPassword?: string; newPassword?: string }
  ) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.passwordHash) {
      if (!data.currentPassword || !data.newPassword) {
        throw new BadRequestError('Current and new password are required');
      }

      const isOldPasswordValid = await verifyPassword(data.currentPassword, user.passwordHash);
      if (!isOldPasswordValid) {
        throw new BadRequestError('Current password is incorrect');
      }
    } else {
      // Social login user setting password for the first time
      if (!data.newPassword) {
        throw new BadRequestError('New password is required');
      }
    }

    if (data.newPassword!.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long');
    }

    const hashed = await hashPassword(data.newPassword!);
    await db.update(users).set({ passwordHash: hashed }).where(eq(users.id, userId));

    return { success: true, message: 'Password changed successfully' };
  }
}
