import { Router } from 'express';
import { profileController } from './profile.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { singleImage, singlePdf } from '../../middleware/upload.middleware.js';
import { updateProfileSchema } from './profile.schema.js';

const router = Router();

// Public profile (richer when authenticated → isFollowing / isOwner).
router.get('/:username', optionalAuth, asyncHandler(profileController.getByUsername));

// Owner-only self routes.
router.put('/me', authenticate, validate({ body: updateProfileSchema }), asyncHandler(profileController.updateMine));
router.patch('/me/avatar', authenticate, singleImage('image'), asyncHandler(profileController.setAvatar));
router.patch('/me/cover', authenticate, singleImage('image'), asyncHandler(profileController.setCover));
router.patch('/me/resume', authenticate, singlePdf('resume'), asyncHandler(profileController.setResume));
router.delete('/me', authenticate, asyncHandler(profileController.deleteMine));

export default router;
