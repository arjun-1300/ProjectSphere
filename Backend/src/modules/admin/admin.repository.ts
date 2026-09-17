import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';

export const adminRepository = {
  // ---------- Dashboard / stats ----------
  counts() {
    return prisma.$transaction([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.comment.count({ where: { deletedAt: null } }),
    ]);
  },

  usersCreatedSince(since: Date) {
    return prisma.user.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  projectsCreatedSince(since: Date) {
    return prisma.project.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  // ---------- Users ----------
  listUsers(where: Prisma.UserWhereInput, skip: number, take: number) {
    return prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBanned: true,
        isEmailVerified: true,
        createdAt: true,
        profile: { select: { name: true, avatarUrl: true } },
        _count: { select: { projects: true } },
      },
    });
  },

  countUsers(where: Prisma.UserWhereInput) {
    return prisma.user.count({ where });
  },

  findUser(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isBanned: true, username: true } });
  },

  setBanned(id: string, isBanned: boolean) {
    return prisma.user.update({ where: { id }, data: { isBanned }, select: { id: true, isBanned: true } });
  },

  setRole(id: string, role: Prisma.EnumRoleFieldUpdateOperationsInput) {
    return prisma.user.update({ where: { id }, data: { role }, select: { id: true, role: true } });
  },

  softDeleteUser(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  // ---------- Projects ----------
  listProjects(where: Prisma.ProjectWhereInput, skip: number, take: number) {
    return prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        isFeatured: true,
        isHidden: true,
        viewCount: true,
        likeCount: true,
        createdAt: true,
        author: { select: { id: true, username: true } },
      },
    });
  },

  countProjects(where: Prisma.ProjectWhereInput) {
    return prisma.project.count({ where });
  },

  findProject(id: string) {
    return prisma.project.findUnique({ where: { id }, select: { id: true, slug: true, isFeatured: true } });
  },

  setFeatured(id: string, isFeatured: boolean) {
    return prisma.project.update({
      where: { id },
      data: { isFeatured },
      select: { id: true, slug: true, title: true, isFeatured: true },
    });
  },

  setHidden(id: string, isHidden: boolean) {
    return prisma.project.update({
      where: { id },
      data: { isHidden, moderatedAt: new Date() },
      select: { id: true, isHidden: true },
    });
  },

  softDeleteProject(id: string) {
    return prisma.project.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } });
  },

  // ---------- Categories ----------
  createCategory(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  },
  updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  },
  deleteCategory(id: string) {
    return prisma.category.delete({ where: { id } });
  },
  listCategories() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { projects: true } } },
    });
  },

  // ---------- Technologies ----------
  createTechnology(data: Prisma.TechnologyCreateInput) {
    return prisma.technology.create({ data });
  },
  updateTechnology(id: string, data: Prisma.TechnologyUpdateInput) {
    return prisma.technology.update({ where: { id }, data });
  },
  deleteTechnology(id: string) {
    return prisma.technology.delete({ where: { id } });
  },
  listTechnologies() {
    return prisma.technology.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { projects: true } } },
    });
  },
  findTechnology(id: string) {
    return prisma.technology.findUnique({ where: { id }, select: { id: true, name: true } });
  },

  // ---------- Audit log ----------
  listAudit(skip: number, take: number) {
    return prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { admin: { select: { id: true, username: true } } },
    });
  },
  countAudit() {
    return prisma.adminAuditLog.count();
  },
};
