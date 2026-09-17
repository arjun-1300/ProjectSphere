import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment schema. The app validates process.env against this on startup.
 * If anything is missing or malformed, the process exits with a readable report
 * instead of failing mysteriously deep in a request handler.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  CLIENT_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((val) => val.split(',').map((o) => o.trim()).filter(Boolean)),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  JWT_REFRESH_REMEMBER_DAYS: z.coerce.number().int().positive().default(30),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  MAIL_FROM_NAME: z.string().default('ProjectSphere'),
  MAIL_FROM_EMAIL: z.string().email(),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().url().or(z.literal('')).default(''),

  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  GITHUB_CALLBACK_URL: z.string().url().or(z.literal('')).default(''),

  OAUTH_SUCCESS_REDIRECT: z.string().url().default('http://localhost:5173/oauth/callback'),
  OAUTH_FAILURE_REDIRECT: z.string().url().default('http://localhost:5173/login?error=oauth'),

  // ---- Cloudinary (media uploads) ----
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_FOLDER: z.string().default('projectsphere'),

  // ---- Gemini AI ----
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  AI_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Flatten Zod errors into a clean, readable list before exiting.
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(
    `\n❌ Invalid environment configuration:\n${issues}\n\n` +
      `Fix your .env file (see .env.example) and restart.\n`,
  );
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

/** Whether Google OAuth is fully configured (all three values present). */
export const googleOAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL,
);

/** Whether GitHub OAuth is fully configured. */
export const githubOAuthEnabled = Boolean(
  env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GITHUB_CALLBACK_URL,
);

/** Whether Cloudinary media uploads are configured. */
export const cloudinaryEnabled = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

/** Whether Gemini AI features are configured. */
export const geminiEnabled = Boolean(env.GEMINI_API_KEY);
