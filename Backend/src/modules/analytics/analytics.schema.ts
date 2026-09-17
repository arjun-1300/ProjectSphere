import { z } from 'zod';

export const trackEventSchema = z.object({
  type: z.enum(['PROJECT_VIEW', 'DEMO_CLICK', 'GITHUB_CLICK']),
  slug: z.string().min(1),
});

export const analyticsRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
