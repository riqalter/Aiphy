import { Elysia } from 'elysia';
import { verifyJWT } from '../../lib/jwt';
import { env } from '../../config/env';
import { UnauthorizedError, ForbiddenError } from '../../lib/errors';
import { db } from '../../config/database';
import { users } from '../../db/schema/users';
import { eq } from 'drizzle-orm';

// Derive user from Authorization header
export const authContext = new Elysia()
  .derive({ as: 'global' }, async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null };
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, env.JWT_ACCESS_SECRET);
    if (!payload) {
      return { user: null };
    }

    // Fetch user from DB to verify status and role dynamically
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user || user.status === 'suspended') {
      return { user: null };
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  });

// Guard to enforce authentication
export const requireAuth = (app: Elysia) =>
  app.use(authContext).guard({
    beforeHandle({ user }) {
      if (!user) {
        throw new UnauthorizedError('Unauthorized: Access token is invalid or expired');
      }
    },
  });

// Guard to enforce role-based access control
export const requireRole = (roles: ('learner' | 'instructor' | 'content_admin' | 'super_admin')[]) => {
  return (app: Elysia) =>
    app.use(authContext).guard({
      beforeHandle({ user }) {
        if (!user) {
          throw new UnauthorizedError('Unauthorized: Access token is invalid or expired');
        }
        if (!roles.includes(user.role)) {
          throw new ForbiddenError('Forbidden: You do not have permission to access this resource');
        }
      },
    });
};
