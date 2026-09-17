import type { AccessTokenPayload } from '../utils/jwt.js';

/**
 * Augment Express's Request so `req.id` (per-request UUID) and `req.user`
 * (set by the auth middleware) are strongly typed across the codebase.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      user?: AccessTokenPayload;
    }
  }
}

export {};
