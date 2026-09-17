import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { trackEventSchema, analyticsRangeSchema } from './analytics.schema.js';

const router = Router();

// Tracking is open to anonymous visitors (dedup by IP); auth is optional.
router.post('/track', optionalAuth, validate({ body: trackEventSchema }), asyncHandler(analyticsController.track));

// Owner-only insights.
router.get(
  '/projects/:slug',
  authenticate,
  validate({ query: analyticsRangeSchema }),
  asyncHandler(analyticsController.projectAnalytics),
);
router.get('/dashboard', authenticate, asyncHandler(analyticsController.dashboard));

export default router;
