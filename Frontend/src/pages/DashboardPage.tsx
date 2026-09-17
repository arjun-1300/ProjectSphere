import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Eye, Heart, Bookmark, MessageSquare, Users, Boxes } from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { compact } from '@/lib/format';
import type { ReactNode } from 'react';

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: () => analyticsApi.dashboard() });

  if (isLoading) return <Spinner label="loading analytics" />;
  if (isError || !data) return <div className="container" style={{ padding: 40 }}><EmptyState title="Analytics unavailable" hint="Publish a project to start collecting views." /></div>;

  const { totals, topProject, growth, dailyViews } = data;
  const up = growth.growthPct >= 0;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="eyebrow">creator analytics</div>
      <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 22 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <Stat icon={<Boxes size={16} />} label="Projects" value={compact(totals.projects)} />
        <Stat icon={<Eye size={16} />} label="Total views" value={compact(totals.totalViews)} />
        <Stat icon={<Heart size={16} />} label="Likes" value={compact(totals.totalLikes)} />
        <Stat icon={<Bookmark size={16} />} label="Bookmarks" value={compact(totals.totalBookmarks)} />
        <Stat icon={<MessageSquare size={16} />} label="Comments" value={compact(totals.totalComments)} />
        <Stat icon={<Users size={16} />} label="Followers" value={compact(totals.followers)} />
      </div>

      <div className="card card-pad mt-6">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18 }}>Views · last 30 days</h2>
          <span className="mono row gap-1" style={{ color: up ? 'var(--grass)' : 'var(--rose)' }}>
            {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {up ? '+' : ''}{growth.growthPct}% vs prior 7d
          </span>
        </div>
        {dailyViews.length === 0 ? (
          <p className="muted mono">No view data yet.</p>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyViews} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a2bea" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#3a2bea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} stroke="#c3c2b8" />
                <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#c3c2b8" allowDecimals={false} />
                <Tooltip contentStyle={{ fontFamily: 'JetBrains Mono', fontSize: 12, borderRadius: 6, border: '1px solid #d9d8d0' }} />
                <Area type="monotone" dataKey="count" stroke="#3a2bea" strokeWidth={2} fill="url(#v)" name="views" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {topProject && (
        <div className="card card-pad mt-6 row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">top performer</div>
            <Link to={`/projects/${topProject.slug}`} className="link" style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{topProject.title}</Link>
          </div>
          <div className="row gap-6 mono">
            <span className="stack" style={{ alignItems: 'flex-end' }}><strong style={{ color: 'var(--ink)', fontSize: 18 }}>{compact(topProject.viewCount)}</strong> views</span>
            <span className="stack" style={{ alignItems: 'flex-end' }}><strong style={{ color: 'var(--ink)', fontSize: 18 }}>{compact(topProject.likeCount)}</strong> likes</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card card-pad stack gap-1">
      <span className="label row gap-1" style={{ color: 'var(--ink-faint)' }}>{icon} {label}</span>
      <strong style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>{value}</strong>
    </div>
  );
}
