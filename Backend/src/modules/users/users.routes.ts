import { Router } from 'express';
import { usersController } from './users.controller.js';
import { socialController } from '../social/social.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { projectListQuerySchema } from '../project/project.schema.js';
import { cursorFeedQuerySchema } from '../discovery/discovery.schema.js';

const router = Router();

// A user's projects (owner also sees drafts via ?status=).
router.get(
  '/:username/projects',
  optionalAuth,
  validate({ query: projectListQuerySchema }),
  asyncHandler(usersController.getProjects),
);

// Follow graph.
router.post('/:username/follow', authenticate, asyncHandler(socialController.toggleFollow));
router.get(
  '/:username/followers',
  validate({ query: cursorFeedQuerySchema }),
  asyncHandler(socialController.followers),
);
router.get(
  '/:username/following',
  validate({ query: cursorFeedQuerySchema }),
  asyncHandler(socialController.following),
);

export default router;
