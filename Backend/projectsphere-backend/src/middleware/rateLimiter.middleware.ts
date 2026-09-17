import type { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../shared/errors/AppError.js';

/**
 * Minimal fixed-window rate limiter kept in process memory.
 *
 * This is intentionally simple for Phase 1 — it protects sensitive endpoints
 * (login, resend verification, forgot password) from trivial abuse in a single
 * instance. Phase 3 replaces this with express-rate-limit backed by Redis so
 * limits are shared across instances.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Derive the key to bucket on. Defaults to client IP. */
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyGenerator, message } = options;
  const store = new Map<string, Bucket>();

  // Periodically sweep expired buckets so the map doesn't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(key);
    }
  }, windowMs);
  // Don't keep the event loop alive just for the sweeper.
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator ? keyGenerator(req) : req.ip ?? 'unknown';
    const now = Date.now();
    const bucket = store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      setHeaders(res, max, max - 1, now + windowMs);
      next();
      return;
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    setHeaders(res, max, remaining, bucket.resetAt);

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      throw new TooManyRequestsError(
        message ?? `Too many requests. Try again in ${retryAfter}s.`,
      );
    }

    next();
  };
}

function setHeaders(res: Response, limit: number, remaining: number, resetAt: number): void {
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
}
