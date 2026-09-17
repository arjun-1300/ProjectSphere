import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Boxes, Flag, MessageSquare, ArrowRight } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { Spinner } from '@/components/ui/Spinner';
import { compact } from '@/lib/format';
import type { ReactNode } from 'react';

export function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => adminApi.dashboard() });
  if (isLoading) return <Spinner label="loading admin" />;
  if (isError || !data) return <div className="container" style={{ padding: 40 }}><h2>Couldn't load admin dashboard</h2></div>;

  const { totals, series } = data;
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div><div className="eyebrow">admin · moderation</div><h1 style={{ fontSize: 28, marginTop: 8 }}>Control room</h1></div>
        <div className="row gap-2">
          <Link to="/admin/users" className="btn btn-secondary btn-sm">Users <ArrowRight size={14} /></Link>
          <Link to="/admin/reports" className="btn btn-secondary btn-sm">Reports <ArrowRight size={14} /></Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <Stat icon={<Users size={16} />} label="Users" value={compact(totals.totalUsers)} />
        <Stat icon={<Boxes size={16} />} label="Projects" value={compact(totals.totalProjects)} />
        <Stat icon={<Boxes size={16} />} label="Published" value={compact(totals.publishedProjects)} />
        <Stat icon={<MessageSquare size={16} />} label="Comments" value={compact(totals.totalComments)} />
        <Stat icon={<Flag size={16} />} label="Pending reports" value={compact(totals.pendingReports)} tone={totals.pendingReports > 0 ? 'var(--rose)' : undefined} />
      </div>

      <div className="card card-pad mt-6">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>New signups · 30 days</h2>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series.signups} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} stroke="#c3c2b8" />
              <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="#c3c2b8" allowDecimals={false} />
              <Tooltip contentStyle={{ fontFamily: 'JetBrains Mono', fontSize: 12, borderRadius: 6, border: '1px solid #d9d8d0' }} />
              <Bar dataKey="count" fill="#3a2bea" radius={[3, 3, 0, 0]} name="signups" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="card card-pad stack gap-1">
      <span className="label row gap-1">{icon} {label}</span>
      <strong style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: tone ?? 'var(--ink)' }}>{value}</strong>
    </div>
  );
}
