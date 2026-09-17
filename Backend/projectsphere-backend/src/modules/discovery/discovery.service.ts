import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';
import { discoveryRepository } from './discovery.repository.js';
import { pageArgs, pageMeta, cursorMeta, type CursorParams } from '../../shared/utils/pagination.js';
import { trendingScore } from '../../shared/utils/trending.js';
import type { SearchQueryInput } from './discovery.schema.js';

// Candidate window size for in-app trending scoring.
const TRENDING_WINDOW = 300;

/** Convert free text into a Postgres tsquery ("react native" → "react & native"). */
function toTsQuery(q: string): string {
  const terms = q.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return terms.join(' & ');
}

function orderByForSort(sort: SearchQueryInput['sort'], ts: string): Prisma.ProjectOrderByWithRelationInput {
  switch (sort) {
    case 'newest':
      return { publishedAt: 'desc' };
    case 'most_viewed':
      return { viewCount: 'desc' };
    case 'most_liked':
      return { likeCount: 'desc' };
    case 'recently_updated':
      return { updatedAt: 'desc' };
    case 'relevance':
    default:
      return {
        _relevance: { fields: ['title', 'shortDescription', 'detailedDescription'], search: ts, sort: 'desc' },
      } as Prisma.ProjectOrderByWithRelationInput;
  }
}

interface TrendingRow {
  publishedAt: Date | null;
  createdAt: Date;
  likeCount: number;
  viewCount: number;
  bookmarkCount: number;
}

export const discoveryService = {
  async search(input: SearchQueryInput, userId?: string) {
    const ts = toTsQuery(input.q);
    // Record the search (fire-and-forget; never blocks results).
    void discoveryRepository.recordSearch(userId ?? null, input.q).catch(() => undefined);

    // A query of only symbols yields an empty tsquery → no matches.
    if (!ts) {
      return { projects: [], meta: pageMeta(0, { page: input.page, pageSize: input.pageSize }) };
    }

    const where: Prisma.ProjectWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      isHidden: false,
      ...(input.category ? { category: { slug: input.category } } : {}),
      ...(input.difficulty ? { difficulty: input.difficulty } : {}),
      ...(input.openSource !== undefined ? { isOpenSource: input.openSource } : {}),
      ...(input.tech
        ? { technologies: { some: { technology: { name: { equals: input.tech, mode: 'insensitive' } } } } }
        : {}),
      OR: [
        { title: { search: ts } },
        { shortDescription: { search: ts } },
        { detailedDescription: { search: ts } },
      ],
    } as Prisma.ProjectWhereInput;

    const { skip, take } = pageArgs({ page: input.page, pageSize: input.pageSize });
    const [projects, total] = await Promise.all([
      discoveryRepository.search(where, orderByForSort(input.sort, ts), skip, take),
      discoveryRepository.count(where),
    ]);
    return { projects, meta: pageMeta(total, { page: input.page, pageSize: input.pageSize }) };
  },

  autocomplete(q: string) {
    const terms = toTsQuery(q);
    if (!terms) return Promise.resolve([]);
    return discoveryRepository.autocomplete(q);
  },

  async trending(page: number, pageSize: number) {
    const candidates = await discoveryRepository.trendingCandidates(TRENDING_WINDOW);
    const now = Date.now();

    const scored = (candidates as Array<TrendingRow & Record<string, unknown>>)
      .map((p) => {
        const score = trendingScore(p, now);
        return { project: { ...p, trendingScore: Math.round(score) }, score };
      })
      .sort((a, b) => b.score - a.score);

    const total = scored.length;
    const { skip, take } = pageArgs({ page, pageSize });
    const projects = scored.slice(skip, skip + take).map((s) => s.project);
    return { projects, meta: pageMeta(total, { page, pageSize }) };
  },

  async featured(page: number, pageSize: number) {
    const { skip, take } = pageArgs({ page, pageSize });
    const [projects, total] = await Promise.all([
      discoveryRepository.featured(skip, take),
      discoveryRepository.featuredCount(),
    ]);
    return { projects, meta: pageMeta(total, { page, pageSize }) };
  },

  async newest(opts: CursorParams) {
    const rows = await discoveryRepository.newest(opts);
    const { items, meta } = cursorMeta(rows, opts.limit);
    return { projects: items, meta };
  },

  /** Recommend published projects overlapping the user's skills and liked tags. */
  async recommended(userId: string | undefined, limit: number) {
    if (!userId) return { projects: (await this.trending(1, limit)).projects };

    const [profile, liked] = await Promise.all([
      prisma.profile.findUnique({ where: { userId }, select: { skills: true } }),
      prisma.like.findMany({
        where: { userId },
        take: 30,
        select: {
          projectId: true,
          project: {
            select: {
              tags: { select: { tag: { select: { name: true } } } },
              technologies: { select: { technology: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    const skillNames: string[] = (profile?.skills as string[] | undefined) ?? [];
    const likedIds: string[] = [];
    const tagNames = new Set<string>();
    const techNames = new Set<string>(skillNames);

    for (const like of liked as Array<{
      projectId: string;
      project: { tags: Array<{ tag: { name: string } }>; technologies: Array<{ technology: { name: string } }> };
    }>) {
      likedIds.push(like.projectId);
      like.project.tags.forEach((t) => tagNames.add(t.tag.name));
      like.project.technologies.forEach((t) => techNames.add(t.technology.name));
    }

    // Nothing to base recommendations on → fall back to trending.
    if (techNames.size === 0 && tagNames.size === 0) {
      return { projects: (await this.trending(1, limit)).projects };
    }

    const where: Prisma.ProjectWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      isHidden: false,
      authorId: { not: userId },
      ...(likedIds.length ? { id: { notIn: likedIds } } : {}),
      OR: [
        { technologies: { some: { technology: { name: { in: [...techNames] } } } } },
        { tags: { some: { tag: { name: { in: [...tagNames] } } } } },
      ],
    } as Prisma.ProjectWhereInput;

    const projects = await discoveryRepository.recommended(where, limit);
    return { projects };
  },

  popularSearches(limit = 10) {
    return discoveryRepository.popularSearches(limit);
  },

  recentSearches(userId: string, limit = 10) {
    return discoveryRepository.recentSearches(userId, limit);
  },
};
