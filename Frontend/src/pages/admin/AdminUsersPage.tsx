import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Search, Ban, ShieldCheck } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/format';
import type { Role } from '@/types/models';

export function AdminUsersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [role, setRole] = useState<'' | Role>('');
  const [page, setPage] = useState(1);
  const key = ['admin', 'users', q, role, page];

  const { data, isLoading } = useQuery({
    queryKey: key,
    placeholderData: keepPreviousData,
    queryFn: () => adminApi.users({ q: q || undefined, role: role || undefined, page, pageSize: 20 }),
  });
  const users = data?.data.users ?? [];
  const meta = data?.meta;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  const ban = useMutation({ mutationFn: (v: { id: string; banned: boolean }) => adminApi.banUser(v.id, v.banned), onSuccess: () => { invalidate(); toast('User updated', 'success'); }, onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Failed', 'error') });
  const changeRole = useMutation({ mutationFn: (v: { id: string; role: Role }) => adminApi.changeRole(v.id, v.role), onSuccess: () => { invalidate(); toast('Role changed', 'success'); }, onError: () => toast('Failed', 'error') });

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="eyebrow"><Link className="link" to="/admin">admin</Link> / users</div>
      <h1 style={{ fontSize: 28, margin: '8px 0 20px' }}>Users</h1>

      <form className="row gap-2 wrap" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(draft); }}>
        <div className="row grow" style={{ position: 'relative', minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 11, color: 'var(--ink-faint)' }} />
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search username or email" style={{ paddingLeft: 34 }} />
        </div>
        <Select value={role} onChange={(e) => { setPage(1); setRole(e.target.value as '' | Role); }} style={{ width: 160 }}>
          <option value="">All roles</option><option value="DEVELOPER">Developer</option><option value="RECRUITER">Recruiter</option><option value="ADMIN">Admin</option>
        </Select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      <div className="card mt-6" style={{ overflow: 'hidden' }}>
        {isLoading ? <Spinner /> : users.length === 0 ? <EmptyState title="No users match" /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr className="mono" style={{ textAlign: 'left', color: 'var(--ink-faint)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>User</th>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Role</th>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Projects</th>
                <th style={{ padding: '12px 14px', fontWeight: 500 }}>Joined</th>
                <th style={{ padding: '12px 14px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <Link to={`/u/${u.username}`} className="link" style={{ fontWeight: 500 }}>@{u.username}</Link>
                    <div className="mono">{u.email}</div>
                    {u.isBanned && <Badge tone="hidden">banned</Badge>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select className="select" style={{ width: 130, padding: '5px 8px' }} value={u.role} onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value as Role })}>
                      <option value="DEVELOPER">Developer</option><option value="RECRUITER">Recruiter</option><option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px' }} className="mono">{u._count.projects}</td>
                  <td style={{ padding: '10px 14px' }} className="mono">{timeAgo(u.createdAt)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {u.isBanned ? (
                      <Button variant="secondary" size="sm" onClick={() => ban.mutate({ id: u.id, banned: false })}><ShieldCheck size={13} /> Unban</Button>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => ban.mutate({ id: u.id, banned: true })}><Ban size={13} /> Ban</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="row gap-2 mt-6" style={{ justifyContent: 'center' }}>
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="mono">{page} / {meta.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={!meta.hasMore} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
