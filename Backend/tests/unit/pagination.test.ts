import { cursorArgs, cursorMeta, pageArgs, pageMeta } from '../../src/shared/utils/pagination.js';

describe('cursor pagination', () => {
  it('fetches limit+1 and no cursor on first page', () => {
    expect(cursorArgs({ limit: 10 })).toEqual({ take: 11 });
  });
  it('includes cursor + skip when a cursor is given', () => {
    expect(cursorArgs({ cursor: 'abc', limit: 10 })).toEqual({ take: 11, cursor: { id: 'abc' }, skip: 1 });
  });
  it('derives hasMore and nextCursor', () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ id: `id${i}` }));
    const { items, meta } = cursorMeta(rows, 10);
    expect(items).toHaveLength(10);
    expect(meta.hasMore).toBe(true);
    expect(meta.nextCursor).toBe('id9');
  });
  it('reports no more when under limit', () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    const { meta } = cursorMeta(rows, 10);
    expect(meta.hasMore).toBe(false);
    expect(meta.nextCursor).toBeNull();
  });
});

describe('page pagination', () => {
  it('computes skip/take', () => {
    expect(pageArgs({ page: 3, pageSize: 12 })).toEqual({ skip: 24, take: 12 });
  });
  it('computes total pages and hasMore', () => {
    const meta = pageMeta(50, { page: 2, pageSize: 12 });
    expect(meta.totalPages).toBe(5);
    expect(meta.hasMore).toBe(true);
  });
});
