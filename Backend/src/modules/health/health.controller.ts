import type { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { sendSuccess } from '../../shared/utils/response.js';

export const healthController = {
  async check(_req: Request, res: Response): Promise<void> {
    let database = 'up';
    try {
      // Cheapest possible round-trip to confirm the DB is reachable.
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    sendSuccess(
      res,
      {
        status: database === 'up' ? 'healthy' : 'degraded',
        database,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      'ProjectSphere API is running',
    );
  },
};
