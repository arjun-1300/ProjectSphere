import type { Request, Response } from 'express';
import { discoveryService } from './discovery.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import type { SearchQueryInput, FeedQuery, CursorFeedQuery } from './discovery.schema.js';

export const discoveryController = {
  async search(req: Request, res: Response): Promise<void> {
    const input = req.query as unknown as SearchQueryInput;
    const result = await discoveryService.search(input, req.user?.sub);
    sendSuccess(res, { projects: result.projects }, 'Search results', 200, result.meta);
  },

  async autocomplete(req: Request, res: Response): Promise<void> {
    const { q } = req.query as unknown as { q: string };
    const suggestions = await discoveryService.autocomplete(q);
    sendSuccess(res, { suggestions }, 'Autocomplete suggestions');
  },

  async trending(req: Request, res: Response): Promise<void> {
    const { page, pageSize } = req.query as unknown as FeedQuery;
    const result = await discoveryService.trending(page, pageSize);
    sendSuccess(res, { projects: result.projects }, 'Trending projects', 200, result.meta);
  },

  async featured(req: Request, res: Response): Promise<void> {
    const { page, pageSize } = req.query as unknown as FeedQuery;
    const result = await discoveryService.featured(page, pageSize);
    sendSuccess(res, { projects: result.projects }, 'Featured projects', 200, result.meta);
  },

  async newest(req: Request, res: Response): Promise<void> {
    const { cursor, limit } = req.query as unknown as CursorFeedQuery;
    const result = await discoveryService.newest({ cursor, limit });
    sendSuccess(res, { projects: result.projects }, 'Newest projects', 200, result.meta);
  },

  async recommended(req: Request, res: Response): Promise<void> {
    const { limit } = req.query as unknown as CursorFeedQuery;
    const result = await discoveryService.recommended(req.user?.sub, limit);
    sendSuccess(res, { projects: result.projects }, 'Recommended for you');
  },

  async popularSearches(_req: Request, res: Response): Promise<void> {
    const searches = await discoveryService.popularSearches(10);
    sendSuccess(res, { searches }, 'Popular searches');
  },

  async recentSearches(req: Request, res: Response): Promise<void> {
    const searches = await discoveryService.recentSearches(req.user!.sub, 10);
    sendSuccess(res, { searches }, 'Recent searches');
  },
};
