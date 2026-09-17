import { randomUUID } from 'node:crypto';
import { AuthProvider, EmailTokenType, Role } from '@prisma/client';
import { env } from '../../config/env.js';
import { authRepository } from './auth.repository.js';
import { emailService } from '../email/email.service.js';
import { hashPassword, verifyPassword } from '../../shared/utils/password.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import { generateRawToken, hashToken, generateNumericCode } from '../../shared/utils/tokens.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../shared/errors/AppError.js';
import { ErrorCode } from '../../shared/errors/errorCodes.js';
import type { RegisterInput } from './auth.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_TTL_MS = 15 * 60 * 1000; // 15 min
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Context captured at login/refresh for auditing the session. */
export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  isEmailVerified: boolean;
  authProvider: AuthProvider;
  name: string | null;
  avatarUrl: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPublicUser(user: {
  id: string;
  email: string;
  username: string;
  role: Role;
  isEmailVerified: boolean;
  authProvider: AuthProvider;
  profile?: { name: string | null; avatarUrl: string | null } | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    authProvider: user.authProvider,
    name: user.profile?.name ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

const clientBaseUrl = env.CLIENT_ORIGINS[0] ?? 'http://localhost:5173';

/**
 * Issue a fresh access + refresh token pair, starting a NEW token family.
 * The raw refresh token is returned to the caller; only its hash is persisted.
 */
async function issueTokenPair(
  user: { id: string; role: Role; email: string },
  ctx: SessionContext,
  rememberMe: boolean,
): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });

  const rawRefresh = generateRawToken();
  const familyId = randomUUID();
  const days = rememberMe ? env.JWT_REFRESH_REMEMBER_DAYS : env.JWT_REFRESH_EXPIRES_DAYS;
  const expiresAt = new Date(Date.now() + days * DAY_MS);

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(rawRefresh),
    familyId,
    expiresAt,
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  });

  return { accessToken, refreshToken: rawRefresh, refreshTokenExpiresAt: expiresAt };
}

/** Create + email a verification token for a user. */
async function dispatchVerification(user: { id: string; email: string }, name: string): Promise<void> {
  await authRepository.invalidateEmailTokens(user.id, EmailTokenType.EMAIL_VERIFICATION);

  const rawToken = generateRawToken(24);
  const code = generateNumericCode(6);
  // The link carries the opaque token; the code is a fallback for manual entry.
  // We store the token hash; the 6-digit code is embedded in the same token
  // record's lookup by storing hash(token). For code-based verification we hash
  // a composite of email+code so both paths resolve to a stored EmailToken.
  await authRepository.createEmailToken({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    type: EmailTokenType.EMAIL_VERIFICATION,
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  });
  await authRepository.createEmailToken({
    userId: user.id,
    tokenHash: hashToken(`${user.email}:${code}`),
    type: EmailTokenType.EMAIL_VERIFICATION,
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  });

  const verifyUrl = `${clientBaseUrl}/verify-email?token=${rawToken}`;
  await emailService.sendVerification(user.email, name, verifyUrl, code);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const authService = {
  /** Register a local account, create an empty profile, send verification email. */
  async register(input: RegisterInput): Promise<PublicUser> {
    const existingEmail = await authRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('An account with this email already exists', ErrorCode.EMAIL_TAKEN);
    }
    const existingUsername = await authRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new ConflictError('This username is already taken', ErrorCode.USERNAME_TAKEN);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createWithProfile({
      email: input.email,
      username: input.username,
      passwordHash,
      role: Role.DEVELOPER,
      authProvider: AuthProvider.LOCAL,
      name: input.name,
    });

    await dispatchVerification(user, input.name ?? input.username);
    return toPublicUser(user);
  },

  /** Authenticate a local account and issue tokens. */
  async login(
    email: string,
    password: string,
    rememberMe: boolean,
    ctx: SessionContext,
  ): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const user = await authRepository.findByEmail(email);
    // Generic message avoids leaking which accounts exist.
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }
    if (user.isBanned) {
      throw new UnauthorizedError('This account has been suspended', ErrorCode.ACCOUNT_BANNED);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }
    if (!user.isEmailVerified) {
      throw new UnauthorizedError(
        'Please verify your email before logging in',
        ErrorCode.EMAIL_NOT_VERIFIED,
      );
    }

    const tokens = await issueTokenPair(user, ctx, rememberMe);
    return { user: toPublicUser(user), tokens };
  },

  /**
   * Rotate a refresh token.
   *
   * Security model:
   *  - Unknown token  → reject (invalid).
   *  - Expired token  → reject.
   *  - Already-revoked token presented again → REUSE. This means a stolen token
   *    was replayed, so we revoke the entire family and force re-login.
   *  - Valid token    → revoke it, mint a new one in the SAME family, return it.
   */
  async refresh(rawToken: string, ctx: SessionContext): Promise<TokenPair> {
    if (!rawToken) {
      throw new UnauthorizedError('Refresh token required', ErrorCode.TOKEN_INVALID);
    }
    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));
    if (!stored) {
      throw new UnauthorizedError('Invalid refresh token', ErrorCode.TOKEN_INVALID);
    }

    if (stored.revokedAt) {
      // Reuse of a revoked token → treat the whole family as compromised.
      await authRepository.revokeFamily(stored.familyId);
      throw new UnauthorizedError(
        'Refresh token reuse detected. Please log in again.',
        ErrorCode.TOKEN_INVALID,
      );
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Refresh token expired', ErrorCode.TOKEN_EXPIRED);
    }

    const user = await authRepository.findById(stored.userId);
    if (!user || user.isBanned) {
      throw new UnauthorizedError('Account unavailable', ErrorCode.UNAUTHORIZED);
    }

    // Rotate: mint a new token in the same family, then revoke the old one
    // pointing to its replacement.
    const rawRefresh = generateRawToken();
    const remainingMs = stored.expiresAt.getTime() - Date.now();
    const newExpiry = new Date(Date.now() + remainingMs); // preserve original session lifetime

    const newToken = await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(rawRefresh),
      familyId: stored.familyId,
      expiresAt: newExpiry,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    });
    await authRepository.revokeRefreshToken(stored.id, newToken.id);

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    return { accessToken, refreshToken: rawRefresh, refreshTokenExpiresAt: newExpiry };
  },

  /** Revoke a single refresh token (logout of one session). */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return; // idempotent: nothing to revoke
    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));
    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  },

  /** Verify an email via opaque token OR email + 6-digit code. */
  async verifyEmail(params: { token?: string; email?: string; code?: string }): Promise<void> {
    const lookupHash = params.token
      ? hashToken(params.token)
      : hashToken(`${params.email}:${params.code}`);

    const record = await authRepository.findEmailToken(lookupHash, EmailTokenType.EMAIL_VERIFICATION);
    if (!record) {
      throw new BadRequestError('Invalid or already-used verification link', ErrorCode.TOKEN_INVALID);
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestError('Verification link expired', ErrorCode.TOKEN_EXPIRED);
    }

    if (!record.user.isEmailVerified) {
      await authRepository.updateUser(record.userId, { isEmailVerified: true });
      await authRepository.invalidateEmailTokens(record.userId, EmailTokenType.EMAIL_VERIFICATION);
      await emailService.sendWelcome(record.user.email, record.user.username);
    } else {
      await authRepository.consumeEmailToken(record.id);
    }
  },

  /** Resend a verification email (rate limited at the route). */
  async resendVerification(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    // Don't reveal whether the email exists; silently no-op otherwise.
    if (!user || user.isEmailVerified) return;
    await dispatchVerification(user, user.profile?.name ?? user.username);
  },

  /** Begin password reset. Always resolves (no account enumeration). */
  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);
    if (!user || !user.passwordHash) return; // OAuth-only or missing → no-op

    await authRepository.invalidateEmailTokens(user.id, EmailTokenType.PASSWORD_RESET);
    const rawToken = generateRawToken();
    await authRepository.createEmailToken({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      type: EmailTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });

    const resetUrl = `${clientBaseUrl}/reset-password?token=${rawToken}`;
    await emailService.sendPasswordReset(user.email, user.profile?.name ?? user.username, resetUrl);
  },

  /** Complete password reset and revoke all existing sessions. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await authRepository.findEmailToken(hashToken(token), EmailTokenType.PASSWORD_RESET);
    if (!record) {
      throw new BadRequestError('Invalid or already-used reset link', ErrorCode.TOKEN_INVALID);
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestError('Reset link expired', ErrorCode.TOKEN_EXPIRED);
    }

    const passwordHash = await hashPassword(newPassword);
    await authRepository.updateUser(record.userId, { passwordHash });
    await authRepository.consumeEmailToken(record.id);
    // A password reset should log the user out everywhere: revoke all sessions.
    await authRepository.revokeAllUserRefreshTokens(record.userId);
  },

  /**
   * Issue a token pair for an already-authenticated user (used by the OAuth
   * flow, which validates identity via the provider rather than a password).
   */
  async issueSession(
    user: { id: string; role: Role; email: string },
    ctx: SessionContext,
  ): Promise<TokenPair> {
    return issueTokenPair(user, ctx, false);
  },

  /** Fetch the authenticated user's public profile (for GET /auth/me later). */
  async getById(id: string): Promise<PublicUser> {
    const user = await authRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return toPublicUser(user);
  },
};
