import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../shared/errors/AppError.js';

/** Catches any request that didn't match a route and forwards a 404. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}
