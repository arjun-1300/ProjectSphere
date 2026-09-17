import { prisma } from '../../config/prisma.js';
import { commentRepository } from './comment.repository.js';
import { projectRepository } from '../project/project.repository.js';
import { notificationService } from '../notification/notification.service.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors/AppError.js';
import { cursorMeta, type CursorParams } from '../../shared/utils/pagination.js';
import type { Role } from '@prisma/client';

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Extract @usernames from text and resolve them to existing user ids. */
async function resolveMentions(content: string): Promise<string[]> {
  const matches = [...content.matchAll(/@([a-zA-Z0-9_]{3,30})/g)].map((m) => m[1]!.toLowerCase());
  const usernames = [...new Set(matches)];
  if (usernames.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { username: { in: usernames }, deletedAt: null },
    select: { id: true },
  });
  return users.map((u: { id: string }) => u.id);
}

async function actorName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, profile: { select: { name: true } } },
  });
  return u?.profile?.name ?? u?.username ?? 'Someone';
}

export const commentService = {
  async addComment(userId: string, slug: string, content: string) {
    const project = await projectRepository.findBySlugBasic(slug);
    if (!project || project.status !== 'PUBLISHED') throw new NotFoundError('Project not found');

    const mentionedUserIds = await resolveMentions(content);
    const comment = await commentRepository.create({
      projectId: project.id,
      authorId: userId,
      content,
      mentionedUserIds,
    });
    await projectRepository.adjustCounter(project.id, 'commentCount', 1);

    await notificationService.notifyComment(
      project.authorId,
      { id: userId, name: await actorName(userId) },
      project.slug,
      project.title,
    );
    return comment;
  },

  async addReply(userId: string, parentId: string, content: string) {
    const parent = await commentRepository.findById(parentId);
    if (!parent) throw new NotFoundError('Comment not found');
    if (parent.parentId) throw new BadRequestError('Replies are limited to a single level');

    const mentionedUserIds = await resolveMentions(content);
    const reply = await commentRepository.create({
      projectId: parent.projectId,
      authorId: userId,
      content,
      parentId: parent.id,
      mentionedUserIds,
    });
    await projectRepository.adjustCounter(parent.projectId, 'commentCount', 1);

    await notificationService.notifyReply(
      parent.authorId,
      { id: userId, name: await actorName(userId) },
      parent.project.slug,
    );
    return reply;
  },

  async edit(userId: string, commentId: string, content: string) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenError('You can only edit your own comments');
    if (Date.now() - comment.createdAt.getTime() > EDIT_WINDOW_MS) {
      throw new BadRequestError('The 15-minute edit window has passed');
    }
    const mentionedUserIds = await resolveMentions(content);
    return prisma.comment.update({
      where: { id: commentId },
      data: { content, mentionedUserIds, editedAt: new Date() },
      include: { author: { select: { id: true, username: true, profile: { select: { name: true, avatarUrl: true } } } } },
    });
  },

  /** Delete allowed for: comment author, project owner, or an admin. */
  async remove(userId: string, role: Role, commentId: string): Promise<void> {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    const isCommentAuthor = comment.authorId === userId;
    const isProjectOwner = comment.project.authorId === userId;
    const isAdmin = role === 'ADMIN';
    if (!isCommentAuthor && !isProjectOwner && !isAdmin) {
      throw new ForbiddenError('You are not allowed to delete this comment');
    }

    await commentRepository.softDelete(commentId);
    await projectRepository.adjustCounter(comment.projectId, 'commentCount', -1);
  },

  async list(slug: string, opts: CursorParams) {
    const project = await projectRepository.findBySlugBasic(slug);
    if (!project) throw new NotFoundError('Project not found');
    const rows = await commentRepository.listTopLevel(project.id, opts);
    const { items, meta } = cursorMeta(rows, opts.limit);
    return { comments: items, meta };
  },
};
