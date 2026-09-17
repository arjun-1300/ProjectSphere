import { http, unwrap, unwrapWithMeta } from './client';
import type { ApiResponse, CursorMeta } from './types';
import type { Author } from '@/types/models';

export const socialApi = {
  toggleLike: (slug: string) => unwrap<{ liked: boolean; likeCount: number }>(http.post<ApiResponse<{ liked: boolean; likeCount: number }>>(`/projects/${slug}/like`, {})),
  toggleBookmark: (slug: string) => unwrap<{ bookmarked: boolean; bookmarkCount: number }>(http.post<ApiResponse<{ bookmarked: boolean; bookmarkCount: number }>>(`/projects/${slug}/bookmark`, {})),
  toggleFollow: (username: string) => unwrap<{ following: boolean; followerCount: number }>(http.post<ApiResponse<{ following: boolean; followerCount: number }>>(`/users/${username}/follow`, {})),
  followers: (username: string, params: { cursor?: string; limit?: number } = {}) =>
    unwrapWithMeta<{ followers: Author[] }, CursorMeta>(http.get<ApiResponse<{ followers: Author[] }>>(`/users/${username}/followers`, { params })),
  following: (username: string, params: { cursor?: string; limit?: number } = {}) =>
    unwrapWithMeta<{ following: Author[] }, CursorMeta>(http.get<ApiResponse<{ following: Author[] }>>(`/users/${username}/following`, { params })),
};
