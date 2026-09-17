import { z } from 'zod';

export const createReportSchema = z.object({
  reason: z.enum(['SPAM', 'FAKE', 'ABUSE', 'COPYRIGHT', 'INAPPROPRIATE']),
  details: z.string().max(1_000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
