import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, CornerDownRight } from 'lucide-react';
import { commentsApi } from '@/lib/api/comments';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { timeAgo } from '@/lib/format';
import type { Comment } from '@/types/models';

export function CommentsSection({ slug, projectAuthorId }: { slug: string; projectAuthorId?: string }) {
  const { user, status } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [body, setBody] = useState('');

  const key = ['comments', slug];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => commentsApi.list(slug, { limit: 30 }) });
  const comments = data?.data.comments ?? [];

  const add = useMutation({
    mutationFn: (content: string) => commentsApi.add(slug, content),
    onSuccess: () => { setBody(''); qc.invalidateQueries({ queryKey: key }); },
    onError: () => toast('Could not post comment', 'error'),
  });

  const canDelete = (c: Comment) => user && (c.author.id === user.id || user.role === 'ADMIN' || projectAuthorId === user.id);

  return (
    <section id="comments" style={{ marginTop: 40 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 20 }}>Discussion</h2>
        <span className="mono">{comments.length} thread(s)</span>
      </div>

      {status === 'authenticated' ? (
        <form className="stack gap-2" onSubmit={(e) => { e.preventDefault(); if (body.trim()) add.mutate(body.trim()); }}>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share feedback, ask how something works, use @username to mention." />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="submit" size="sm" loading={add.isPending} disabled={!body.trim()}>Post comment</Button>
          </div>
        </form>
      ) : (
        <div className="empty"><Link className="link" to="/login">Log in</Link> to join the discussion.</div>
      )}

      <div className="stack gap-4 mt-6">
        {isLoading ? <Spinner label="loading comments" /> : comments.length === 0 ? (
          <p className="muted mono">No comments yet — start the thread.</p>
        ) : comments.map((c) => (
          <CommentNode key={c.id} slug={slug} comment={c} canDelete={!!canDelete(c)} refetchKey={key} />
        ))}
      </div>
    </section>
  );
}

function CommentNode({ slug, comment, canDelete, refetchKey }: { slug: string; comment: Comment; canDelete: boolean; refetchKey: unknown[] }) {
  const { status } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: refetchKey });
  const addReply = useMutation({
    mutationFn: (content: string) => commentsApi.reply(comment.id, content),
    onSuccess: () => { setReply(''); setReplying(false); invalidate(); },
    onError: () => toast('Could not post reply', 'error'),
  });
  const remove = useMutation({
    mutationFn: () => commentsApi.remove(comment.id),
    onSuccess: invalidate,
    onError: () => toast('Could not delete', 'error'),
  });

  return (
    <div className="card card-pad">
      <CommentHead comment={comment} canDelete={canDelete} onDelete={() => remove.mutate()} />
      <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{comment.content}</p>

      <div className="row gap-3 mt-2">
        {status === 'authenticated' && <button className="btn btn-ghost btn-sm" onClick={() => setReplying((v) => !v)}><CornerDownRight size={13} /> Reply</button>}
      </div>

      {replying && (
        <form className="stack gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) addReply.mutate(reply.trim()); }}>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to @${comment.author.username}`} style={{ minHeight: 68 }} />
          <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setReplying(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={addReply.isPending} disabled={!reply.trim()}>Reply</Button>
          </div>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="stack gap-3 mt-4" style={{ borderLeft: '2px solid var(--line)', paddingLeft: 14 }}>
          {comment.replies.map((r) => (
            <div key={r.id}>
              <CommentHead comment={r} canDelete={false} />
              <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{r.content}</p>
            </div>
          ))}
        </div>
      )}
      {/* Suppress unused-var lint for slug (kept for future per-comment routing). */}
      <span hidden>{slug}</span>
    </div>
  );
}

function CommentHead({ comment, canDelete, onDelete }: { comment: Comment; canDelete: boolean; onDelete?: () => void }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <div className="row gap-2">
        <Avatar name={comment.author.profile?.name ?? comment.author.username} url={comment.author.profile?.avatarUrl} size={26} />
        <Link to={`/u/${comment.author.username}`} className="link" style={{ fontWeight: 500 }}>@{comment.author.username}</Link>
        <span className="mono">{timeAgo(comment.createdAt)}{comment.editedAt ? ' · edited' : ''}</span>
      </div>
      {canDelete && onDelete && (
        <button className="btn btn-ghost btn-icon" onClick={onDelete} aria-label="Delete comment"><Trash2 size={14} /></button>
      )}
    </div>
  );
}
