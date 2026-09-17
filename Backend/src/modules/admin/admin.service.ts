import { prisma } from '../../config/prisma.js';
import { Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { adminRepository } from './admin.repository.js';
import { reportRepository } from '../report/report.repository.js';
import { recordAudit } from './admin.audit.js';
import { slugify } from '../../shared/utils/slug.js';
import { pageArgs, pageMeta, type PageParams } from '../../shared/utils/pagination.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';
import type {
  UserListQuery,
  ProjectAdminListQuery,
  ReportListQuery,
} from './admin.schema.js';

const DAY_MS = 86_400_000;

function bucketDaily(rows: Array<{ createdAt: Date }>, from: Date, to: Date) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = r.createdAt.toISOString().slice(0, 10);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out: Array<{ date: string; count: number }> = [];
  const cur = new Date(from);
  while (cur <= to) {
    const k = cur.toISOString().slice(0, 10);
    out.push({ date: k, count: counts.get(k) ?? 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function growthPct(rows: Array<{ createdAt: Date }>): number {
  const now = Date.now();
  const last7 = rows.filter((r) => now - r.createdAt.getTime() <= 7 * DAY_MS).length;
  const prev7 = rows.filter((r) => {
    const age = now - r.createdAt.getTime();
    return age > 7 * DAY_MS && age <= 14 * DAY_MS;
  }).length;
  return prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : last7 > 0 ? 100 : 0;
}

export const adminService = {
  async dashboard() {
    const since = new Date(Date.now() - 29 * DAY_MS);
    const [counts, userRows, projectRows] = await Promise.all([
      adminRepository.counts(),
      adminRepository.usersCreatedSince(new Date(Date.now() - 14 * DAY_MS)),
      adminRepository.projectsCreatedSince(new Date(Date.now() - 14 * DAY_MS)),
    ]);
    const [totalUsers, totalProjects, publishedProjects, pendingReports, totalComments] = counts;

    const [signupsSeries, projectsSeries] = await Promise.all([
      adminRepository.usersCreatedSince(since),
      adminRepository.projectsCreatedSince(since),
    ]);
    const to = new Date();

    return {
      totals: { totalUsers, totalProjects, publishedProjects, pendingReports, totalComments },
      growth: {
        usersPct: growthPct(userRows),
        projectsPct: growthPct(projectRows),
      },
      series: {
        signups: bucketDaily(signupsSeries, since, to),
        projects: bucketDaily(projectsSeries, since, to),
      },
    };
  },

  // ---------- Users ----------
  async listUsers(query: UserListQuery) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.banned !== undefined ? { isBanned: query.banned } : {}),
      ...(query.q
        ? { OR: [{ username: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] }
        : {}),
    } as Prisma.UserWhereInput;

    const params: PageParams = { page: query.page, pageSize: query.pageSize };
    const { skip, take } = pageArgs(params);
    const [users, total] = await Promise.all([
      adminRepository.listUsers(where, skip, take),
      adminRepository.countUsers(where),
    ]);
    return { users, meta: pageMeta(total, params) };
  },

  async setBanned(adminId: string, userId: string, banned: boolean) {
    const user = await adminRepository.findUser(userId);
    if (!user) throw new NotFoundError('User not found');
    if (user.id === adminId) throw new BadRequestError('You cannot ban yourself');
    const result = await adminRepository.setBanned(userId, banned);
    await recordAudit(adminId, banned ? 'USER_BAN' : 'USER_UNBAN', { type: 'user', id: userId });
    return result;
  },

  async changeRole(adminId: string, userId: string, role: Role) {
    const user = await adminRepository.findUser(userId);
    if (!user) throw new NotFoundError('User not found');
    if (user.id === adminId && role !== Role.ADMIN) {
      throw new BadRequestError('You cannot demote yourself');
    }
    const result = await adminRepository.setRole(userId, role as Prisma.EnumRoleFieldUpdateOperationsInput);
    await recordAudit(adminId, 'USER_ROLE_CHANGE', { type: 'user', id: userId, metadata: { role } });
    return result;
  },

  async deleteUser(adminId: string, userId: string) {
    const user = await adminRepository.findUser(userId);
    if (!user) throw new NotFoundError('User not found');
    if (user.id === adminId) throw new BadRequestError('You cannot delete yourself');
    await adminRepository.softDeleteUser(userId);
    await recordAudit(adminId, 'USER_DELETE', { type: 'user', id: userId });
  },

  // ---------- Projects ----------
  async listProjects(query: ProjectAdminListQuery) {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.hidden !== undefined ? { isHidden: query.hidden } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    } as Prisma.ProjectWhereInput;

    const params: PageParams = { page: query.page, pageSize: query.pageSize };
    const { skip, take } = pageArgs(params);
    const [projects, total] = await Promise.all([
      adminRepository.listProjects(where, skip, take),
      adminRepository.countProjects(where),
    ]);
    return { projects, meta: pageMeta(total, params) };
  },

  async setFeatured(adminId: string, projectId: string, featured: boolean) {
    const project = await adminRepository.findProject(projectId);
    if (!project) throw new NotFoundError('Project not found');
    const result = await adminRepository.setFeatured(projectId, featured);
    await recordAudit(adminId, featured ? 'PROJECT_FEATURE' : 'PROJECT_UNFEATURE', { type: 'project', id: projectId });
    return result;
  },

  async deleteProject(adminId: string, projectId: string) {
    const project = await adminRepository.findProject(projectId);
    if (!project) throw new NotFoundError('Project not found');
    await adminRepository.softDeleteProject(projectId);
    await recordAudit(adminId, 'PROJECT_DELETE', { type: 'project', id: projectId });
  },

  // ---------- Reports ----------
  async listReports(query: ReportListQuery) {
    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { reason: query.type } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
    } as Prisma.ReportWhereInput;

    const params: PageParams = { page: query.page, pageSize: query.pageSize };
    const { skip, take } = pageArgs(params);
    const [reports, total] = await Promise.all([
      reportRepository.list(where, skip, take),
      reportRepository.count(where),
    ]);

    // Enrich each report with a light summary of its target.
    const projectIds = reports.filter((r: { targetType: string }) => r.targetType === 'PROJECT').map((r: { targetId: string }) => r.targetId);
    const commentIds = reports.filter((r: { targetType: string }) => r.targetType === 'COMMENT').map((r: { targetId: string }) => r.targetId);
    const [projects, comments] = await Promise.all([
      projectIds.length
        ? prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, slug: true, title: true, isHidden: true } })
        : Promise.resolve([]),
      commentIds.length
        ? prisma.comment.findMany({ where: { id: { in: commentIds } }, select: { id: true, content: true, projectId: true } })
        : Promise.resolve([]),
    ]);
    const projectMap = new Map((projects as Array<{ id: string }>).map((p) => [p.id, p]));
    const commentMap = new Map((comments as Array<{ id: string }>).map((c) => [c.id, c]));

    const enriched = reports.map((r: { targetType: string; targetId: string }) => ({
      ...r,
      target: r.targetType === 'PROJECT' ? projectMap.get(r.targetId) : commentMap.get(r.targetId),
    }));

    return { reports: enriched, meta: pageMeta(total, params) };
  },

  async resolveReport(
    adminId: string,
    reportId: string,
    data: { status: string; adminNotes?: string; action: string },
  ) {
    const report = await reportRepository.findById(reportId);
    if (!report) throw new NotFoundError('Report not found');

    // Apply the optional moderation action to the reported target.
    switch (data.action) {
      case 'HIDE_PROJECT':
        await adminRepository.setHidden(report.targetId, true);
        break;
      case 'UNHIDE_PROJECT':
        await adminRepository.setHidden(report.targetId, false);
        break;
      case 'DELETE_PROJECT':
        await adminRepository.softDeleteProject(report.targetId);
        break;
      case 'DELETE_COMMENT':
        await prisma.comment.update({ where: { id: report.targetId }, data: { deletedAt: new Date() } });
        break;
      default:
        break;
    }

    const updated = await reportRepository.updateStatus(reportId, {
      status: data.status,
      adminNotes: data.adminNotes,
    });
    await recordAudit(adminId, 'REPORT_RESOLVE', {
      type: 'report',
      id: reportId,
      metadata: { status: data.status, action: data.action },
    });
    return updated;
  },

  // ---------- Categories ----------
  async listCategories() {
    return adminRepository.listCategories();
  },
  async createCategory(adminId: string, input: { name: string; slug?: string; description?: string }) {
    const category = await adminRepository.createCategory({
      name: input.name,
      slug: input.slug ? slugify(input.slug) : slugify(input.name),
      description: input.description,
    });
    await recordAudit(adminId, 'CATEGORY_CREATE', { type: 'category', id: category.id });
    return category;
  },
  async updateCategory(adminId: string, id: string, input: { name?: string; slug?: string; description?: string }) {
    const category = await adminRepository.updateCategory(id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.slug ? { slug: slugify(input.slug) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    });
    await recordAudit(adminId, 'CATEGORY_UPDATE', { type: 'category', id });
    return category;
  },
  async deleteCategory(adminId: string, id: string) {
    await adminRepository.deleteCategory(id);
    await recordAudit(adminId, 'CATEGORY_DELETE', { type: 'category', id });
  },

  // ---------- Technologies ----------
  async listTechnologies() {
    return adminRepository.listTechnologies();
  },
  async createTechnology(adminId: string, input: { name: string; slug?: string; iconUrl?: string }) {
    const tech = await adminRepository.createTechnology({
      name: input.name,
      slug: input.slug ? slugify(input.slug) : slugify(input.name),
      iconUrl: input.iconUrl,
    });
    await recordAudit(adminId, 'TECH_CREATE', { type: 'technology', id: tech.id });
    return tech;
  },
  async updateTechnology(adminId: string, id: string, input: { name?: string; slug?: string; iconUrl?: string }) {
    const tech = await adminRepository.updateTechnology(id, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.slug ? { slug: slugify(input.slug) } : {}),
      ...(input.iconUrl !== undefined ? { iconUrl: input.iconUrl } : {}),
    });
    await recordAudit(adminId, 'TECH_UPDATE', { type: 'technology', id });
    return tech;
  },
  async deleteTechnology(adminId: string, id: string) {
    await adminRepository.deleteTechnology(id);
    await recordAudit(adminId, 'TECH_DELETE', { type: 'technology', id });
  },

  /** Merge a duplicate technology into a canonical one, moving all project links. */
  async mergeTechnologies(adminId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) throw new BadRequestError('Cannot merge a technology into itself');
    const [source, target] = await Promise.all([
      adminRepository.findTechnology(sourceId),
      adminRepository.findTechnology(targetId),
    ]);
    if (!source || !target) throw new NotFoundError('Technology not found');

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const links = await tx.projectTechnology.findMany({
        where: { technologyId: sourceId },
        select: { projectId: true },
      });
      if (links.length) {
        await tx.projectTechnology.createMany({
          data: links.map((l: { projectId: string }) => ({ projectId: l.projectId, technologyId: targetId })),
          skipDuplicates: true,
        });
        await tx.projectTechnology.deleteMany({ where: { technologyId: sourceId } });
      }
      await tx.technology.delete({ where: { id: sourceId } });
    });

    await recordAudit(adminId, 'TECH_MERGE', {
      type: 'technology',
      id: sourceId,
      metadata: { mergedInto: targetId },
    });
    return { merged: source.name, into: target.name };
  },

  // ---------- Audit log ----------
  async auditLog(page: number, pageSize: number) {
    const params: PageParams = { page, pageSize };
    const { skip, take } = pageArgs(params);
    const [logs, total] = await Promise.all([adminRepository.listAudit(skip, take), adminRepository.countAudit()]);
    return { logs, meta: pageMeta(total, params) };
  },
};
