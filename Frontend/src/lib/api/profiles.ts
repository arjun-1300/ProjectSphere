import { http, unwrap } from './client';
import type { ApiResponse } from './types';
import type { Profile, ProfileResponse } from '@/types/models';

export interface UpdateProfilePayload {
  name?: string; headline?: string; bio?: string; location?: string;
  skills?: string[]; experience?: string; education?: string;
  portfolioWebsite?: string; githubUrl?: string; linkedinUrl?: string; twitterUrl?: string;
  openToWork?: boolean;
}

export const profilesApi = {
  get: (username: string) => unwrap<ProfileResponse>(http.get<ApiResponse<ProfileResponse>>(`/profiles/${username}`)),
  updateMine: (p: UpdateProfilePayload) => unwrap<{ profile: Profile }>(http.put<ApiResponse<{ profile: Profile }>>('/profiles/me', p)),
  deleteMine: () => unwrap(http.delete<ApiResponse<null>>('/profiles/me')),
  uploadAvatar: (file: File) => {
    const fd = new FormData(); fd.append('image', file);
    return unwrap<{ profile: Profile }>(http.patch<ApiResponse<{ profile: Profile }>>('/profiles/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
};
