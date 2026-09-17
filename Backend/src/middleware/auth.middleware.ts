import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../shared/utils/jwt.js';
import { UnauthorizedError } from '../shared/errors/AppError.js';

/** Extract a Bearer token from the Authorization header, if present. */
function extractBearer(req: Request): string | null {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Requires a valid access token. Attaches the decoded payload to req.user or
 * throws 401. Use on any route that must know who the caller is.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }
  req.user = verifyAccessToken(token); // throws UnauthorizedError if invalid/expired
  next();
}

/**
 * Attaches req.user IF a valid token is present, but never rejects. Useful for
 * endpoints whose response is richer when logged in (e.g. "isLiked") but that
 * anonymous users can still reach.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}
