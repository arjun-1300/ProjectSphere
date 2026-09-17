import { AnalyticsEventType } from '@prisma/client';
import { analyticsRepository } from './analytics.repository.js';
import { projectRepository } from '../project/project.repository.js';
import { socialRepository } from '../social/social.repository.js';
import { hashToken } from '../../shared/utils/tokens.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/AppError.js';
import type { AnalyticsRange, TrackEventInput } from './analytics.schema.js';

const DAY_MS = 86_400_000;

function defaultRange(range: AnalyticsRange): { from: Date; to: Date } {
  const to = range.to ?? new Date();
  const from = range.from ?? new Date(to.getTime() - 29 * DAY_MS);
  return { from, to };
}

/** Bucket events into per-day counts, filling empty days with zero. */
function bucketDaily(events: Array<{ createdAt: Date }>, from: Date, to: Date): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: Array<{ date: string; count: number }> = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

async function assertOwnedProject(userId: string, slug: string) {
  const project = await projectRepository.findBySlugBasic(slug);
  if (!project) throw new NotFoundError('Project not found');
  if (project.authorId !== userId) throw new ForbiddenError('You do not own this project');
  return project;
}

export const analyticsService = {
  /** Track an event, deduplicated per visitor per day. */
  async track(input: TrackEventInput, viewerKey: string, userId?: string) {
    const project = await projectRepository.findBySlugBasic(input.slug);
    if (!project || project.status !== 'PUBLISHED') throw new NotFoundError('Project not found');

    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = hashToken(`${input.type}:${project.id}:${viewerKey}:${day}`);

    const alreadyCounted = await analyticsRepository.existsByHash(visitorHash);
    if (alreadyCounted) return { counted: false };

    await analyticsRepository.createEvent({
      type: input.type as AnalyticsEventType,
      projectId: project.id,
      userId: userId ?? null,
      visitorHash,
    });

    // Only PROJECT_VIEW bumps the denormalized counter shown on cards.
    if (input.type === 'PROJECT_VIEW') {
      await analyticsRepository.incrementProjectView(project.id);
    }
    return { counted: true };
  },

  async projectAnalytics(userId: string, slug: string, rangeInput: AnalyticsRange) {
    const project = await assertOwnedProject(userId, slug);
    const { from, to } = defaultRange(rangeInput);
    const dateFilter = { createdAt: { gte: from, lte: to } };

    const [views, uniqueVisitors, demoClicks, githubClicks, viewEvents, full] = await Promise.all([
      analyticsRepository.count({ projectId: project.id, type: AnalyticsEventType.PROJECT_VIEW, ...dateFilter }),
      analyticsRepository.uniqueVisitors({ projectId: project.id, type: AnalyticsEventType.PROJECT_VIEW, ...dateFilter }),
      analyticsRepository.count({ projectId: project.id, type: AnalyticsEventType.DEMO_CLICK, ...dateFilter }),
      analyticsRepository.count({ projectId: project.id, type: AnalyticsEventType.GITHUB_CLICK, ...dateFilter }),
      analyticsRepository.eventsForSeries({ projectId: project.id, type: AnalyticsEventType.PROJECT_VIEW, ...dateFilter }),
      projectRepository.findById(project.id),
    ]);

    const ratio = (n: number) => (views > 0 ? Math.round((n / views) * 1000) / 10 : 0); // one-decimal %

    return {
      project: { slug: project.slug, title: project.title },
      range: { from, to },
      totals: {
        views,
        uniqueVisitors,
        demoClicks,
        githubClicks,
        demoCTR: ratio(demoClicks),
        githubCTR: ratio(githubClicks),
        likes: full?.likeCount ?? 0,
        bookmarks: full?.bookmarkCount ?? 0,
        comments: full?.commentCount ?? 0,
      },
      dailyViews: bucketDaily(viewEvents as Array<{ createdAt: Date }>, from, to),
    };
  },

  async dashboard(userId: string) {
    const { from, to } = defaultRange({});
    const [counters, followerCount, topProject, projectIds] = await Promise.all([
      analyticsRepository.sumCounters(userId),
      socialRepository.followerCount(userId),
      analyticsRepository.topProject(userId),
      analyticsRepository.userProjectIds(userId),
    ]);

    // 30-day view growth across all of the user's projects.
    const viewEvents = projectIds.length
      ? await analyticsRepository.eventsForSeries({
          projectId: { in: projectIds },
          type: AnalyticsEventType.PROJECT_VIEW,
          createdAt: { gte: from, lte: to },
        })
      : [];

    const dailyViews = bucketDaily(viewEvents as Array<{ createdAt: Date }>, from, to);
    const last7 = dailyViews.slice(-7).reduce((s, d) => s + d.count, 0);
    const prev7 = dailyViews.slice(-14, -7).reduce((s, d) => s + d.count, 0);
    const growthPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : last7 > 0 ? 100 : 0;

    return {
      totals: {
        projects: counters._count ?? 0,
        totalViews: counters._sum.viewCount ?? 0,
        totalLikes: counters._sum.likeCount ?? 0,
        totalBookmarks: counters._sum.bookmarkCount ?? 0,
        totalComments: counters._sum.commentCount ?? 0,
        followers: followerCount,
      },
      topProject,
      growth: { last7Days: last7, previous7Days: prev7, growthPct },
      dailyViews,
    };
  },
};
