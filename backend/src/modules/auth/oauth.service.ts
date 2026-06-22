import { env } from '../../config/env';
import { BadRequestError } from '../../lib/errors';

export class OAuthService {
  // Google OAuth URL generator
  static getGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Get Google User details using auth code
  static async getGoogleUser(code: string) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new BadRequestError('Google OAuth is not configured on the server');
    }

    // Exchange code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[Google OAuth] Token Exchange failed:', err);
      throw new BadRequestError('Failed to exchange Google authorization code');
    }

    const tokens = await tokenRes.json();

    // Fetch user info
    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      throw new BadRequestError('Failed to fetch Google user info');
    }

    const profile = await userRes.json();
    return {
      id: profile.sub,
      name: profile.name || profile.given_name || 'Google User',
      email: profile.email,
      avatarUrl: profile.picture || null,
    };
  }

  // GitHub OAuth URL generator
  static getGithubAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_REDIRECT_URI,
      scope: 'user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // Get GitHub User details using auth code
  static async getGithubUser(code: string) {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      throw new BadRequestError('GitHub OAuth is not configured on the server');
    }

    // Exchange code for token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        redirect_uri: env.GITHUB_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[GitHub OAuth] Token Exchange failed:', err);
      throw new BadRequestError('Failed to exchange GitHub authorization code');
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      throw new BadRequestError('GitHub OAuth failed: access token not found in response');
    }

    // Fetch user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'AIphy-Backend',
      },
    });

    if (!userRes.ok) {
      throw new BadRequestError('Failed to fetch GitHub user profile');
    }

    const profile = await userRes.json();

    // Fetch email if private/null
    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'AIphy-Backend',
        },
      });

      if (emailsRes.ok) {
        const emailsList = await emailsRes.json();
        const primaryEmail = emailsList.find((e: any) => e.primary) || emailsList[0];
        email = primaryEmail?.email;
      }
    }

    if (!email) {
      throw new BadRequestError('GitHub account does not have a public or primary email address');
    }

    return {
      id: String(profile.id),
      name: profile.name || profile.login || 'GitHub User',
      email,
      avatarUrl: profile.avatar_url || null,
    };
  }
}
