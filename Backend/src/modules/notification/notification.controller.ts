import type { Request, Response } from 'express';
import { notificationService } from './notification.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import type { NotificationListQuery } from './notification.schema.js';

export const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as NotificationListQuery;
    const result = await notificationService.list(req.user!.sub, {
      cursor: q.cursor,
      limit: q.limit,
      unreadOnly: q.unreadOnly,
    });
    sendSuccess(res, { notifications: result.notifications }, 'Notifications', 200, result.meta);
  },

  async markRead(req: Request, res: Response): Promise<void> {
    await notificationService.markRead(req.params.id, req.user!.sub);
    sendSuccess(res, null, 'Notification marked as read');
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    const result = await notificationService.markAllRead(req.user!.sub);
    sendSuccess(res, { updated: result.count }, 'All notifications marked as read');
  },

  async remove(req: Request, res: Response): Promise<void> {
    await notificationService.remove(req.params.id, req.user!.sub);
    sendSuccess(res, null, 'Notification deleted');
  },

  async getPreferences(req: Request, res: Response): Promise<void> {
    const prefs = await notificationService.getPreferences(req.user!.sub);
    sendSuccess(res, { preferences: prefs }, 'Notification preferences');
  },

  async updatePreferences(req: Request, res: Response): Promise<void> {
    const prefs = await notificationService.updatePreferences(req.user!.sub, req.body);
    sendSuccess(res, { preferences: prefs }, 'Preferences updated');
  },
};
