import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Assigns a unique id to every request (honoring an inbound X-Request-Id if a
 * proxy already set one), exposes it on req.id and echoes it back in the
 * response header. This id is included in logs so a single request can be
 * traced end-to-end.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 100 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
