import { prisma } from '../../config/prisma.js';
import type { Prisma, AnalyticsEventType } from '@prisma/client';

export const analyticsRepository = {
  createEvent(data: {
    type: AnalyticsEventType;
    projectId?: string | null;
    userId?: string | null;
    visitorHash?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.analyticsEvent.create({ data });
  },

  existsByHash(visitorHash: string) {
    return prisma.analyticsEvent.findFirst({ where: { visitorHash }, select: { id: true } });
  },

  count(where: Prisma.AnalyticsEventWhereInput) {
    return prisma.analyticsEvent.count({ where });
  },

  async uniqueVisitors(where: Prisma.AnalyticsEventWhereInput) {
    const rows = await prisma.analyticsEvent.groupBy({ by: ['visitorHash'], where });
    return rows.length;
  },

  /** Raw events (createdAt only) for building daily time-series buckets in-app. */
  eventsForSeries(where: Prisma.AnalyticsEventWhereInput) {
    return prisma.analyticsEvent.findMany({
      where,
      select: { createdAt: true, type: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  userProjectIds(userId: string) {
    return prisma.project
      .findMany({ where: { authorId: userId, deletedAt: null }, select: { id: true } })
      .then((rows: Array<{ id: string }>) => rows.map((r) => r.id));
  },

  /** All-time aggregate counters across a user's projects. */
  sumCounters(userId: string) {
    return prisma.project.aggregate({
      where: { authorId: userId, deletedAt: null },
      _sum: { viewCount: true, likeCount: true, bookmarkCount: true, commentCount: true },
      _count: true,
    });
  },

  topProject(userId: string) {
    return prisma.project.findFirst({
      where: { authorId: userId, deletedAt: null, status: 'PUBLISHED' },
      orderBy: { viewCount: 'desc' },
      select: { id: true, slug: true, title: true, viewCount: true, likeCount: true },
    });
  },

  incrementProjectView(projectId: string) {
    return prisma.project.update({
      where: { id: projectId },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });
  },
};
