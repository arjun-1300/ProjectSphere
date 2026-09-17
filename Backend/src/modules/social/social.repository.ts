import { prisma } from '../../config/prisma.js';
import { cursorArgs, type CursorParams } from '../../shared/utils/pagination.js';

export const socialRepository = {
  // ---- Likes ----
  findLike(userId: string, projectId: string) {
    return prisma.like.findUnique({ where: { userId_projectId: { userId, projectId } } });
  },
  createLike(userId: string, projectId: string) {
    return prisma.like.create({ data: { userId, projectId } });
  },
  deleteLike(userId: string, projectId: string) {
    return prisma.like.delete({ where: { userId_projectId: { userId, projectId } } });
  },

  // ---- Bookmarks ----
  findBookmark(userId: string, projectId: string) {
    return prisma.bookmark.findUnique({ where: { userId_projectId: { userId, projectId } } });
  },
  createBookmark(userId: string, projectId: string) {
    return prisma.bookmark.create({ data: { userId, projectId } });
  },
  deleteBookmark(userId: string, projectId: string) {
    return prisma.bookmark.delete({ where: { userId_projectId: { userId, projectId } } });
  },

  // ---- Follows ----
  findFollow(followerId: string, followingId: string) {
    return prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
  },
  createFollow(followerId: string, followingId: string) {
    return prisma.follow.create({ data: { followerId, followingId } });
  },
  deleteFollow(followerId: string, followingId: string) {
    return prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
  },
  followerCount(userId: string) {
    return prisma.follow.count({ where: { followingId: userId } });
  },
  followingCount(userId: string) {
    return prisma.follow.count({ where: { followerId: userId } });
  },

  listFollowers(userId: string, opts: CursorParams) {
    return prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        follower: {
          select: { id: true, username: true, profile: { select: { name: true, avatarUrl: true, headline: true } } },
        },
      },
      ...cursorArgs(opts),
    });
  },

  listFollowing(userId: string, opts: CursorParams) {
    return prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        following: {
          select: { id: true, username: true, profile: { select: { name: true, avatarUrl: true, headline: true } } },
        },
      },
      ...cursorArgs(opts),
    });
  },
};
