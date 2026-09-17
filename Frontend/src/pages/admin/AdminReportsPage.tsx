import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/format';
import type { ReportRow } from '@/types/models';

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'REVIEWED', label: 'Reviewed' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'DISMISSED', label: 'Dismissed' },
];

export function AdminReportsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState('PENDING');
  const key = ['admin', 'reports', status];
  const { data, isLoading } = useQuery({
    queryKey: key,
    placeholderData: keepPreviousData,
    queryFn: () => adminApi.reports({ status, pageSize: 30 }),
  });
  const reports = data?.data.reports ?? [];

  const resolve = useMutation({
    mutationFn: (v: { id: string; status: string; action?: string }) => adminApi.resolveReport(v.id, { status: v.status, action: v.action }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'reports'] }); toast('Report handled', 'success'); },
    onError: () => toast('Action failed', 'error'),
  });

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="eyebrow"><Link className="link" to="/admin">admin</Link> / reports</div>
      <h1 style={{ fontSize: 28, margin: '8px 0 18px' }}>Moderation queue</h1>

      <Tabs items={STATUS_TABS} active={status} onChange={setStatus} />

      <div className="mt-6">
        {isLoading ? <Spinner /> : reports.length === 0 ? (
          <EmptyState title={`No ${status.toLowerCase()} reports`} hint="Nothing to review here." />
        ) : (
          <div className="stack gap-3">
            {reports.map((r) => <ReportCard key={r.id} report={r} onAction={(action, newStatus) => resolve.mutate({ id: r.id, status: newStatus, action })} pending={resolve.isPending} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, onAction, pending }: { report: ReportRow; onAction: (action: string, status: string) => void; pending: boolean }) {
  const [action, setAction] = useState('NONE');
  const target = report.target;
  return (
    <div className="card card-pad">
      <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
        <div className="row gap-2">
          <Badge tone="hidden">{report.reason}</Badge>
          <Badge>{report.targetType.toLowerCase()}</Badge>
          <span className="mono">{timeAgo(report.createdAt)} · by @{report.reporter.username}</span>
        </div>
        <Badge tone={report.status === 'PENDING' ? 'signal' : undefined}>{report.status.toLowerCase()}</Badge>
      </div>

      <div className="mt-4" style={{ borderLeft: '2px solid var(--line)', paddingLeft: 12 }}>
        {report.targetType === 'PROJECT' && target?.slug ? (
          <Link to={`/projects/${target.slug}`} className="link" style={{ fontWeight: 500 }}>{target.title ?? target.slug}</Link>
        ) : (
          <p className="soft" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{target?.content ?? '[target unavailable]'}</p>
        )}
        {report.details && <p className="mono mt-2" style={{ marginBottom: 0 }}>reporter note: {report.details}</p>}
      </div>

      {report.status === 'PENDING' && (
        <div className="row wrap gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
          <Select value={action} onChange={(e) => setAction(e.target.value)} style={{ width: 190 }}>
            <option value="NONE">No action</option>
            {report.targetType === 'PROJECT' && <option value="HIDE_PROJECT">Hide project</option>}
            {report.targetType === 'PROJECT' && <option value="DELETE_PROJECT">Delete project</option>}
            {report.targetType === 'COMMENT' && <option value="DELETE_COMMENT">Delete comment</option>}
          </Select>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => onAction('NONE', 'DISMISSED')}>Dismiss</Button>
          <Button size="sm" loading={pending} onClick={() => onAction(action, 'RESOLVED')}>Resolve</Button>
        </div>
      )}
    </div>
  );
}
