import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { notificationListQuerySchema, updateNotificationPrefsSchema } from './notification.schema.js';

const router = Router();

// Every notification route requires authentication.
router.use(authenticate);

router.get('/', validate({ query: notificationListQuerySchema }), asyncHandler(notificationController.list));
router.patch('/read-all', asyncHandler(notificationController.markAllRead));

router.get('/preferences', asyncHandler(notificationController.getPreferences));
router.put(
  '/preferences',
  validate({ body: updateNotificationPrefsSchema }),
  asyncHandler(notificationController.updatePreferences),
);

router.patch('/:id/read', asyncHandler(notificationController.markRead));
router.delete('/:id', asyncHandler(notificationController.remove));

export default router;
