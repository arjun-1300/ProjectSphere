import type { Request, Response } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import type { ProjectListQuery } from '../project/project.schema.js';

export const usersController = {
  async getProjects(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as ProjectListQuery;
    const result = await usersService.getUserProjects(req.params.username, req.user?.sub, {
      cursor: q.cursor,
      limit: q.limit,
      status: q.status,
    });
    sendSuccess(res, { projects: result.items }, 'User projects', 200, result.meta);
  },
};
