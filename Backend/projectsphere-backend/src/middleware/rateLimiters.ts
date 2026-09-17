import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { sendError } from '../shared/utils/response.js';
import { HttpStatus, ErrorCode } from '../shared/errors/errorCodes.js';
import { env } from '../config/env.js';

/** Shared 429 handler so rate-limit responses use our standard envelope. */
function limitHandler(message: string) {
  return (_req: Request, res: Response): void => {
    sendError(res, message, HttpStatus.TOO_MANY_REQUESTS, { code: ErrorCode.RATE_LIMITED });
  };
}

const base: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // We manage trust proxy ourselves in app.ts; disable the library's check.
  validate: { trustProxy: false },
};

/** Global limiter: 100 requests / 15 min per IP. */
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  handler: limitHandler('Too many requests. Please slow down and try again shortly.'),
});

/** Auth limiter: 5 requests / 15 min per IP for sensitive auth endpoints. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  handler: limitHandler('Too many attempts. Please wait 15 minutes and try again.'),
});

/** AI limiter: N calls / hour per authenticated user (falls back to IP). */
export const aiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: env.AI_RATE_LIMIT_PER_HOUR,
  keyGenerator: (req: Request) =>
    req.user?.sub ? `user:${req.user.sub}` : `ip:${ipKeyGenerator(req.ip ?? '')}`,
  handler: limitHandler(
    `You've reached the AI usage limit (${env.AI_RATE_LIMIT_PER_HOUR}/hour). Please try again later.`,
  ),
});
