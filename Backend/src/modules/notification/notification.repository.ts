import { prisma } from '../../config/prisma.js';
import type { NotificationType } from '@prisma/client';
import { cursorArgs, type CursorParams } from '../../shared/utils/pagination.js';

export const notificationRepository = {
  create(data: {
    recipientId: string;
    actorId?: string | null;
    type: NotificationType;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    link?: string | null;
  }) {
    return prisma.notification.create({ data });
  },

  listByRecipient(recipientId: string, opts: CursorParams & { unreadOnly?: boolean }) {
    return prisma.notification.findMany({
      where: { recipientId, ...(opts.unreadOnly ? { isRead: false } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        actor: {
          select: { id: true, username: true, profile: { select: { name: true, avatarUrl: true } } },
        },
      },
      ...cursorArgs(opts),
    });
  },

  unreadCount(recipientId: string) {
    return prisma.notification.count({ where: { recipientId, isRead: false } });
  },

  markRead(id: string, recipientId: string) {
    // updateMany scoped by recipient so users can only touch their own rows.
    return prisma.notification.updateMany({
      where: { id, recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  markAllRead(recipientId: string) {
    return prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  remove(id: string, recipientId: string) {
    return prisma.notification.deleteMany({ where: { id, recipientId } });
  },

  getPrefs(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
  },

  updatePrefs(userId: string, prefs: Record<string, boolean>) {
    return prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: prefs },
      select: { notificationPrefs: true },
    });
  },
};
