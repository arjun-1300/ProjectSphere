import { z } from 'zod';

export const summarizeSchema = z.object({
  text: z.string().min(20, 'Provide at least 20 characters to summarize').max(20_000),
});

export const improveDescriptionSchema = z.object({
  text: z.string().min(20).max(20_000),
});

export const suggestTagsSchema = z.object({
  text: z.string().min(20).max(20_000),
});

export const generateReadmeSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(20_000),
  technologies: z.array(z.string().min(1).max(40)).max(30).default([]),
  features: z.array(z.string().min(1).max(200)).max(30).optional(),
  installation: z.string().max(5_000).optional(),
});

export const interviewQuestionsSchema = z
  .object({
    technologies: z.array(z.string().min(1).max(40)).max(30).optional(),
    challenges: z.string().max(5_000).optional(),
  })
  .refine((v) => (v.technologies && v.technologies.length > 0) || v.challenges, {
    message: 'Provide technologies and/or a challenges description',
  });

export const seoSuggestionsSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(20_000),
});
