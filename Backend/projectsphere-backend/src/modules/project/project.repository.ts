import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';
import { cursorArgs, type CursorParams } from '../../shared/utils/pagination.js';

/** Standard relations returned with a full project view. */
const projectDetailInclude = {
  author: {
    select: { id: true, username: true, profile: { select: { name: true, avatarUrl: true, headline: true } } },
  },
  category: true,
  technologies: { include: { technology: true } },
  tags: { include: { tag: true } },
  images: { orderBy: { position: 'asc' } },
} satisfies Prisma.ProjectInclude;

export const projectRepository = {
  slugExists(slug: string): Promise<boolean> {
    return prisma.project.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);
  },

  create(data: Prisma.ProjectCreateInput) {
    return prisma.project.create({ data, include: projectDetailInclude });
  },

  /** Full detail view by slug (excludes soft-deleted). */
  findBySlug(slug: string) {
    return prisma.project.findFirst({
      where: { slug, deletedAt: null },
      include: projectDetailInclude,
    });
  },

  /** Lightweight lookup for ownership/notification checks. */
  findBySlugBasic(slug: string) {
    return prisma.project.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, slug: true, title: true, authorId: true, status: true },
    });
  },

  findById(id: string) {
    return prisma.project.findFirst({ where: { id, deletedAt: null }, include: projectDetailInclude });
  },

  update(id: string, data: Prisma.ProjectUpdateInput) {
    return prisma.project.update({ where: { id }, data, include: projectDetailInclude });
  },

  softDelete(id: string) {
    return prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  },

  listByAuthor(authorId: string, opts: CursorParams & { status?: string; includeDeleted?: boolean }) {
    return prisma.project.findMany({
      where: {
        authorId,
        ...(opts.includeDeleted ? {} : { deletedAt: null }),
        ...(opts.status ? { status: opts.status as Prisma.EnumProjectStatusFilter } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: projectDetailInclude,
      ...cursorArgs(opts),
    });
  },

  countByAuthor(authorId: string, onlyPublished = true) {
    return prisma.project.count({
      where: { authorId, deletedAt: null, ...(onlyPublished ? { status: 'PUBLISHED' } : {}) },
    });
  },

  /** Atomically adjust a denormalized counter (likeCount, viewCount, …). */
  adjustCounter(projectId: string, field: 'likeCount' | 'bookmarkCount' | 'commentCount' | 'viewCount', delta: number) {
    return prisma.project.update({
      where: { id: projectId },
      data: { [field]: { increment: delta } },
      select: { [field]: true },
    });
  },

  // ---- Project images ----
  addImage(data: Prisma.ProjectImageUncheckedCreateInput) {
    return prisma.projectImage.create({ data });
  },

  findImage(id: string) {
    return prisma.projectImage.findUnique({ where: { id } });
  },

  deleteImage(id: string) {
    return prisma.projectImage.delete({ where: { id } });
  },

  listImages(projectId: string, type?: string) {
    return prisma.projectImage.findMany({
      where: { projectId, ...(type ? { type: type as Prisma.EnumProjectImageTypeFilter } : {}) },
      orderBy: { position: 'asc' },
    });
  },

  setImagePosition(id: string, position: number) {
    return prisma.projectImage.update({ where: { id }, data: { position } });
  },

  maxGalleryPosition(projectId: string) {
    return prisma.projectImage.aggregate({
      where: { projectId, type: 'GALLERY' },
      _max: { position: true },
    });
  },
};

export { projectDetailInclude };
