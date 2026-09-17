import { http, unwrap } from './client';
import type { ApiResponse } from './types';
import type { DeveloperDashboard } from '@/types/models';

export const analyticsApi = {
  dashboard: () => unwrap<DeveloperDashboard>(http.get<ApiResponse<DeveloperDashboard>>('/analytics/dashboard')),
  track: (type: 'PROJECT_VIEW' | 'DEMO_CLICK' | 'GITHUB_CLICK', slug: string) =>
    unwrap<{ counted: boolean }>(http.post<ApiResponse<{ counted: boolean }>>('/analytics/track', { type, slug })),
};
