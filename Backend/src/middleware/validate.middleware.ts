import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { HttpStatus } from '../shared/errors/errorCodes.js';
import { sendError } from '../shared/utils/response.js';
import { formatZodError } from './error.middleware.js';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and COERCES request parts against Zod schemas. On success the
 * parsed (typed, defaulted) values replace the originals so controllers work
 * with clean data. On failure it returns a 422 with per-field messages.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        // req.query is a read-only getter in Express 5-style typings; assign via defineProperty-safe cast.
        Object.assign(req.query, schemas.query.parse(req.query));
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        sendError(res, 'Validation failed', HttpStatus.UNPROCESSABLE, formatZodError(err));
        return;
      }
      next(err);
    }
  };
}
