import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { tokenStore, type ApiResponse } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

/** A friendly error surfaced to the UI, carrying the API's error code + status. */
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send/receive the httpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

// Attach the current access token to every request.
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Refresh-on-401 with a single-flight guard ----
// If a request 401s, we attempt one silent refresh via the cookie, then retry
// the original request. Concurrent 401s share the same in-flight refresh.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post<ApiResponse<{ accessToken: string }>>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const token = res.data.data.accessToken;
    tokenStore.set(token);
    return token;
  } catch {
    tokenStore.set(null);
    return null;
  }
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status ?? 0;

    // Only try to refresh once per request, and never for the refresh call itself.
    const isAuthRoute = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login');
    if (status === 401 && original && !original._retry && !isAuthRoute && tokenStore.get() !== null) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return http(original);
      }
    }

    const body = error.response?.data;
    const message = body?.message || error.message || 'Something went wrong';
    throw new ApiError(message, status, body?.errors?.code);
  },
);

/** Unwrap the `data` field from the envelope. */
export async function unwrap<T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await p;
  return res.data.data;
}

/** Unwrap `data` plus `meta` (for paginated lists). */
export async function unwrapWithMeta<T, M = Record<string, unknown>>(
  p: Promise<{ data: ApiResponse<T> }>,
): Promise<{ data: T; meta: M }> {
  const res = await p;
  return { data: res.data.data, meta: (res.data.meta ?? {}) as M };
}
