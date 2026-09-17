import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { discoveryApi } from '@/lib/api/discovery';
import { useAuth } from '@/auth/AuthContext';
import { ProjectGrid } from '@/components/project/ProjectGrid';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

type Feed = 'trending' | 'featured' | 'newest';

export function DiscoverPage() {
  const { status } = useAuth();
  const [feed, setFeed] = useState<Feed>('trending');

  const query = useQuery({
    queryKey: ['discover', feed],
    queryFn: async () => {
      if (feed === 'trending') return (await discoveryApi.trending({ pageSize: 12 })).data.projects;
      if (feed === 'featured') return (await discoveryApi.featured({ pageSize: 12 })).data.projects;
      return (await discoveryApi.newest({ limit: 12 })).data.projects;
    },
  });

  const recommended = useQuery({
    queryKey: ['discover', 'recommended'],
    queryFn: async () => (await discoveryApi.recommended({ limit: 4 })).projects,
    enabled: status === 'authenticated',
  });

  return (
    <>
      {/* Hero — the thesis: exhibited software. */}
      <section style={{ borderBottom: '1px solid var(--line)', background: 'color-mix(in srgb, var(--card) 55%, transparent)' }}>
        <div className="container" style={{ padding: '64px 24px 56px' }}>
          <div className="eyebrow">Index of shipped work · {new Date().getFullYear()}</div>
          <h1 style={{ fontSize: 'clamp(34px, 6vw, 60px)', maxWidth: 760, marginTop: 14, lineHeight: 1.02 }}>
            A gallery for the software you actually build.
          </h1>
          <p className="soft" style={{ fontSize: 17, maxWidth: 560, marginTop: 18 }}>
            Publish a project like a spec sheet — stack, screenshots, the problem it solves — and let
            recruiters and other builders find it.
          </p>
          <div className="row gap-3 mt-6 wrap">
            <Link to="/search" className="btn btn-primary">Explore projects <ArrowRight size={16} /></Link>
            <Link to={status === 'authenticated' ? '/projects/new' : '/register'} className="btn btn-secondary">
              {status === 'authenticated' ? 'Publish a project' : 'Start your portfolio'}
            </Link>
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 8 }}>
        {recommended.data && recommended.data.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 20 }}>Recommended for you</h2>
              <span className="mono">based on your stack</span>
            </div>
            <ProjectGrid projects={recommended.data} />
          </section>
        )}

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <h2 style={{ fontSize: 20 }}>Browse</h2>
        </div>
        <Tabs
          items={[{ key: 'trending', label: 'Trending' }, { key: 'featured', label: 'Featured' }, { key: 'newest', label: 'Newest' }]}
          active={feed}
          onChange={(k) => setFeed(k as Feed)}
        />
        <div style={{ marginTop: 22 }}>
          {query.isLoading ? (
            <Spinner label="loading projects" />
          ) : query.data && query.data.length > 0 ? (
            <ProjectGrid projects={query.data} ranked={feed === 'trending'} />
          ) : (
            <EmptyState title="Nothing here yet" hint="Be the first to publish in this feed." />
          )}
        </div>
      </div>
    </>
  );
}
