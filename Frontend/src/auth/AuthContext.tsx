import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type LoginPayload, type RegisterPayload } from '@/lib/api/auth';
import { http, unwrap } from '@/lib/api/client';
import { tokenStore, type ApiResponse } from '@/lib/api/types';
import type { AuthUser } from '@/types/models';

interface AuthState {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (p: LoginPayload) => Promise<AuthUser>;
  register: (p: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  // On first load, try to establish a session. We have no access token yet, so
  // /auth/me will 401 -> the interceptor silently refreshes via the cookie. If
  // there is no valid cookie, we settle as anonymous.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Prime an access token from the refresh cookie so /me succeeds on the
        // first try. If there's no valid cookie, we settle as anonymous.
        try {
          const { accessToken } = await unwrap<{ accessToken: string }>(
            http.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {}),
          );
          tokenStore.set(accessToken);
        } catch {
          tokenStore.set(null);
        }
        if (tokenStore.get()) {
          const { user: me } = await authApi.me();
          if (active) { setUser(me); setStatus('authenticated'); }
        } else if (active) {
          setStatus('anonymous');
        }
      } catch {
        if (active) { setStatus('anonymous'); setUser(null); }
      }
    })();
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    status,
    async login(p) {
      const { user: u, accessToken } = await authApi.login(p);
      tokenStore.set(accessToken);
      setUser(u);
      setStatus('authenticated');
      return u;
    },
    async register(p) {
      await authApi.register(p);
    },
    async logout() {
      try { await authApi.logout(); } catch { /* ignore */ }
      tokenStore.set(null);
      setUser(null);
      setStatus('anonymous');
    },
    async refreshUser() {
      const { user: me } = await authApi.me();
      setUser(me);
      setStatus('authenticated');
    },
  }), [user, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
