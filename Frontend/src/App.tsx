import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ScrollToTop, ProtectedRoute, RoleRoute } from '@/components/routing/Guards';
import { Spinner } from '@/components/ui/Spinner';

// Eager: the pages most first-time visitors land on.
import { DiscoverPage } from '@/pages/DiscoverPage';
import { SearchPage } from '@/pages/SearchPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// Lazy: heavier or authenticated-only routes. This keeps recharts and the
// editor out of the initial bundle — the Discover feed never pays for them.
const named = <M, K extends keyof M>(loader: () => Promise<M>, key: K) =>
  lazy(() => loader().then((m) => ({ default: m[key] as unknown as React.ComponentType })));

const ProjectEditorPage = named(() => import('@/pages/ProjectEditorPage'), 'ProjectEditorPage');
const NotificationsPage = named(() => import('@/pages/NotificationsPage'), 'NotificationsPage');
const DashboardPage = named(() => import('@/pages/DashboardPage'), 'DashboardPage');
const AIStudioPage = named(() => import('@/pages/AIStudioPage'), 'AIStudioPage');
const VerifyEmailPage = named(() => import('@/pages/auth/VerifyEmailPage'), 'VerifyEmailPage');
const ForgotPasswordPage = named(() => import('@/pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = named(() => import('@/pages/auth/ResetPasswordPage'), 'ResetPasswordPage');
const AdminDashboardPage = named(() => import('@/pages/admin/AdminDashboardPage'), 'AdminDashboardPage');
const AdminUsersPage = named(() => import('@/pages/admin/AdminUsersPage'), 'AdminUsersPage');
const AdminReportsPage = named(() => import('@/pages/admin/AdminReportsPage'), 'AdminReportsPage');

export function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Spinner label="loading" />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DiscoverPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="projects/new" element={<ProtectedRoute><ProjectEditorPage /></ProtectedRoute>} />
            <Route path="projects/:slug" element={<ProjectDetailPage />} />
            <Route path="projects/:slug/edit" element={<ProtectedRoute><ProjectEditorPage /></ProtectedRoute>} />
            <Route path="u/:username" element={<ProfilePage />} />
            <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="ai" element={<ProtectedRoute><AIStudioPage /></ProtectedRoute>} />

            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />

            <Route path="admin" element={<RoleRoute role="ADMIN"><AdminDashboardPage /></RoleRoute>} />
            <Route path="admin/users" element={<RoleRoute role="ADMIN"><AdminUsersPage /></RoleRoute>} />
            <Route path="admin/reports" element={<RoleRoute role="ADMIN"><AdminReportsPage /></RoleRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
