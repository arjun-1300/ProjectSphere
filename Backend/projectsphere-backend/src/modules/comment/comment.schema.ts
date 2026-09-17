import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2_000, 'Comment is too long'),
});

export const updateCommentSchema = createCommentSchema;

export const commentListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;
