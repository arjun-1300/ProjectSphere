import { prisma } from '../../config/prisma.js';
import type { AuthProvider, EmailTokenType, Role } from '@prisma/client';

/**
 * Data-access layer for the auth module. Keeps Prisma calls out of the service
 * so business logic reads cleanly and the persistence layer can be swapped or
 * mocked in tests.
 */
export const authRepository = {
  // ---- Users ----
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { profile: true } });
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { profile: true },
    });
  },

  findByProviderId(provider: 'google' | 'github', providerId: string) {
    const where = provider === 'google' ? { googleId: providerId } : { githubId: providerId };
    return prisma.user.findFirst({ where, include: { profile: true } });
  },

  /** Create a user together with an empty profile in one transaction. */
  createWithProfile(data: {
    email: string;
    username: string;
    passwordHash?: string | null;
    role?: Role;
    authProvider?: AuthProvider;
    googleId?: string;
    githubId?: string;
    isEmailVerified?: boolean;
    name?: string;
    avatarUrl?: string;
  }) {
    const { name, avatarUrl, ...userData } = data;
    return prisma.user.create({
      data: {
        ...userData,
        profile: {
          create: {
            name: name ?? null,
            avatarUrl: avatarUrl ?? null,
          },
        },
      },
      include: { profile: true },
    });
  },

  updateUser(id: string, data: Record<string, unknown>) {
    return prisma.user.update({ where: { id }, data });
  },

  // ---- Refresh tokens ----
  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: string, replacedBy?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedBy: replacedBy ?? null },
    });
  },

  /** Revoke every non-revoked token in a family (theft/reuse response). */
  revokeFamily(familyId: string) {
    return prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** Revoke ALL active refresh tokens for a user (e.g. after password reset). */
  revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  // ---- Email / reset tokens ----
  createEmailToken(data: {
    userId: string;
    tokenHash: string;
    type: EmailTokenType;
    expiresAt: Date;
  }) {
    return prisma.emailToken.create({ data });
  },

  findEmailToken(tokenHash: string, type: EmailTokenType) {
    return prisma.emailToken.findFirst({
      where: { tokenHash, type, consumedAt: null },
      include: { user: true },
    });
  },

  consumeEmailToken(id: string) {
    return prisma.emailToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  },

  /** Invalidate any outstanding tokens of a type for a user (e.g. before resend). */
  invalidateEmailTokens(userId: string, type: EmailTokenType) {
    return prisma.emailToken.updateMany({
      where: { userId, type, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  },
};
