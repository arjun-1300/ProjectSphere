import { http, unwrap, unwrapWithMeta } from './client';
import type { ApiResponse, CursorMeta, PageMeta } from './types';
import type { Project } from '@/types/models';

export interface SearchParams {
  q: string;
  category?: string;
  difficulty?: string;
  tech?: string;
  openSource?: boolean;
  sort?: 'relevance' | 'newest' | 'most_viewed' | 'most_liked' | 'recently_updated';
  page?: number;
  pageSize?: number;
}

export const discoveryApi = {
  trending: (params: { page?: number; pageSize?: number } = {}) =>
    unwrapWithMeta<{ projects: Project[] }, PageMeta>(http.get<ApiResponse<{ projects: Project[] }>>('/discover/trending', { params })),
  featured: (params: { page?: number; pageSize?: number } = {}) =>
    unwrapWithMeta<{ projects: Project[] }, PageMeta>(http.get<ApiResponse<{ projects: Project[] }>>('/discover/featured', { params })),
  newest: (params: { cursor?: string; limit?: number } = {}) =>
    unwrapWithMeta<{ projects: Project[] }, CursorMeta>(http.get<ApiResponse<{ projects: Project[] }>>('/discover/newest', { params })),
  recommended: (params: { limit?: number } = {}) =>
    unwrap<{ projects: Project[] }>(http.get<ApiResponse<{ projects: Project[] }>>('/discover/recommended', { params })),
  search: (params: SearchParams) =>
    unwrapWithMeta<{ projects: Project[] }, PageMeta>(http.get<ApiResponse<{ projects: Project[] }>>('/search', { params })),
  autocomplete: (q: string) =>
    unwrap<{ suggestions: { id: string; slug: string; title: string }[] }>(http.get<ApiResponse<{ suggestions: { id: string; slug: string; title: string }[] }>>('/search/autocomplete', { params: { q } })),
  popular: () => unwrap<{ searches: { query: string; count: number }[] }>(http.get<ApiResponse<{ searches: { query: string; count: number }[] }>>('/search/popular')),
  recent: () => unwrap<{ searches: string[] }>(http.get<ApiResponse<{ searches: string[] }>>('/search/recent')),
};
