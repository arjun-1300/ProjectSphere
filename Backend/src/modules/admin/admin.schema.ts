import { z } from 'zod';

// ---- Users ----
export const userListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['ADMIN', 'DEVELOPER', 'RECRUITER']).optional(),
  banned: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const banUserSchema = z.object({ banned: z.boolean() });
export const changeRoleSchema = z.object({ role: z.enum(['ADMIN', 'DEVELOPER', 'RECRUITER']) });

// ---- Projects ----
export const projectAdminListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  hidden: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const featureProjectSchema = z.object({ featured: z.boolean() });

// ---- Reports ----
export const reportListQuerySchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']).optional(),
  type: z.enum(['SPAM', 'FAKE', 'ABUSE', 'COPYRIGHT', 'INAPPROPRIATE']).optional(),
  targetType: z.enum(['PROJECT', 'COMMENT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const resolveReportSchema = z.object({
  status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
  adminNotes: z.string().max(2_000).optional(),
  // Optional moderation action to apply to the reported target.
  action: z.enum(['NONE', 'HIDE_PROJECT', 'UNHIDE_PROJECT', 'DELETE_PROJECT', 'DELETE_COMMENT']).default('NONE'),
});

// ---- Categories ----
export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  slug: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
});
export const updateCategorySchema = createCategorySchema.partial();

// ---- Technologies ----
export const createTechnologySchema = z.object({
  name: z.string().min(1).max(40),
  slug: z.string().min(1).max(60).optional(),
  iconUrl: z.string().url().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
});
export const updateTechnologySchema = createTechnologySchema.partial();
export const mergeTechnologySchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type ProjectAdminListQuery = z.infer<typeof projectAdminListQuerySchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
