import { prisma } from '../../config/prisma.js';
import { socialRepository } from './social.repository.js';
import { projectRepository } from '../project/project.repository.js';
import { notificationService } from '../notification/notification.service.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';
import { cursorMeta, type CursorParams } from '../../shared/utils/pagination.js';

/** Resolve a user by username or throw 404. */
async function getUserByUsername(username: string) {
  const user = await prisma.user.findFirst({
    where: { username, deletedAt: null },
    select: { id: true, username: true, profile: { select: { name: true } } },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

async function actorName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, profile: { select: { name: true } } },
  });
  return u?.profile?.name ?? u?.username ?? 'Someone';
}

export const socialService = {
  /** Toggle a like on a project. Returns the new state and count. */
  async toggleLike(userId: string, slug: string) {
    const project = await projectRepository.findBySlugBasic(slug);
    if (!project || project.status !== 'PUBLISHED') throw new NotFoundError('Project not found');
    if (project.authorId === userId) throw new BadRequestError('You cannot like your own project');

    const existing = await socialRepository.findLike(userId, project.id);
    if (existing) {
      await socialRepository.deleteLike(userId, project.id);
      const updated = await projectRepository.adjustCounter(project.id, 'likeCount', -1);
      return { liked: false, likeCount: updated.likeCount as number };
    }

    await socialRepository.createLike(userId, project.id);
    const updated = await projectRepository.adjustCounter(project.id, 'likeCount', 1);
    // Notify the author (best-effort).
    await notificationService.notifyLike(
      project.authorId,
      { id: userId, name: await actorName(userId) },
      project.slug,
      project.title,
    );
    return { liked: true, likeCount: updated.likeCount as number };
  },

  /** Toggle a bookmark on a project. */
  async toggleBookmark(userId: string, slug: string) {
    const project = await projectRepository.findBySlugBasic(slug);
    if (!project || project.status !== 'PUBLISHED') throw new NotFoundError('Project not found');

    const existing = await socialRepository.findBookmark(userId, project.id);
    if (existing) {
      await socialRepository.deleteBookmark(userId, project.id);
      const updated = await projectRepository.adjustCounter(project.id, 'bookmarkCount', -1);
      return { bookmarked: false, bookmarkCount: updated.bookmarkCount as number };
    }
    await socialRepository.createBookmark(userId, project.id);
    const updated = await projectRepository.adjustCounter(project.id, 'bookmarkCount', 1);
    return { bookmarked: true, bookmarkCount: updated.bookmarkCount as number };
  },

  /** Toggle following a developer (by username). */
  async toggleFollow(followerId: string, username: string) {
    const target = await getUserByUsername(username);
    if (target.id === followerId) throw new BadRequestError('You cannot follow yourself');

    const existing = await socialRepository.findFollow(followerId, target.id);
    if (existing) {
      await socialRepository.deleteFollow(followerId, target.id);
      const followerCount = await socialRepository.followerCount(target.id);
      return { following: false, followerCount };
    }
    await socialRepository.createFollow(followerId, target.id);
    const followerCount = await socialRepository.followerCount(target.id);
    await notificationService.notifyFollow(target.id, { id: followerId, name: await actorName(followerId) });
    return { following: true, followerCount };
  },

  async listFollowers(username: string, opts: CursorParams) {
    const user = await getUserByUsername(username);
    const rows = await socialRepository.listFollowers(user.id, opts);
    const { items, meta } = cursorMeta<{ id: string; follower: unknown }>(rows, opts.limit);
    return { followers: items.map((f) => f.follower), meta };
  },

  async listFollowing(username: string, opts: CursorParams) {
    const user = await getUserByUsername(username);
    const rows = await socialRepository.listFollowing(user.id, opts);
    const { items, meta } = cursorMeta<{ id: string; following: unknown }>(rows, opts.limit);
    return { following: items.map((f) => f.following), meta };
  },

  /** Viewer's relationship to a project (used to enrich project detail). */
  async projectRelationship(viewerId: string | undefined, projectId: string, authorId: string) {
    if (!viewerId) return { isLiked: false, isBookmarked: false, isFollowingAuthor: false };
    const [like, bookmark, follow] = await Promise.all([
      socialRepository.findLike(viewerId, projectId),
      socialRepository.findBookmark(viewerId, projectId),
      viewerId === authorId ? Promise.resolve(null) : socialRepository.findFollow(viewerId, authorId),
    ]);
    return {
      isLiked: Boolean(like),
      isBookmarked: Boolean(bookmark),
      isFollowingAuthor: Boolean(follow),
    };
  },
};
