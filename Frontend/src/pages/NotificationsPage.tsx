import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Trash2, Heart, MessageSquare, UserPlus, Star, Megaphone } from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/format';
import type { NotificationItem } from '@/types/models';

const ICON: Record<NotificationItem['type'], React.ReactNode> = {
  LIKE: <Heart size={15} />, COMMENT: <MessageSquare size={15} />, REPLY: <MessageSquare size={15} />,
  FOLLOW: <UserPlus size={15} />, FEATURED: <Star size={15} />, ADMIN_MESSAGE: <Megaphone size={15} />,
};

export function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const key = ['notifications', 'list'];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => notificationsApi.list({ limit: 40 }) });
  const items = data?.data.notifications ?? [];
  const unread = (data?.meta.unreadCount as number | undefined) ?? 0;

  const invalidate = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['notifications', 'unread'] }); };
  const markAll = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: invalidate });
  const markOne = useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => notificationsApi.remove(id), onSuccess: invalidate });

  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: 32, paddingBottom: 40 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div className="eyebrow">inbox</div>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>Notifications</h1>
        </div>
        {unread > 0 && <Button variant="secondary" size="sm" loading={markAll.isPending} onClick={() => markAll.mutate()}><Check size={14} /> Mark all read</Button>}
      </div>

      {isLoading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="You're all caught up" hint="Likes, comments, and follows will show up here." />
      ) : (
        <div className="stack gap-2">
          {items.map((n) => (
            <div
              key={n.id}
              className="card card-pad row gap-3"
              style={{ cursor: n.link ? 'pointer' : 'default', borderColor: n.isRead ? 'var(--line)' : 'var(--signal)', background: n.isRead ? 'var(--card)' : 'var(--signal-wash)' }}
              onClick={() => { if (!n.isRead) markOne.mutate(n.id); if (n.link) navigate(n.link); }}
            >
              <span style={{ color: 'var(--signal)' }}>{ICON[n.type]}</span>
              <div className="grow">
                <div>{n.message}{n.aggregatedCount && n.aggregatedCount > 1 ? <span className="mono"> +{n.aggregatedCount - 1} others</span> : null}</div>
                <span className="mono">{timeAgo(n.createdAt)}</span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); remove.mutate(n.id); }} aria-label="Delete"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <p className="mono mt-6"><Link className="link" to="/dashboard">View your project analytics →</Link></p>
    </div>
  );
}
