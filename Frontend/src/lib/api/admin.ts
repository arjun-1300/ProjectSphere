import { http, unwrap, unwrapWithMeta } from './client';
import type { ApiResponse, PageMeta } from './types';
import type { AdminDashboard, AdminUserRow, ReportRow, Role } from '@/types/models';

export const adminApi = {
  dashboard: () => unwrap<AdminDashboard>(http.get<ApiResponse<AdminDashboard>>('/admin/dashboard')),
  users: (params: { q?: string; role?: Role; banned?: boolean; page?: number; pageSize?: number } = {}) =>
    unwrapWithMeta<{ users: AdminUserRow[] }, PageMeta>(http.get<ApiResponse<{ users: AdminUserRow[] }>>('/admin/users', { params })),
  banUser: (id: string, banned: boolean) => unwrap(http.patch<ApiResponse<unknown>>(`/admin/users/${id}/ban`, { banned })),
  changeRole: (id: string, role: Role) => unwrap(http.patch<ApiResponse<unknown>>(`/admin/users/${id}/role`, { role })),
  reports: (params: { status?: string; type?: string; page?: number; pageSize?: number } = {}) =>
    unwrapWithMeta<{ reports: ReportRow[] }, PageMeta>(http.get<ApiResponse<{ reports: ReportRow[] }>>('/admin/reports', { params })),
  resolveReport: (id: string, body: { status: string; adminNotes?: string; action?: string }) =>
    unwrap(http.patch<ApiResponse<unknown>>(`/admin/reports/${id}`, body)),
};
