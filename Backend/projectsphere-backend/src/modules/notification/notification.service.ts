import { NotificationType } from '@prisma/client';
import { notificationRepository } from './notification.repository.js';
import { cursorMeta, type CursorParams } from '../../shared/utils/pagination.js';

/**
 * Notifications are created from the SERVICE layer of whatever action triggers
 * them (a like, comment, follow…), never from controllers. Creation is
 * best-effort: a failure here must never roll back the underlying action, so
 * callers await these but the methods swallow their own errors.
 */

interface ActorRef {
  id: string;
  name: string; // display name or username of the actor
}

async function safeCreate(data: Parameters<typeof notificationRepository.create>[0]): Promise<void> {
  // Never notify yourself about your own action.
  if (data.actorId && data.actorId === data.recipientId) return;
  try {
    await notificationRepository.create(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to create notification:', err);
  }
}

export const notificationService = {
  async notifyLike(recipientId: string, actor: ActorRef, projectSlug: string, projectTitle: string): Promise<void> {
    await safeCreate({
      recipientId,
      actorId: actor.id,
      type: NotificationType.LIKE,
      message: `${actor.name} liked your project "${projectTitle}"`,
      entityType: 'project',
      entityId: projectSlug,
      link: `/projects/${projectSlug}`,
    });
  },

  async notifyComment(recipientId: string, actor: ActorRef, projectSlug: string, projectTitle: string): Promise<void> {
    await safeCreate({
      recipientId,
      actorId: actor.id,
      type: NotificationType.COMMENT,
      message: `${actor.name} commented on your project "${projectTitle}"`,
      entityType: 'project',
      entityId: projectSlug,
      link: `/projects/${projectSlug}`,
    });
  },

  async notifyReply(recipientId: string, actor: ActorRef, projectSlug: string): Promise<void> {
    await safeCreate({
      recipientId,
      actorId: actor.id,
      type: NotificationType.REPLY,
      message: `${actor.name} replied to your comment`,
      entityType: 'project',
      entityId: projectSlug,
      link: `/projects/${projectSlug}`,
    });
  },

  async notifyFollow(recipientId: string, actor: ActorRef): Promise<void> {
    await safeCreate({
      recipientId,
      actorId: actor.id,
      type: NotificationType.FOLLOW,
      message: `${actor.name} started following you`,
      entityType: 'user',
      entityId: actor.id,
      link: `/users/${actor.name}`,
    });
  },

  async notifyFeatured(recipientId: string, projectSlug: string, projectTitle: string): Promise<void> {
    await safeCreate({
      recipientId,
      actorId: null,
      type: NotificationType.FEATURED,
      message: `Your project "${projectTitle}" was featured! 🎉`,
      entityType: 'project',
      entityId: projectSlug,
      link: `/projects/${projectSlug}`,
    });
  },

  /** List notifications with unread count in meta and light read-time aggregation. */
  async list(recipientId: string, opts: CursorParams & { unreadOnly?: boolean }) {
    const rows = await notificationRepository.listByRecipient(recipientId, opts);
    const { items, meta } = cursorMeta(rows, opts.limit);
    const unreadCount = await notificationRepository.unreadCount(recipientId);
    return {
      notifications: aggregate(items),
      meta: { ...meta, unreadCount },
    };
  },

  markRead(id: string, recipientId: string) {
    return notificationRepository.markRead(id, recipientId);
  },

  markAllRead(recipientId: string) {
    return notificationRepository.markAllRead(recipientId);
  },

  remove(id: string, recipientId: string) {
    return notificationRepository.remove(id, recipientId);
  },

  async getPreferences(userId: string): Promise<Record<string, boolean>> {
    const row = await notificationRepository.getPrefs(userId);
    return (row?.notificationPrefs as Record<string, boolean> | null) ?? {};
  },

  async updatePreferences(userId: string, patch: Record<string, boolean>): Promise<Record<string, boolean>> {
    const current = await this.getPreferences(userId);
    const merged = { ...current, ...patch };
    const row = await notificationRepository.updatePrefs(userId, merged);
    return (row.notificationPrefs as Record<string, boolean>) ?? merged;
  },
};

type NotificationRow = Awaited<ReturnType<typeof notificationRepository.listByRecipient>>[number];

/**
 * Collapse multiple LIKE notifications on the same project within this page into
 * a single "X and N others liked…" entry. Keeps the newest as the representative.
 */
function aggregate(items: NotificationRow[]): unknown[] {
  const likeGroups = new Map<string, NotificationRow[]>();
  const passthrough: NotificationRow[] = [];

  for (const n of items) {
    if (n.type === NotificationType.LIKE && n.entityId) {
      const key = n.entityId;
      (likeGroups.get(key) ?? likeGroups.set(key, []).get(key)!).push(n);
    } else {
      passthrough.push(n);
    }
  }

  const aggregated: Array<NotificationRow & { aggregatedCount?: number }> = [...passthrough];
  for (const group of likeGroups.values()) {
    const [latest, ...rest] = group;
    if (!latest) continue;
    if (rest.length === 0) {
      aggregated.push(latest);
    } else {
      const others = rest.length;
      const actorName = latest.actor?.username ?? 'Someone';
      aggregated.push({
        ...latest,
        message: `${actorName} and ${others} other${others > 1 ? 's' : ''} liked your project`,
        aggregatedCount: group.length,
      });
    }
  }

  // Restore newest-first order after grouping.
  return aggregated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
