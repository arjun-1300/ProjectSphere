import { http, unwrap, unwrapWithMeta } from './client';
import type { ApiResponse, CursorMeta } from './types';
import type { Comment } from '@/types/models';

export const commentsApi = {
  list: (slug: string, params: { cursor?: string; limit?: number } = {}) =>
    unwrapWithMeta<{ comments: Comment[] }, CursorMeta>(http.get<ApiResponse<{ comments: Comment[] }>>(`/projects/${slug}/comments`, { params })),
  add: (slug: string, content: string) => unwrap<{ comment: Comment }>(http.post<ApiResponse<{ comment: Comment }>>(`/projects/${slug}/comments`, { content })),
  reply: (id: string, content: string) => unwrap<{ reply: Comment }>(http.post<ApiResponse<{ reply: Comment }>>(`/comments/${id}/replies`, { content })),
  edit: (id: string, content: string) => unwrap<{ comment: Comment }>(http.put<ApiResponse<{ comment: Comment }>>(`/comments/${id}`, { content })),
  remove: (id: string) => unwrap(http.delete<ApiResponse<null>>(`/comments/${id}`)),
};
