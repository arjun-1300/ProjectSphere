import { prisma } from '../../config/prisma.js';
import { cursorArgs, type CursorParams } from '../../shared/utils/pagination.js';

const authorSelect = {
  select: { id: true, username: true, profile: { select: { name: true, avatarUrl: true } } },
};

export const commentRepository = {
  create(data: {
    projectId: string;
    authorId: string;
    content: string;
    parentId?: string | null;
    mentionedUserIds?: string[];
  }) {
    return prisma.comment.create({ data, include: { author: authorSelect } });
  },

  findById(id: string) {
    return prisma.comment.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: authorSelect,
        project: { select: { id: true, slug: true, title: true, authorId: true } },
      },
    });
  },

  /** Top-level comments (parentId null) with their replies inlined. */
  listTopLevel(projectId: string, opts: CursorParams) {
    return prisma.comment.findMany({
      where: { projectId, parentId: null, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        author: authorSelect,
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: { author: authorSelect },
        },
      },
      ...cursorArgs(opts),
    });
  },

  update(id: string, content: string) {
    return prisma.comment.update({
      where: { id },
      data: { content, editedAt: new Date() },
      include: { author: authorSelect },
    });
  },

  softDelete(id: string) {
    return prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  countByProject(projectId: string) {
    return prisma.comment.count({ where: { projectId, deletedAt: null } });
  },
};
