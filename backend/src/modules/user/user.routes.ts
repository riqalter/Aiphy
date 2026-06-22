import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/auth.middleware';
import { UserService } from './user.service';

export const userRoutes = new Elysia({ prefix: '/api/user' })
  // Wrap all user routes with authorization check
  .use(requireAuth)

  // 1. Get current user profile
  .get('/profile', async ({ user }) => {
    const profile = await UserService.getProfile(user!.id);
    return {
      success: true,
      data: profile,
    };
  })

  // 2. Update profile information
  .put(
    '/profile',
    async ({ user, body }) => {
      const updatedProfile = await UserService.updateProfile(user!.id, body);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile,
      };
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2 })),
        bio: t.Optional(t.String()),
        learningGoals: t.Optional(t.Array(t.String())),
        skillLevel: t.Optional(t.String()),
        notificationEnabled: t.Optional(t.Boolean()),
        darkMode: t.Optional(t.Boolean()),
        avatarUrl: t.Optional(t.String()),
      }),
    }
  )

  // 3. Change password
  .put(
    '/password',
    async ({ user, body }) => {
      await UserService.changePassword(user!.id, body);
      return {
        success: true,
        message: 'Password changed successfully',
      };
    },
    {
      body: t.Object({
        currentPassword: t.Optional(t.String()),
        newPassword: t.String(),
      }),
    }
  );
