import { http, unwrap, unwrapWithMeta } from './client';
import type { ApiResponse, CursorMeta } from './types';
import type { NotificationItem } from '@/types/models';

export const notificationsApi = {
  list: (params: { cursor?: string; limit?: number; unreadOnly?: boolean } = {}) =>
    unwrapWithMeta<{ notifications: NotificationItem[] }, CursorMeta>(http.get<ApiResponse<{ notifications: NotificationItem[] }>>('/notifications', { params })),
  markRead: (id: string) => unwrap(http.patch<ApiResponse<null>>(`/notifications/${id}/read`, {})),
  markAllRead: () => unwrap<{ updated: number }>(http.patch<ApiResponse<{ updated: number }>>('/notifications/read-all', {})),
  remove: (id: string) => unwrap(http.delete<ApiResponse<null>>(`/notifications/${id}`)),
};
