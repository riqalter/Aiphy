import { Elysia, t } from 'elysia';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { env } from '../../config/env';
import { BadRequestError } from '../../lib/errors';
import { db } from '../../config/database';
import { users } from '../../db/schema/users';
import { eq } from 'drizzle-orm';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  // 1. Email & Password Registration
  .post(
    '/register',
    async ({ body }) => {
      const result = await AuthService.register({
        name: body.name,
        email: body.email,
        password: body.password,
      });
      return {
        success: true,
        message: 'Registration successful',
        data: result,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, error: 'Name must be at least 2 characters' }),
        email: t.String({ format: 'email', error: 'Invalid email address' }),
        password: t.String({ minLength: 8, error: 'Password must be at least 8 characters' }),
      }),
    }
  )

  // 2. Email & Password Login
  .post(
    '/login',
    async ({ body }) => {
      const result = await AuthService.login({
        email: body.email,
        password: body.password,
      });
      return {
        success: true,
        message: 'Login successful',
        data: result,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email', error: 'Invalid email address' }),
        password: t.String(),
      }),
    }
  )

  // 3. Logout Session
  .post(
    '/logout',
    async ({ body }) => {
      await AuthService.logout(body.refreshToken);
      return {
        success: true,
        message: 'Logout successful',
      };
    },
    {
      body: t.Object({
        refreshToken: t.String({ error: 'Refresh token is required' }),
      }),
    }
  )

  // 4. Token Rotation (Refresh Access Token)
  .post(
    '/refresh',
    async ({ body }) => {
      const result = await AuthService.refresh(body.refreshToken);
      return {
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      };
    },
    {
      body: t.Object({
        refreshToken: t.String({ error: 'Refresh token is required' }),
      }),
    }
  )

  // 5. Send Reset Password Email
  .post(
    '/forgot-password',
    async ({ body }) => {
      const result = await AuthService.forgotPassword(body.email);
      return {
        success: true,
        message: result.message,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email', error: 'Invalid email address' }),
      }),
    }
  )

  // 6. Reset Password via Token
  .post(
    '/reset-password',
    async ({ body }) => {
      await AuthService.resetPassword(body.token, body.password);
      return {
        success: true,
        message: 'Password reset successful',
      };
    },
    {
      body: t.Object({
        token: t.String({ error: 'Reset token is required' }),
        password: t.String({ minLength: 8, error: 'New password must be at least 8 characters' }),
      }),
    }
  )

  // 7. Redirect to Google Consent Screen
  .get('/google', () => {
    const state = crypto.randomUUID();
    const url = OAuthService.getGoogleAuthUrl(state);
    return Response.redirect(url, 302);
  })

  // 8. Handle Google Callback
  .get(
    '/google/callback',
    async ({ query, headers }) => {
      const { code } = query;
      if (!code) {
        throw new BadRequestError('Authorization code is missing');
      }

      const host = headers['x-forwarded-host'] || headers['host'] || 'localhost:3000';
      const proto = headers['x-forwarded-proto'] || 'http';
      const frontendUrl = (host.includes(':4000') || host === 'api:4000')
        ? env.FRONTEND_URL
        : `${proto}://${host}`;

      try {
        const googleUser = await OAuthService.getGoogleUser(code);

        // Find or register user
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, googleUser.email.toLowerCase()))
          .limit(1);

        let userResult;
        if (existingUser) {
          // Verify status
          if (existingUser.status === 'suspended') {
            return Response.redirect(`${frontendUrl}/login?error=account_suspended`, 302);
          }
          
          // Login
          const result = await AuthService.login({ email: existingUser.email }, true);
          userResult = result;
        } else {
          // Register
          const result = await AuthService.register({
            name: googleUser.name,
            email: googleUser.email,
            oauthProvider: 'google',
            oauthId: googleUser.id,
          });
          userResult = result;
        }

        // Redirect to Frontend callback page with tokens
        return Response.redirect(`${frontendUrl}/auth-callback?token=${userResult.accessToken}&refresh=${userResult.refreshToken}`, 302);
      } catch (err: any) {
        console.error('[Google Callback Error]', err);
        const errMsg = err.message || String(err);
        return Response.redirect(`${frontendUrl}/login?error=oauth_failed&msg=${encodeURIComponent(errMsg)}`, 302);
      }
    },
    {
      query: t.Object({
        code: t.Optional(t.String()),
        state: t.Optional(t.String()),
        error: t.Optional(t.String()),
      }),
    }
  )

  // 9. Redirect to GitHub Consent Screen (Disabled)
  .get('/github', () => {
    throw new BadRequestError('GitHub login is temporarily disabled');
  })

  // 10. Handle GitHub Callback (Disabled)
  .get(
    '/github/callback',
    () => {
      return Response.redirect(`${env.FRONTEND_URL}/login?error=github_disabled`, 302);
    }
  );
