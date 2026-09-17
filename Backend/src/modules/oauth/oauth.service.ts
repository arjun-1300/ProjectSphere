import { randomUUID } from 'node:crypto';
import { AuthProvider, Role } from '@prisma/client';
import { env, googleOAuthEnabled, githubOAuthEnabled } from '../../config/env.js';
import { authRepository } from '../auth/auth.repository.js';
import { nanoid } from 'nanoid';
import { BadRequestError } from '../../shared/errors/AppError.js';
import { ErrorCode } from '../../shared/errors/errorCodes.js';

/**
 * OAuth 2.0 authorization-code flow implemented directly against the providers'
 * REST endpoints (no Passport). The flow, in both cases:
 *   1. Redirect the user to the provider's consent screen (buildXAuthUrl).
 *   2. Provider redirects back with ?code=...  (+ our anti-CSRF state).
 *   3. We exchange the code for an access token (server-to-server).
 *   4. We call the provider's userinfo endpoint to get profile + email.
 *   5. We find-or-create/link a local account (upsertOAuthUser).
 */

interface NormalizedProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

// --------------------------- URL builders ---------------------------

export function buildGoogleAuthUrl(state: string): string {
  if (!googleOAuthEnabled) {
    throw new BadRequestError('Google login is not configured', ErrorCode.OAUTH_DISABLED);
  }
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function buildGithubAuthUrl(state: string): string {
  if (!githubOAuthEnabled) {
    throw new BadRequestError('GitHub login is not configured', ErrorCode.OAUTH_DISABLED);
  }
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

// --------------------------- Google callback ---------------------------

async function fetchGoogleProfile(code: string): Promise<NormalizedProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    throw new BadRequestError('Failed to exchange Google authorization code', ErrorCode.OAUTH_ERROR);
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new BadRequestError('Google did not return an access token', ErrorCode.OAUTH_ERROR);
  }

  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!infoRes.ok) {
    throw new BadRequestError('Failed to fetch Google profile', ErrorCode.OAUTH_ERROR);
  }
  const info = (await infoRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!info.email) {
    throw new BadRequestError('Google account has no email', ErrorCode.OAUTH_ERROR);
  }

  return {
    provider: 'google',
    providerId: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: Boolean(info.email_verified),
    name: info.name,
    avatarUrl: info.picture,
  };
}

// --------------------------- GitHub callback ---------------------------

async function fetchGithubProfile(code: string): Promise<NormalizedProfile> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code,
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    }),
  });
  if (!tokenRes.ok) {
    throw new BadRequestError('Failed to exchange GitHub authorization code', ErrorCode.OAUTH_ERROR);
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new BadRequestError('GitHub did not return an access token', ErrorCode.OAUTH_ERROR);
  }

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ProjectSphere',
  };

  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) {
    throw new BadRequestError('Failed to fetch GitHub profile', ErrorCode.OAUTH_ERROR);
  }
  const user = (await userRes.json()) as {
    id: number;
    login: string;
    name?: string;
    avatar_url?: string;
    email?: string;
  };

  // GitHub often hides the primary email on /user; fetch verified emails.
  let email = user.email?.toLowerCase();
  let emailVerified = false;
  const emailRes = await fetch('https://api.github.com/user/emails', { headers });
  if (emailRes.ok) {
    const emails = (await emailRes.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
    if (primary) {
      email = primary.email.toLowerCase();
      emailVerified = primary.verified;
    }
  }
  if (!email) {
    throw new BadRequestError('GitHub account has no accessible email', ErrorCode.OAUTH_ERROR);
  }

  return {
    provider: 'github',
    providerId: String(user.id),
    email,
    emailVerified,
    name: user.name ?? user.login,
    avatarUrl: user.avatar_url,
  };
}

// --------------------------- Account linking ---------------------------

/** Derive a unique, valid username from an email/name seed. */
async function generateUniqueUsername(seed: string): Promise<string> {
  const base =
    seed
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20) || 'user';
  let candidate = base.length >= 3 ? base : `${base}_dev`;

  // Try the base, then append short random suffixes until unique.
  for (let i = 0; i < 5; i++) {
    const existing = await authRepository.findByUsername(candidate);
    if (!existing) return candidate;
    candidate = `${base}_${nanoid(5).toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
  }
  return `${base}_${nanoid(8).toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
}

/**
 * Find-or-create/link a user for an OAuth profile.
 * Linking policy: if an account with the same email exists, we link the OAuth
 * identity to it ONLY when the provider reports the email as verified — this
 * prevents an attacker from hijacking an account via an unverified provider email.
 */
async function upsertOAuthUser(profile: NormalizedProfile) {
  // 1) Already linked by provider id → straight login.
  const byProvider = await authRepository.findByProviderId(profile.provider, profile.providerId);
  if (byProvider) return byProvider;

  // 2) Existing account with same email → link if provider email is verified.
  const byEmail = await authRepository.findByEmail(profile.email);
  if (byEmail) {
    if (!profile.emailVerified) {
      throw new BadRequestError(
        'An account with this email already exists. Log in with your password first, then link this provider.',
        ErrorCode.CONFLICT,
      );
    }
    const linkField =
      profile.provider === 'google' ? { googleId: profile.providerId } : { githubId: profile.providerId };
    const updated = await authRepository.updateUser(byEmail.id, {
      ...linkField,
      isEmailVerified: true,
    });
    return { ...byEmail, ...updated };
  }

  // 3) Brand new user.
  const username = await generateUniqueUsername(profile.name ?? profile.email);
  return authRepository.createWithProfile({
    email: profile.email,
    username,
    passwordHash: null,
    role: Role.DEVELOPER,
    authProvider: profile.provider === 'google' ? AuthProvider.GOOGLE : AuthProvider.GITHUB,
    ...(profile.provider === 'google'
      ? { googleId: profile.providerId }
      : { githubId: profile.providerId }),
    isEmailVerified: true, // provider-verified email
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  });
}

export const oauthService = {
  buildGoogleAuthUrl,
  buildGithubAuthUrl,
  newState: () => randomUUID(),

  async completeGoogle(code: string) {
    const profile = await fetchGoogleProfile(code);
    return upsertOAuthUser(profile);
  },

  async completeGithub(code: string) {
    const profile = await fetchGithubProfile(code);
    return upsertOAuthUser(profile);
  },
};
