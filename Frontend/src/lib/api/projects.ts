import { http, unwrap, unwrapWithMeta } from './client';
import type { ApiResponse, CursorMeta } from './types';
import type { Project, ViewerRelationship, ProjectImage } from '@/types/models';

export interface CreateProjectPayload {
  title: string;
  shortDescription: string;
  detailedDescription?: string;
  demoVideoUrl?: string;
  liveUrl?: string;
  githubUrl?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status?: 'DRAFT' | 'PUBLISHED';
  isOpenSource?: boolean;
  categoryId?: string;
  technologies?: string[];
  tags?: string[];
}

export const projectsApi = {
  get: (slug: string) =>
    unwrap<{ project: Project; viewerRelationship: ViewerRelationship }>(
      http.get<ApiResponse<{ project: Project; viewerRelationship: ViewerRelationship }>>(`/projects/${slug}`),
    ),
  create: (p: CreateProjectPayload) => unwrap<{ project: Project }>(http.post<ApiResponse<{ project: Project }>>('/projects', p)),
  update: (slug: string, p: Partial<CreateProjectPayload> & { status?: string }) =>
    unwrap<{ project: Project }>(http.put<ApiResponse<{ project: Project }>>(`/projects/${slug}`, p)),
  remove: (slug: string) => unwrap(http.delete<ApiResponse<null>>(`/projects/${slug}`)),
  setStatus: (slug: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') =>
    unwrap<{ project: Project }>(http.patch<ApiResponse<{ project: Project }>>(`/projects/${slug}/status`, { status })),
  duplicate: (slug: string) => unwrap<{ project: Project }>(http.post<ApiResponse<{ project: Project }>>(`/projects/${slug}/duplicate`, {})),

  listByUser: (username: string, params: { cursor?: string; limit?: number; status?: string } = {}) =>
    unwrapWithMeta<{ projects: Project[] }, CursorMeta>(
      http.get<ApiResponse<{ projects: Project[] }>>(`/users/${username}/projects`, { params }),
    ),

  // Media (multipart)
  uploadCover: (slug: string, file: File) => {
    const fd = new FormData(); fd.append('image', file);
    return unwrap<{ image: ProjectImage }>(http.post<ApiResponse<{ image: ProjectImage }>>(`/projects/${slug}/cover`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  uploadGallery: (slug: string, files: File[]) => {
    const fd = new FormData(); files.forEach((f) => fd.append('images', f));
    return unwrap<{ images: ProjectImage[] }>(http.post<ApiResponse<{ images: ProjectImage[] }>>(`/projects/${slug}/gallery`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
};
