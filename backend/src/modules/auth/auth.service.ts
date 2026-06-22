import { db } from '../../config/database';
import { users, userProfiles, sessions } from '../../db/schema/users';
import { subscriptionPlans, userSubscriptions } from '../../db/schema/subscriptions';
import { hashPassword, verifyPassword } from '../../lib/hash';
import { signJWT, verifyJWT } from '../../lib/jwt';
import { env } from '../../config/env';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../../lib/email';
import { redis } from '../../config/redis';

export class AuthService {
  // Generate Access and Refresh tokens for a user
  private static async generateTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    const accessToken = await signJWT(payload, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRY);
    const refreshToken = await signJWT(payload, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRY);
    
    return { accessToken, refreshToken };
  }

  // Register a new user
  static async register(data: { name: string; email: string; password?: string; oauthProvider?: string; oauthId?: string }) {
    // Validate email format
    if (!data.email.includes('@')) {
      throw new BadRequestError('Invalid email format');
    }

    // Check if email already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    let passwordHash: string | null = null;
    if (data.password) {
      if (data.password.length < 8) {
        throw new BadRequestError('Password must be at least 8 characters long');
      }
      passwordHash = await hashPassword(data.password);
    }

    // Insert user inside a transaction
    return await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(users).values({
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        oauthProvider: data.oauthProvider || null,
        oauthId: data.oauthId || null,
        role: 'learner',
        status: 'active',
      }).returning();

      // Create User Profile
      await tx.insert(userProfiles).values({
        userId: newUser.id,
        skillLevel: 'beginner',
        notificationEnabled: true,
        darkMode: false,
      });

      // Assign default subscription if plans exist
      const plans = await tx.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, 'Basic Learner')).limit(1);
      if (plans.length > 0) {
        const plan = plans[0];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days default free tier
        
        await tx.insert(userSubscriptions).values({
          userId: newUser.id,
          planId: plan.id,
          status: 'active',
          expiresAt,
        });
      }

      const tokens = await this.generateTokens(newUser);

      // Save session
      const refreshPayload = await verifyJWT(tokens.refreshToken, env.JWT_REFRESH_SECRET);
      const expiresAtDate = refreshPayload?.exp 
        ? new Date(refreshPayload.exp * 1000) 
        : new Date(Date.now() + 7 * 86400 * 1000);

      await tx.insert(sessions).values({
        userId: newUser.id,
        refreshToken: tokens.refreshToken,
        expiresAt: expiresAtDate,
      });

      return {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        ...tokens,
      };
    });
  }

  // Login a user
  static async login(data: { email: string; password?: string }, isOAuth = false) {
    if (!data.email) {
      throw new BadRequestError('Email is required');
    }

    const [user] = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError('Account is suspended. Please contact support.');
    }

    // Verify Password if not OAuth user
    if (isOAuth) {
      // Direct login allowed for verified OAuth callback
    } else if (user.passwordHash && data.password) {
      const isPasswordValid = await verifyPassword(data.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }
    } else if (!user.passwordHash) {
      throw new BadRequestError('Please log in using your social account');
    } else {
      throw new BadRequestError('Password is required');
    }

    const tokens = await this.generateTokens(user);

    // Save session in DB
    const refreshPayload = await verifyJWT(tokens.refreshToken, env.JWT_REFRESH_SECRET);
    const expiresAtDate = refreshPayload?.exp 
      ? new Date(refreshPayload.exp * 1000) 
      : new Date(Date.now() + 7 * 86400 * 1000);

    await db.insert(sessions).values({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: expiresAtDate,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  // Logout a user
  static async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }
    
    await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
    return { success: true };
  }

  // Refresh access token
  static async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    const payload = await verifyJWT(refreshToken, env.JWT_REFRESH_SECRET);
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Verify session exists in DB
    const [session] = await db.select().from(sessions).where(eq(sessions.refreshToken, refreshToken)).limit(1);
    if (!session || session.expiresAt < new Date()) {
      // Cleanup expired session
      if (session) {
        await db.delete(sessions).where(eq(sessions.id, session.id));
      }
      throw new UnauthorizedError('Session expired, please login again');
    }

    // Fetch user
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user || user.status === 'suspended') {
      throw new UnauthorizedError('User not found or suspended');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    // Rotate refresh token: delete old, insert new
    await db.transaction(async (tx) => {
      await tx.delete(sessions).where(eq(sessions.id, session.id));

      const refreshPayload = await verifyJWT(tokens.refreshToken, env.JWT_REFRESH_SECRET);
      const expiresAtDate = refreshPayload?.exp 
        ? new Date(refreshPayload.exp * 1000) 
        : new Date(Date.now() + 7 * 86400 * 1000);

      await tx.insert(sessions).values({
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt: expiresAtDate,
      });
    });

    return tokens;
  }

  // Send Forgot Password link
  static async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestError('Email is required');
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      // Prevent user enumeration by acting successful
      return { success: true, message: 'If email exists, reset instructions have been sent.' };
    }

    // Generate random reset token (e.g. UUID)
    const resetToken = crypto.randomUUID();
    
    // Store in Redis (1h expiration)
    await redis.set(`reset_password:${resetToken}`, user.id, 'EX', 3600);

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Reset Password - AIphy',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Reset Password Anda</h2>
          <p>Halo ${user.name},</p>
          <p>Kami menerima permintaan untuk mereset password akun AIphy Anda. Silakan klik tombol di bawah ini untuk melanjutkan:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>Jika Anda tidak meminta ini, abaikan saja email ini. Link ini hanya berlaku selama 1 jam.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="font-size: 12px; color: #666;">Tim AIphy - Universitas Gunadarma</p>
        </div>
      `,
    });

    return { success: true, message: 'If email exists, reset instructions have been sent.' };
  }

  // Reset password
  static async resetPassword(token: string, passwordHash: string) {
    if (!token) {
      throw new BadRequestError('Reset token is required');
    }

    const userId = await redis.get(`reset_password:${token}`);
    if (!userId) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Update user password
    const hashed = await hashPassword(passwordHash);
    await db.update(users).set({ passwordHash: hashed }).where(eq(users.id, userId));
    
    // Delete token from redis
    await redis.del(`reset_password:${token}`);

    // Invalidate all existing sessions
    await db.delete(sessions).where(eq(sessions.userId, userId));

    return { success: true, message: 'Password reset successfully' };
  }
}
