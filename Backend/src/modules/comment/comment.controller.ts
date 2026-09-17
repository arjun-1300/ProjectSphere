import type { Request, Response } from 'express';
import { commentService } from './comment.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { HttpStatus } from '../../shared/errors/errorCodes.js';
import type { CommentListQuery } from './comment.schema.js';

export const commentController = {
  async add(req: Request, res: Response): Promise<void> {
    const comment = await commentService.addComment(req.user!.sub, req.params.slug, req.body.content);
    sendSuccess(res, { comment }, 'Comment added', HttpStatus.CREATED);
  },

  async list(req: Request, res: Response): Promise<void> {
    const { cursor, limit } = req.query as unknown as CommentListQuery;
    const result = await commentService.list(req.params.slug, { cursor, limit });
    sendSuccess(res, { comments: result.comments }, 'Comments', 200, result.meta);
  },

  async reply(req: Request, res: Response): Promise<void> {
    const reply = await commentService.addReply(req.user!.sub, req.params.id, req.body.content);
    sendSuccess(res, { reply }, 'Reply added', HttpStatus.CREATED);
  },

  async edit(req: Request, res: Response): Promise<void> {
    const comment = await commentService.edit(req.user!.sub, req.params.id, req.body.content);
    sendSuccess(res, { comment }, 'Comment updated');
  },

  async remove(req: Request, res: Response): Promise<void> {
    await commentService.remove(req.user!.sub, req.user!.role, req.params.id);
    sendSuccess(res, null, 'Comment deleted');
  },
};
