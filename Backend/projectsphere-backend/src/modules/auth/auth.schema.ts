import { z } from 'zod';

/**
 * Password policy (spec): min 8 chars, at least one uppercase, one lowercase,
 * one number, one special character.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt truncates beyond 72 bytes
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores')
  .transform((v) => v.toLowerCase());

export const registerSchema = z.object({
  email: z.string().email('A valid email is required').toLowerCase(),
  username: usernameSchema,
  password: passwordSchema,
  name: z.string().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('A valid email is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const verifyEmailSchema = z
  .object({
    token: z.string().optional(),
    email: z.string().email().toLowerCase().optional(),
    code: z.string().length(6).optional(),
  })
  .refine((data) => data.token || (data.email && data.code), {
    message: 'Provide either a verification token, or an email and 6-digit code',
  });

export const resendVerificationSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

// refresh & logout read the token from an httpOnly cookie OR the body.
export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
