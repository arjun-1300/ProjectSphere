import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Role } from '@/types/models';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="checking session" />;
  if (status === 'anonymous') return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export function RoleRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <Spinner label="checking access" />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  if (user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
