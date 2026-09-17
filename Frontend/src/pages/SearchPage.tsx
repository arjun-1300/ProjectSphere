import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { discoveryApi, type SearchParams } from '@/lib/api/discovery';
import { ProjectGrid } from '@/components/project/ProjectGrid';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';

const SORTS: { value: SearchParams['sort']; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'most_viewed', label: 'Most viewed' },
  { value: 'most_liked', label: 'Most liked' },
  { value: 'recently_updated', label: 'Recently updated' },
];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const difficulty = params.get('difficulty') ?? '';
  const sort = (params.get('sort') as SearchParams['sort']) ?? 'relevance';
  const page = Number(params.get('page') ?? 1);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.set('page', '1');
    setParams(next);
  };

  const query = useQuery({
    queryKey: ['search', q, difficulty, sort, page],
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
    queryFn: () =>
      discoveryApi.search({ q, difficulty: difficulty || undefined, sort, page, pageSize: 12 }),
  });

  const projects = query.data?.data.projects ?? [];
  const meta = query.data?.meta;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <div className="eyebrow">grep the index</div>
      <h1 style={{ fontSize: 30, marginTop: 8, marginBottom: 20 }}>Search projects</h1>

      <form className="row gap-2 wrap" onSubmit={(e) => { e.preventDefault(); update({ q: draft }); }}>
        <div className="row grow" style={{ position: 'relative', minWidth: 260 }}>
          <SearchIcon size={16} style={{ position: 'absolute', left: 11, color: 'var(--ink-faint)' }} />
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. react native offline sync" style={{ paddingLeft: 34 }} />
        </div>
        <Select value={difficulty} onChange={(e) => update({ difficulty: e.target.value })} style={{ width: 160 }}>
          <option value="">Any difficulty</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </Select>
        <Select value={sort} onChange={(e) => update({ sort: e.target.value })} style={{ width: 180 }}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Button type="submit">Search</Button>
      </form>

      <div style={{ marginTop: 26 }}>
        {!q.trim() ? (
          <EmptyState title="Search the catalog" hint="Full-text across titles, descriptions, and tech." />
        ) : query.isLoading ? (
          <Spinner label="searching" />
        ) : projects.length === 0 ? (
          <EmptyState title={`No matches for "${q}"`} hint="Try broader terms or clear the filters." />
        ) : (
          <>
            <div className="mono" style={{ marginBottom: 14 }}>{meta?.total ?? projects.length} result(s) · page {meta?.page} / {meta?.totalPages}</div>
            <ProjectGrid projects={projects} />
            {meta && meta.totalPages > 1 && (
              <div className="row gap-2 mt-8" style={{ justifyContent: 'center' }}>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Prev</Button>
                <span className="mono">{page} / {meta.totalPages}</span>
                <Button variant="secondary" size="sm" disabled={!meta.hasMore} onClick={() => update({ page: String(page + 1) })}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
