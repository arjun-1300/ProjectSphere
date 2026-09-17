import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';

export const profileRepository = {
  findByUsername(username: string) {
    return prisma.user.findFirst({
      where: { username, deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });
  },

  findByUserId(userId: string) {
    return prisma.profile.findUnique({ where: { userId } });
  },

  update(userId: string, data: Prisma.ProfileUpdateInput) {
    return prisma.profile.update({ where: { userId }, data });
  },

  setCompletion(userId: string, percentage: number) {
    return prisma.profile.update({ where: { userId }, data: { completionPercentage: percentage } });
  },

  incrementViews(userId: string) {
    return prisma.profile.update({
      where: { userId },
      data: { profileViews: { increment: 1 } },
      select: { profileViews: true },
    });
  },

  updateMedia(userId: string, data: Prisma.ProfileUpdateInput) {
    return prisma.profile.update({ where: { userId }, data });
  },

  // Counts shown on a profile.
  projectCount(userId: string, onlyPublished = true) {
    return prisma.project.count({
      where: { authorId: userId, deletedAt: null, ...(onlyPublished ? { status: 'PUBLISHED' } : {}) },
    });
  },

  /** Soft-delete the account. Cascades (likes, follows, etc.) are handled by FK rules. */
  softDeleteAccount(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  },
};
