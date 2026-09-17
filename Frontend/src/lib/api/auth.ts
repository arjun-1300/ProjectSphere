import { http, unwrap } from './client';
import type { ApiResponse } from './types';
import type { AuthUser } from '@/types/models';

export interface LoginPayload { email: string; password: string; rememberMe?: boolean }
export interface RegisterPayload { email: string; username: string; password: string; name?: string }

export const authApi = {
  register: (p: RegisterPayload) => unwrap<{ user: AuthUser }>(http.post<ApiResponse<{ user: AuthUser }>>('/auth/register', p)),
  login: (p: LoginPayload) =>
    unwrap<{ user: AuthUser; accessToken: string }>(http.post<ApiResponse<{ user: AuthUser; accessToken: string }>>('/auth/login', p)),
  logout: () => unwrap(http.post<ApiResponse<null>>('/auth/logout', {})),
  me: () => unwrap<{ user: AuthUser }>(http.get<ApiResponse<{ user: AuthUser }>>('/auth/me')),
  verifyEmail: (payload: { token?: string; email?: string; code?: string }) =>
    unwrap(http.post<ApiResponse<null>>('/auth/verify-email', payload)),
  resendVerification: (email: string) => unwrap(http.post<ApiResponse<null>>('/auth/resend-verification', { email })),
  forgotPassword: (email: string) => unwrap(http.post<ApiResponse<null>>('/auth/forgot-password', { email })),
  resetPassword: (token: string, password: string) => unwrap(http.post<ApiResponse<null>>('/auth/reset-password', { token, password })),
};
