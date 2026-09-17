/**
 * Pagination helpers. Two strategies:
 *
 *  • Cursor (keyset) — for feeds/lists. Uses the row id as an opaque cursor with
 *    Prisma's native `cursor`/`skip`/`take`. O(1) regardless of depth, and
 *    stable under inserts. Preferred for infinite scroll.
 *
 *  • Page (offset) — for ranked results (search relevance, trending score) where
 *    the sort key isn't a stored unique column, so keyset can't be applied.
 */

// ----------------------------- Cursor -----------------------------

export interface CursorParams {
  cursor?: string;
  limit: number;
}

// Type alias (not interface) so it satisfies the Record<string, unknown> meta
// parameter of sendSuccess — object-literal type aliases carry an index signature.
export type CursorMeta = {
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
};

/** Build Prisma args for a keyset page. Always fetch limit+1 to detect "more". */
export function cursorArgs({ cursor, limit }: CursorParams): {
  take: number;
  cursor?: { id: string };
  skip?: number;
} {
  return {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}

/** Slice off the sentinel row and derive the next cursor from the results. */
export function cursorMeta<T extends { id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; meta: CursorMeta } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    meta: {
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      hasMore,
      count: items.length,
    },
  };
}

// ----------------------------- Page -----------------------------

export interface PageParams {
  page: number;
  pageSize: number;
}

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export function pageArgs({ page, pageSize }: PageParams): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function pageMeta(total: number, { page, pageSize }: PageParams): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page, pageSize, total, totalPages, hasMore: page < totalPages };
}
