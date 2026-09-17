import { trendingScore } from '../../src/shared/utils/trending.js';

describe('trending score', () => {
  const now = new Date('2025-01-31T00:00:00Z').getTime();
  const base = { likeCount: 0, viewCount: 0, bookmarkCount: 0, createdAt: new Date('2025-01-31T00:00:00Z') };

  it('applies the weighted formula (likes*5 + views*1 + bookmarks*3)', () => {
    const score = trendingScore({ ...base, likeCount: 10, viewCount: 100, bookmarkCount: 5 }, now);
    expect(score).toBe(10 * 5 + 100 + 5 * 3); // 165, age 0
  });

  it('decays with age (−2 per day)', () => {
    const old = { ...base, likeCount: 10, viewCount: 100, bookmarkCount: 5, publishedAt: new Date('2025-01-01T00:00:00Z') };
    const score = trendingScore(old, now);
    expect(score).toBe(165 - 30 * 2); // 30 days old → 105
  });

  it('ranks a fresh popular project above an identical old one', () => {
    const fresh = trendingScore({ ...base, likeCount: 5, viewCount: 50, bookmarkCount: 2, publishedAt: new Date('2025-01-31T00:00:00Z') }, now);
    const stale = trendingScore({ ...base, likeCount: 5, viewCount: 50, bookmarkCount: 2, publishedAt: new Date('2025-01-01T00:00:00Z') }, now);
    expect(fresh).toBeGreaterThan(stale);
  });
});
