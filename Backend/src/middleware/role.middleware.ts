import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/AppError.js';

/**
 * Restricts a route to one or more roles. Must run AFTER `authenticate`,
 * which populates req.user.
 *
 *   router.get('/admin', authenticate, authorize('ADMIN'), handler)
 */
export function authorize(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!allowed.includes(req.user.role)) {
      throw new ForbiddenError(
        `This action requires one of the following roles: ${allowed.join(', ')}`,
      );
    }
    next();
  };
}
