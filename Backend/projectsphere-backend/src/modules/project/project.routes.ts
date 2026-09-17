import { Router } from 'express';
import { projectController } from './project.controller.js';
import { socialController } from '../social/social.controller.js';
import { commentController } from '../comment/comment.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { singleImage, imageArray } from '../../middleware/upload.middleware.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectStatusSchema,
  galleryReorderSchema,
} from './project.schema.js';
import { createCommentSchema, commentListQuerySchema } from '../comment/comment.schema.js';

const router = Router();

// ---- CRUD ----
router.post('/', authenticate, validate({ body: createProjectSchema }), asyncHandler(projectController.create));
router.get('/:slug', optionalAuth, asyncHandler(projectController.getBySlug));
router.put('/:slug', authenticate, validate({ body: updateProjectSchema }), asyncHandler(projectController.update));
router.delete('/:slug', authenticate, asyncHandler(projectController.remove));

// ---- Status & duplicate ----
router.patch(
  '/:slug/status',
  authenticate,
  validate({ body: projectStatusSchema }),
  asyncHandler(projectController.setStatus),
);
router.post('/:slug/duplicate', authenticate, asyncHandler(projectController.duplicate));

// ---- Media ----
router.post('/:slug/cover', authenticate, singleImage('image'), asyncHandler(projectController.setCover));
router.post('/:slug/architecture', authenticate, singleImage('image'), asyncHandler(projectController.setArchitecture));
router.post('/:slug/gallery', authenticate, imageArray('images'), asyncHandler(projectController.addGallery));
router.patch(
  '/:slug/gallery/reorder',
  authenticate,
  validate({ body: galleryReorderSchema }),
  asyncHandler(projectController.reorderGallery),
);
router.delete('/:slug/gallery/:imageId', authenticate, asyncHandler(projectController.deleteGalleryImage));

// ---- Social (nested under a project) ----
router.post('/:slug/like', authenticate, asyncHandler(socialController.toggleLike));
router.post('/:slug/bookmark', authenticate, asyncHandler(socialController.toggleBookmark));

// ---- Comments (nested under a project) ----
router.get('/:slug/comments', validate({ query: commentListQuerySchema }), asyncHandler(commentController.list));
router.post(
  '/:slug/comments',
  authenticate,
  validate({ body: createCommentSchema }),
  asyncHandler(commentController.add),
);

export default router;
