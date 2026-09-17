import { z } from 'zod';

export const notificationListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

// Per-type email toggles. All optional; omitted types keep their default (on).
export const updateNotificationPrefsSchema = z
  .object({
    LIKE: z.boolean(),
    COMMENT: z.boolean(),
    REPLY: z.boolean(),
    FOLLOW: z.boolean(),
    FEATURED: z.boolean(),
    ADMIN_MESSAGE: z.boolean(),
  })
  .partial();

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type UpdateNotificationPrefs = z.infer<typeof updateNotificationPrefsSchema>;
