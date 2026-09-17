import type { Request, Response, NextFunction } from 'express';
import { FilterXSS } from 'xss';

/**
 * Strips HTML tags / scripts from incoming string values (a maintained
 * replacement for the deprecated `xss-clean`). Tags are removed rather than
 * escaped so stored text stays clean; script bodies are dropped entirely.
 *
 * Applied to req.body only — query/params are already coerced and constrained
 * by Zod schemas at each route.
 */
const filter = new FilterXSS({
  whiteList: {}, // allow no HTML tags
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
});

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') return filter.process(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) obj[key] = sanitize(obj[key]);
    return obj;
  }
  return value;
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  next();
}
