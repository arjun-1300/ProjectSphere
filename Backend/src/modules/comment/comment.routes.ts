import { Router } from 'express';
import { commentController } from './comment.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { createCommentSchema, updateCommentSchema } from './comment.schema.js';

const router = Router();

// Reply to a comment (single-level).
router.post(
  '/:id/replies',
  authenticate,
  validate({ body: createCommentSchema }),
  asyncHandler(commentController.reply),
);

// Edit / delete a comment.
router.put('/:id', authenticate, validate({ body: updateCommentSchema }), asyncHandler(commentController.edit));
router.delete('/:id', authenticate, asyncHandler(commentController.remove));

export default router;
