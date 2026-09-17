import type { Request, Response } from 'express';
import { analyticsService } from './analytics.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import type { AnalyticsRange } from './analytics.schema.js';

function viewerKey(req: Request): string {
  return req.user?.sub ?? req.ip ?? 'anonymous';
}

export const analyticsController = {
  async track(req: Request, res: Response): Promise<void> {
    const result = await analyticsService.track(req.body, viewerKey(req), req.user?.sub);
    sendSuccess(res, result, result.counted ? 'Event tracked' : 'Event already counted today');
  },

  async projectAnalytics(req: Request, res: Response): Promise<void> {
    const range = req.query as unknown as AnalyticsRange;
    const data = await analyticsService.projectAnalytics(req.user!.sub, req.params.slug, range);
    sendSuccess(res, data, 'Project analytics');
  },

  async dashboard(req: Request, res: Response): Promise<void> {
    const data = await analyticsService.dashboard(req.user!.sub);
    sendSuccess(res, data, 'Dashboard analytics');
  },
};
