import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';
import { projectDetailInclude } from '../project/project.repository.js';
import { cursorArgs, type CursorParams } from '../../shared/utils/pagination.js';

export const discoveryRepository = {
  search(where: Prisma.ProjectWhereInput, orderBy: Prisma.ProjectOrderByWithRelationInput, skip: number, take: number) {
    return prisma.project.findMany({ where, orderBy, skip, take, include: projectDetailInclude });
  },

  count(where: Prisma.ProjectWhereInput) {
    return prisma.project.count({ where });
  },

  /** Prefix autocomplete over published project titles. */
  autocomplete(q: string) {
    return prisma.project.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        isHidden: false,
        title: { startsWith: q, mode: 'insensitive' },
      },
      select: { id: true, slug: true, title: true },
      orderBy: { viewCount: 'desc' },
      take: 5,
    });
  },

  featured(skip: number, take: number) {
    return prisma.project.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, isHidden: false, isFeatured: true },
      orderBy: { publishedAt: 'desc' },
      skip,
      take,
      include: projectDetailInclude,
    });
  },

  featuredCount() {
    return prisma.project.count({ where: { status: 'PUBLISHED', deletedAt: null, isFeatured: true } });
  },

  newest(opts: CursorParams) {
    return prisma.project.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, isHidden: false },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      include: projectDetailInclude,
      ...cursorArgs(opts),
    });
  },

  /** Recent published projects used as the candidate window for trending scoring. */
  trendingCandidates(limit: number) {
    return prisma.project.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, isHidden: false },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: projectDetailInclude,
    });
  },

  recommended(where: Prisma.ProjectWhereInput, take: number) {
    return prisma.project.findMany({
      where,
      orderBy: [{ likeCount: 'desc' }, { publishedAt: 'desc' }],
      take,
      include: projectDetailInclude,
    });
  },

  // ---- Search history ----
  recordSearch(userId: string | null, query: string) {
    return prisma.searchQuery.create({ data: { userId, query } });
  },

  async popularSearches(limit: number) {
    const rows = await prisma.searchQuery.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });
    return rows.map((r: { query: string; _count: { query: number } }) => ({
      query: r.query,
      count: r._count.query,
    }));
  },

  async recentSearches(userId: string, limit: number) {
    // Most recent distinct queries for this user.
    const rows = await prisma.searchQuery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { query: true, createdAt: true },
      take: 50,
    });
    const seen = new Set<string>();
    const distinct: string[] = [];
    for (const r of rows as Array<{ query: string }>) {
      if (!seen.has(r.query)) {
        seen.add(r.query);
        distinct.push(r.query);
      }
      if (distinct.length >= limit) break;
    }
    return distinct;
  },
};
