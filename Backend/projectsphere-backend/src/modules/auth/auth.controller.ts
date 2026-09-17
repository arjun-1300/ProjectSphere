import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { HttpStatus } from '../../shared/errors/errorCodes.js';
import { getRefreshToken, setRefreshCookie, clearRefreshCookie } from './auth.cookies.js';

function sessionContext(req: Request) {
  return { userAgent: req.header('user-agent'), ipAddress: req.ip };
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const user = await authService.register(req.body);
    sendSuccess(
      res,
      { user },
      'Account created. Check your email to verify your account.',
      HttpStatus.CREATED,
    );
  },

  async login(req: Request, res: Response): Promise<void> {
    const { email, password, rememberMe } = req.body;
    const { user, tokens } = await authService.login(
      email,
      password,
      rememberMe,
      sessionContext(req),
    );
    setRefreshCookie(res, tokens);
    sendSuccess(res, { user, accessToken: tokens.accessToken }, 'Logged in successfully');
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const rawToken = getRefreshToken(req) ?? '';
    const tokens = await authService.refresh(rawToken, sessionContext(req));
    setRefreshCookie(res, tokens);
    sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(getRefreshToken(req));
    clearRefreshCookie(res);
    sendSuccess(res, null, 'Logged out successfully');
  },

  async verifyEmail(req: Request, res: Response): Promise<void> {
    await authService.verifyEmail(req.body);
    sendSuccess(res, null, 'Email verified successfully. You can now log in.');
  },

  async resendVerification(req: Request, res: Response): Promise<void> {
    await authService.resendVerification(req.body.email);
    sendSuccess(res, null, 'If that account exists and is unverified, a new email has been sent.');
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, null, 'If that account exists, a password reset link has been sent.');
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.getById(req.user!.sub);
    sendSuccess(res, { user }, 'Current user');
  },
};
