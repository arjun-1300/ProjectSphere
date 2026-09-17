import type { Request, Response } from 'express';
import { adminService } from './admin.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { HttpStatus } from '../../shared/errors/errorCodes.js';
import type { UserListQuery, ProjectAdminListQuery, ReportListQuery } from './admin.schema.js';

export const adminController = {
  async dashboard(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await adminService.dashboard(), 'Admin dashboard');
  },

  // Users
  async listUsers(req: Request, res: Response): Promise<void> {
    const result = await adminService.listUsers(req.query as unknown as UserListQuery);
    sendSuccess(res, { users: result.users }, 'Users', 200, result.meta);
  },
  async banUser(req: Request, res: Response): Promise<void> {
    const result = await adminService.setBanned(req.user!.sub, req.params.id, req.body.banned);
    sendSuccess(res, result, req.body.banned ? 'User banned' : 'User unbanned');
  },
  async changeRole(req: Request, res: Response): Promise<void> {
    const result = await adminService.changeRole(req.user!.sub, req.params.id, req.body.role);
    sendSuccess(res, result, 'Role updated');
  },
  async deleteUser(req: Request, res: Response): Promise<void> {
    await adminService.deleteUser(req.user!.sub, req.params.id);
    sendSuccess(res, null, 'User deleted');
  },

  // Projects
  async listProjects(req: Request, res: Response): Promise<void> {
    const result = await adminService.listProjects(req.query as unknown as ProjectAdminListQuery);
    sendSuccess(res, { projects: result.projects }, 'Projects', 200, result.meta);
  },
  async featureProject(req: Request, res: Response): Promise<void> {
    const result = await adminService.setFeatured(req.user!.sub, req.params.id, req.body.featured);
    sendSuccess(res, result, req.body.featured ? 'Project featured' : 'Project unfeatured');
  },
  async deleteProject(req: Request, res: Response): Promise<void> {
    await adminService.deleteProject(req.user!.sub, req.params.id);
    sendSuccess(res, null, 'Project deleted');
  },

  // Reports
  async listReports(req: Request, res: Response): Promise<void> {
    const result = await adminService.listReports(req.query as unknown as ReportListQuery);
    sendSuccess(res, { reports: result.reports }, 'Reports', 200, result.meta);
  },
  async resolveReport(req: Request, res: Response): Promise<void> {
    const result = await adminService.resolveReport(req.user!.sub, req.params.id, req.body);
    sendSuccess(res, { report: result }, 'Report updated');
  },

  // Categories
  async listCategories(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { categories: await adminService.listCategories() }, 'Categories');
  },
  async createCategory(req: Request, res: Response): Promise<void> {
    const category = await adminService.createCategory(req.user!.sub, req.body);
    sendSuccess(res, { category }, 'Category created', HttpStatus.CREATED);
  },
  async updateCategory(req: Request, res: Response): Promise<void> {
    const category = await adminService.updateCategory(req.user!.sub, req.params.id, req.body);
    sendSuccess(res, { category }, 'Category updated');
  },
  async deleteCategory(req: Request, res: Response): Promise<void> {
    await adminService.deleteCategory(req.user!.sub, req.params.id);
    sendSuccess(res, null, 'Category deleted');
  },

  // Technologies
  async listTechnologies(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { technologies: await adminService.listTechnologies() }, 'Technologies');
  },
  async createTechnology(req: Request, res: Response): Promise<void> {
    const technology = await adminService.createTechnology(req.user!.sub, req.body);
    sendSuccess(res, { technology }, 'Technology created', HttpStatus.CREATED);
  },
  async updateTechnology(req: Request, res: Response): Promise<void> {
    const technology = await adminService.updateTechnology(req.user!.sub, req.params.id, req.body);
    sendSuccess(res, { technology }, 'Technology updated');
  },
  async deleteTechnology(req: Request, res: Response): Promise<void> {
    await adminService.deleteTechnology(req.user!.sub, req.params.id);
    sendSuccess(res, null, 'Technology deleted');
  },
  async mergeTechnologies(req: Request, res: Response): Promise<void> {
    const result = await adminService.mergeTechnologies(req.user!.sub, req.body.sourceId, req.body.targetId);
    sendSuccess(res, result, 'Technologies merged');
  },

  // Audit log
  async auditLog(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await adminService.auditLog(page, pageSize);
    sendSuccess(res, { logs: result.logs }, 'Audit log', 200, result.meta);
  },
};
