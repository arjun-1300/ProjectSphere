// The envelope every ProjectSphere endpoint returns.
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: { code?: string; [k: string]: unknown } | null;
  meta?: Record<string, unknown> | null;
}

export interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
  unreadCount?: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Access token lives in memory only (not localStorage) to reduce XSS blast
 * radius — the long-lived refresh token is an httpOnly cookie the browser
 * manages. A tiny observable store lets AuthContext react to changes.
 */
let accessToken: string | null = null;
const listeners = new Set<(t: string | null) => void>();

export const tokenStore = {
  get: () => accessToken,
  set(token: string | null) {
    accessToken = token;
    listeners.forEach((l) => l(token));
  },
  subscribe(fn: (t: string | null) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
