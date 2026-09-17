import { prisma } from '../../config/prisma.js';
import type { Prisma, ReportTargetType, ReportType } from '@prisma/client';

// Reports still "open" (counted toward the auto-hide threshold).
const OPEN_STATUSES = ['PENDING', 'REVIEWED'];

export const reportRepository = {
  findDuplicate(reporterId: string, targetType: ReportTargetType, targetId: string) {
    return prisma.report.findUnique({
      where: { reporterId_targetType_targetId: { reporterId, targetType, targetId } },
    });
  },

  create(data: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportType;
    details?: string | null;
  }) {
    return prisma.report.create({ data });
  },

  countOpenForTarget(targetType: ReportTargetType, targetId: string) {
    return prisma.report.count({
      where: { targetType, targetId, status: { in: OPEN_STATUSES as Prisma.EnumReportStatusFilter[] } },
    });
  },

  list(where: Prisma.ReportWhereInput, skip: number, take: number) {
    return prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        reporter: { select: { id: true, username: true } },
      },
    });
  },

  count(where: Prisma.ReportWhereInput) {
    return prisma.report.count({ where });
  },

  findById(id: string) {
    return prisma.report.findUnique({ where: { id } });
  },

  updateStatus(id: string, data: { status: string; adminNotes?: string | null }) {
    return prisma.report.update({
      where: { id },
      data: {
        status: data.status as Prisma.EnumReportStatusFieldUpdateOperationsInput,
        adminNotes: data.adminNotes,
        reviewedAt: new Date(),
      },
    });
  },
};
