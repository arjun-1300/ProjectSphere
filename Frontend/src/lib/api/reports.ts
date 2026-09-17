import { http, unwrap } from './client';
import type { ApiResponse } from './types';
import type { ReportReason } from '@/types/models';

export const reportsApi = {
  reportProject: (slug: string, reason: ReportReason, details?: string) =>
    unwrap(http.post<ApiResponse<unknown>>(`/reports/projects/${slug}`, { reason, details })),
  reportComment: (id: string, reason: ReportReason, details?: string) =>
    unwrap(http.post<ApiResponse<unknown>>(`/reports/comments/${id}`, { reason, details })),
};
