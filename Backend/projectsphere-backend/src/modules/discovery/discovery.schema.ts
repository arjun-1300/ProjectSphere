import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query is required').max(100),
  category: z.string().optional(), // category slug
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  tech: z.string().optional(), // technology name
  openSource: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  sort: z
    .enum(['relevance', 'newest', 'most_viewed', 'most_liked', 'recently_updated'])
    .default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const cursorFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type CursorFeedQuery = z.infer<typeof cursorFeedQuerySchema>;
