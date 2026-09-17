import type { Request, Response } from 'express';
import { projectService } from './project.service.js';
import { socialService } from '../social/social.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { HttpStatus } from '../../shared/errors/errorCodes.js';
import { BadRequestError } from '../../shared/errors/AppError.js';
import type { ProjectListQuery } from './project.schema.js';

export const projectController = {
  async create(req: Request, res: Response): Promise<void> {
    const project = await projectService.create(req.user!.sub, req.body);
    sendSuccess(res, { project }, 'Project created', HttpStatus.CREATED);
  },

  async getBySlug(req: Request, res: Response): Promise<void> {
    const project = await projectService.getBySlug(req.params.slug, req.user?.sub);
    // Enrich with the viewer's relationship to the project (like/bookmark/follow).
    const viewerRelationship = await socialService.projectRelationship(
      req.user?.sub,
      project.id,
      project.authorId,
    );
    sendSuccess(res, { project, viewerRelationship }, 'Project');
  },

  async update(req: Request, res: Response): Promise<void> {
    const project = await projectService.update(req.user!.sub, req.params.slug, req.body);
    sendSuccess(res, { project }, 'Project updated');
  },

  async remove(req: Request, res: Response): Promise<void> {
    await projectService.remove(req.user!.sub, req.params.slug);
    sendSuccess(res, null, 'Project deleted');
  },

  async setStatus(req: Request, res: Response): Promise<void> {
    const project = await projectService.setStatus(req.user!.sub, req.params.slug, req.body.status);
    sendSuccess(res, { project }, `Project status set to ${req.body.status}`);
  },

  async duplicate(req: Request, res: Response): Promise<void> {
    const project = await projectService.duplicate(req.user!.sub, req.params.slug);
    sendSuccess(res, { project }, 'Project duplicated as draft', HttpStatus.CREATED);
  },

  // ---- Media ----
  async setCover(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new BadRequestError('No image uploaded (field name: "image")');
    const image = await projectService.setCover(req.user!.sub, req.params.slug, req.file);
    sendSuccess(res, { image }, 'Cover image updated');
  },

  async setArchitecture(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new BadRequestError('No image uploaded (field name: "image")');
    const image = await projectService.setArchitecture(req.user!.sub, req.params.slug, req.file);
    sendSuccess(res, { image }, 'Architecture diagram updated');
  },

  async addGallery(req: Request, res: Response): Promise<void> {
    const files = (req.files as Express.Multer.File[]) ?? [];
    const images = await projectService.addGallery(req.user!.sub, req.params.slug, files);
    sendSuccess(res, { images }, 'Gallery images added', HttpStatus.CREATED);
  },

  async reorderGallery(req: Request, res: Response): Promise<void> {
    const images = await projectService.reorderGallery(req.user!.sub, req.params.slug, req.body.order);
    sendSuccess(res, { images }, 'Gallery reordered');
  },

  async deleteGalleryImage(req: Request, res: Response): Promise<void> {
    await projectService.deleteGalleryImage(req.user!.sub, req.params.slug, req.params.imageId);
    sendSuccess(res, null, 'Gallery image deleted');
  },
};

export type { ProjectListQuery };
