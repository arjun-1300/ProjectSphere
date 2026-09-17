import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so that any rejected promise is forwarded to
 * Express's error middleware via next(err). Without this, an async throw would
 * become an unhandled rejection instead of a clean 4xx/5xx response.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
