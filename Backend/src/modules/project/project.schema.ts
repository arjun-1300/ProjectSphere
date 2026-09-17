import { z } from 'zod';

// Accept only YouTube or Vimeo demo video links.
const VIDEO_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/|vimeo\.com\/)[\w\-?=&#/.]+$/i;

const optionalUrl = z.string().url().optional().or(z.literal('')).transform((v) => (v ? v : undefined));

const difficultyEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

export const createProjectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(120),
  shortDescription: z.string().min(10, 'Short description must be at least 10 characters').max(300),
  detailedDescription: z.string().max(20_000).optional(),

  demoVideoUrl: z
    .string()
    .regex(VIDEO_URL_REGEX, 'Demo video must be a YouTube or Vimeo URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  liveUrl: optionalUrl,
  githubUrl: optionalUrl,

  problemStatement: z.string().max(5_000).optional(),
  solution: z.string().max(5_000).optional(),
  challenges: z.string().max(5_000).optional(),
  futureScope: z.string().max(5_000).optional(),
  installationGuide: z.string().max(10_000).optional(),

  difficulty: difficultyEnum.default('INTERMEDIATE'),
  // On create only DRAFT or PUBLISHED are allowed (archive happens later).
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  isOpenSource: z.boolean().default(false),
  license: z.string().max(50).optional(),
  version: z.string().max(30).optional(),
  estimatedDevTime: z.string().max(50).optional(),

  categoryId: z.string().optional(),
  technologies: z.array(z.string().min(1).max(40)).max(20).default([]),
  tags: z.array(z.string().min(1).max(40)).max(15).default([]),
});

// Update: everything optional; separate schema so defaults don't overwrite fields.
export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const projectStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

export const projectListQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const galleryReorderSchema = z.object({
  // Ordered list of image ids; index becomes the new position.
  order: z.array(z.string().min(1)).min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
