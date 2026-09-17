import { Router } from 'express';
import { authController } from './auth.controller.js';
import { oauthController } from '../oauth/oauth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { rateLimit } from '../../middleware/rateLimiter.middleware.js';
import { authLimiter } from '../../middleware/rateLimiters.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';

const router = Router();

// ---- Rate limiters ----
// Sensitive auth endpoints share the strict 5/15min limiter (express-rate-limit).
// Resend keeps a tighter 1/60s window of its own.
const resendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1, // spec: 1 per 60s
  message: 'Please wait a minute before requesting another verification email.',
});

// ---- Local auth ----
router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));

router.post('/verify-email', validate({ body: verifyEmailSchema }), asyncHandler(authController.verifyEmail));
router.post(
  '/resend-verification',
  resendLimiter,
  validate({ body: resendVerificationSchema }),
  asyncHandler(authController.resendVerification),
);
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
);
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);

// ---- Current user ----
router.get('/me', authenticate, asyncHandler(authController.me));

// ---- OAuth: Google ----
router.get('/google', oauthController.googleStart);
router.get('/google/callback', asyncHandler(oauthController.googleCallback));

// ---- OAuth: GitHub ----
router.get('/github', oauthController.githubStart);
router.get('/github/callback', asyncHandler(oauthController.githubCallback));

export default router;
