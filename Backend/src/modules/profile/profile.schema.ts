import { z } from 'zod';

const optionalUrl = z.string().url().optional().or(z.literal('')).transform((v) => (v ? v : undefined));

export const updateProfileSchema = z.object({
  name: z.string().max(80).optional(),
  headline: z.string().max(120).optional(),
  bio: z.string().max(2_000).optional(),
  location: z.string().max(100).optional(),
  skills: z.array(z.string().min(1).max(40)).max(50).optional(),
  experience: z.string().max(5_000).optional(),
  education: z.string().max(5_000).optional(),
  portfolioWebsite: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  twitterUrl: optionalUrl,
  openToWork: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
