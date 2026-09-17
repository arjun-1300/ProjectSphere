import { prisma } from '../../config/prisma.js';
import { ReportTargetType, ReportType } from '@prisma/client';
import { reportRepository } from './report.repository.js';
import { projectRepository } from '../project/project.repository.js';
import { commentRepository } from '../comment/comment.repository.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/AppError.js';

// A project auto-hides once it accumulates this many open reports.
const AUTO_HIDE_THRESHOLD = 3;

export const reportService = {
  async reportProject(reporterId: string, slug: string, reason: ReportType, details?: string) {
    const project = await projectRepository.findBySlugBasic(slug);
    if (!project) throw new NotFoundError('Project not found');
    if (project.authorId === reporterId) throw new BadRequestError('You cannot report your own project');

    const duplicate = await reportRepository.findDuplicate(reporterId, ReportTargetType.PROJECT, project.id);
    if (duplicate) throw new ConflictError('You have already reported this project');

    const report = await reportRepository.create({
      reporterId,
      targetType: ReportTargetType.PROJECT,
      targetId: project.id,
      reason,
      details,
    });

    // Auto-flag: hide the project once it crosses the open-report threshold.
    const openCount = await reportRepository.countOpenForTarget(ReportTargetType.PROJECT, project.id);
    if (openCount >= AUTO_HIDE_THRESHOLD) {
      await prisma.project.update({
        where: { id: project.id },
        data: { isHidden: true, moderatedAt: new Date() },
      });
    }

    return { report, autoHidden: openCount >= AUTO_HIDE_THRESHOLD };
  },

  async reportComment(reporterId: string, commentId: string, reason: ReportType, details?: string) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId === reporterId) throw new BadRequestError('You cannot report your own comment');

    const duplicate = await reportRepository.findDuplicate(reporterId, ReportTargetType.COMMENT, commentId);
    if (duplicate) throw new ConflictError('You have already reported this comment');

    const report = await reportRepository.create({
      reporterId,
      targetType: ReportTargetType.COMMENT,
      targetId: commentId,
      reason,
      details,
    });
    return { report };
  },
};
