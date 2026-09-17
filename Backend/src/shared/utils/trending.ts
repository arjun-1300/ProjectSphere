/**
 * Trending score for a project. Pure and dependency-free so it can be unit
 * tested and reused. Rewards engagement, decays with age:
 *
 *   score = likes×5 + views×1 + bookmarks×3 − age_days×2
 */
export interface TrendingInput {
  likeCount: number;
  viewCount: number;
  bookmarkCount: number;
  publishedAt?: Date | null;
  createdAt: Date;
}

const DAY_MS = 86_400_000;

export function trendingScore(p: TrendingInput, now: number = Date.now()): number {
  const published = p.publishedAt ?? p.createdAt;
  const ageDays = Math.max(0, (now - new Date(published).getTime()) / DAY_MS);
  return p.likeCount * 5 + p.viewCount * 1 + p.bookmarkCount * 3 - ageDays * 2;
}
