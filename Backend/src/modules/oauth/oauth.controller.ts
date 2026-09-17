import type { Request, Response } from 'express';
import { oauthService } from './oauth.service.js';
import { authService } from '../auth/auth.service.js';
import { setRefreshCookie } from '../auth/auth.cookies.js';
import { env, isProd } from '../../config/env.js';

const STATE_COOKIE = 'ps_oauth_state';

/** Set a short-lived, httpOnly cookie holding the anti-CSRF state value. */
function setStateCookie(res: Response, state: string): void {
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax', // must survive the top-level redirect back from the provider
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: env.API_PREFIX,
  });
}

/** Validate the state returned by the provider against our cookie. */
function verifyState(req: Request, res: Response): boolean {
  const cookieState = req.cookies?.[STATE_COOKIE];
  const queryState = req.query.state;
  res.clearCookie(STATE_COOKIE, { path: env.API_PREFIX });
  return Boolean(cookieState && queryState && cookieState === queryState);
}

function sessionContext(req: Request) {
  return { userAgent: req.header('user-agent'), ipAddress: req.ip };
}

/** Redirect back to the frontend with the access token (or an error). */
function redirectSuccess(res: Response, accessToken: string): void {
  const url = new URL(env.OAUTH_SUCCESS_REDIRECT);
  url.searchParams.set('token', accessToken);
  res.redirect(url.toString());
}

function redirectFailure(res: Response, reason: string): void {
  const url = new URL(env.OAUTH_FAILURE_REDIRECT);
  url.searchParams.set('reason', reason);
  res.redirect(url.toString());
}

export const oauthController = {
  // ---- Google ----
  googleStart(_req: Request, res: Response): void {
    const state = oauthService.newState();
    setStateCookie(res, state);
    res.redirect(oauthService.buildGoogleAuthUrl(state));
  },

  async googleCallback(req: Request, res: Response): Promise<void> {
    if (req.query.error || !req.query.code) {
      redirectFailure(res, 'access_denied');
      return;
    }
    if (!verifyState(req, res)) {
      redirectFailure(res, 'invalid_state');
      return;
    }
    try {
      const user = await oauthService.completeGoogle(String(req.query.code));
      const tokens = await authService.issueSession(user, sessionContext(req));
      setRefreshCookie(res, tokens);
      redirectSuccess(res, tokens.accessToken);
    } catch {
      redirectFailure(res, 'oauth_failed');
    }
  },

  // ---- GitHub ----
  githubStart(_req: Request, res: Response): void {
    const state = oauthService.newState();
    setStateCookie(res, state);
    res.redirect(oauthService.buildGithubAuthUrl(state));
  },

  async githubCallback(req: Request, res: Response): Promise<void> {
    if (req.query.error || !req.query.code) {
      redirectFailure(res, 'access_denied');
      return;
    }
    if (!verifyState(req, res)) {
      redirectFailure(res, 'invalid_state');
      return;
    }
    try {
      const user = await oauthService.completeGithub(String(req.query.code));
      const tokens = await authService.issueSession(user, sessionContext(req));
      setRefreshCookie(res, tokens);
      redirectSuccess(res, tokens.accessToken);
    } catch {
      redirectFailure(res, 'oauth_failed');
    }
  },
};
