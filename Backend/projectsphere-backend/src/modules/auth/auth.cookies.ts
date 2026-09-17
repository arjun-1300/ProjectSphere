import type { Request, Response } from 'express';
import { env, isProd } from '../../config/env.js';
import type { TokenPair } from './auth.service.js';

export const REFRESH_COOKIE = 'ps_refresh';

/** Read the refresh token from the httpOnly cookie, falling back to the body. */
export function getRefreshToken(req: Request): string | undefined {
  return (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? req.body?.refreshToken;
}

/** Set the refresh token as an httpOnly cookie scoped to the auth routes. */
export function setRefreshCookie(res: Response, tokens: TokenPair): void {
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    // cross-site cookie in prod (frontend on a different domain) requires 'none'.
    sameSite: isProd ? 'none' : 'lax',
    path: `${env.API_PREFIX}/auth`,
    expires: tokens.refreshTokenExpiresAt,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: `${env.API_PREFIX}/auth` });
}
