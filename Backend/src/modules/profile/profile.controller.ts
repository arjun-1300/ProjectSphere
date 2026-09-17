import type { Request, Response } from 'express';
import { profileService } from './profile.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { BadRequestError } from '../../shared/errors/AppError.js';

/** Stable key identifying the viewer for view-dedup: user id if logged in, else IP. */
function viewerKey(req: Request): string {
  return req.user?.sub ?? req.ip ?? 'anonymous';
}

export const profileController = {
  async getByUsername(req: Request, res: Response): Promise<void> {
    const data = await profileService.getProfile(req.params.username, req.user?.sub, viewerKey(req));
    sendSuccess(res, data, 'Profile');
  },

  async updateMine(req: Request, res: Response): Promise<void> {
    const profile = await profileService.updateMyProfile(req.user!.sub, req.body);
    sendSuccess(res, { profile }, 'Profile updated');
  },

  async setAvatar(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new BadRequestError('No image uploaded (field name: "image")');
    const profile = await profileService.setAvatar(req.user!.sub, req.file);
    sendSuccess(res, { profile }, 'Avatar updated');
  },

  async setCover(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new BadRequestError('No image uploaded (field name: "image")');
    const profile = await profileService.setCover(req.user!.sub, req.file);
    sendSuccess(res, { profile }, 'Cover image updated');
  },

  async setResume(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new BadRequestError('No PDF uploaded (field name: "resume")');
    const profile = await profileService.setResume(req.user!.sub, req.file);
    sendSuccess(res, { profile }, 'Resume updated');
  },

  async deleteMine(req: Request, res: Response): Promise<void> {
    await profileService.deleteAccount(req.user!.sub);
    sendSuccess(res, null, 'Account deleted');
  },
};
