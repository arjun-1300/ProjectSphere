import type { Request, Response } from 'express';
import { socialService } from './social.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export const socialController = {
  async toggleLike(req: Request, res: Response): Promise<void> {
    const result = await socialService.toggleLike(req.user!.sub, req.params.slug);
    sendSuccess(res, result, result.liked ? 'Project liked' : 'Like removed');
  },

  async toggleBookmark(req: Request, res: Response): Promise<void> {
    const result = await socialService.toggleBookmark(req.user!.sub, req.params.slug);
    sendSuccess(res, result, result.bookmarked ? 'Project bookmarked' : 'Bookmark removed');
  },

  async toggleFollow(req: Request, res: Response): Promise<void> {
    const result = await socialService.toggleFollow(req.user!.sub, req.params.username);
    sendSuccess(res, result, result.following ? 'Now following' : 'Unfollowed');
  },

  async followers(req: Request, res: Response): Promise<void> {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await socialService.listFollowers(req.params.username, { cursor, limit });
    sendSuccess(res, { followers: result.followers }, 'Followers', 200, result.meta);
  },

  async following(req: Request, res: Response): Promise<void> {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await socialService.listFollowing(req.params.username, { cursor, limit });
    sendSuccess(res, { following: result.following }, 'Following', 200, result.meta);
  },
};
