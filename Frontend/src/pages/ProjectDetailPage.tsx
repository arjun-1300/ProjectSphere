import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Bookmark, Github, ExternalLink, PlayCircle, Flag, Pencil, Eye, UserPlus, UserCheck } from 'lucide-react';
import { projectsApi } from '@/lib/api/projects';
import { socialApi } from '@/lib/api/social';
import { analyticsApi } from '@/lib/api/analytics';
import { reportsApi } from '@/lib/api/reports';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { CommentsSection } from '@/components/project/CommentsSection';
import { compact, difficultyLabel, timeAgo } from '@/lib/format';
import { ApiError } from '@/lib/api/client';
import type { ReportReason } from '@/types/models';

export function ProjectDetailPage() {
  const { slug = '' } = useParams();
  const { user, status } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['project', slug];
  const viewed = useRef(false);

  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: () => projectsApi.get(slug) });

  // Fire-and-forget view tracking once per mount.
  useEffect(() => {
    if (data && !viewed.current) {
      viewed.current = true;
      analyticsApi.track('PROJECT_VIEW', slug).catch(() => undefined);
    }
  }, [data, slug]);

  const like = useMutation({
    mutationFn: () => socialApi.toggleLike(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Could not like', 'error'),
  });
  const bookmark = useMutation({
    mutationFn: () => socialApi.toggleBookmark(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: () => toast('Could not bookmark', 'error'),
  });
  const follow = useMutation({
    mutationFn: (username: string) => socialApi.toggleFollow(username),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: () => toast('Could not update follow', 'error'),
  });

  if (isLoading) return <Spinner label="loading project" />;
  if (isError || !data) return <div className="container" style={{ padding: 60 }}><h2>Project not found</h2><p className="muted">It may be a draft, hidden, or removed.</p><Link className="link" to="/">Back to Discover</Link></div>;

  const { project: p, viewerRelationship: rel } = data;
  const isOwner = user?.id === p.author?.id;
  const cover = p.images?.find((i) => i.type === 'COVER')?.url;
  const gallery = p.images?.filter((i) => i.type === 'GALLERY') ?? [];
  const architecture = p.images?.find((i) => i.type === 'ARCHITECTURE');
  const techs = (p.technologies ?? []).map((t) => t.technology.name);

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      {/* header */}
      <div className="row wrap gap-2" style={{ marginBottom: 6 }}>
        <StatusBadge status={p.status} />
        {p.isFeatured && <Badge tone="featured">featured</Badge>}
        {p.isHidden && <Badge tone="hidden">hidden</Badge>}
        <span className="mono">{difficultyLabel[p.difficulty]} · /{p.slug} · {timeAgo(p.publishedAt ?? p.createdAt)}</span>
      </div>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', maxWidth: 720 }}>{p.title}</h1>
          <p className="soft" style={{ fontSize: 16, maxWidth: 680, marginTop: 10 }}>{p.shortDescription}</p>
        </div>
        {isOwner && <Link to={`/projects/${slug}/edit`} className="btn btn-secondary btn-sm"><Pencil size={14} /> Edit</Link>}
      </div>

      {/* author + actions */}
      <div className="row wrap gap-4 mt-6" style={{ justifyContent: 'space-between' }}>
        <div className="row gap-3">
          <Avatar name={p.author?.profile?.name ?? p.author?.username} url={p.author?.profile?.avatarUrl} size={44} />
          <div className="stack">
            <Link to={`/u/${p.author?.username}`} className="link" style={{ fontWeight: 600 }}>{p.author?.profile?.name ?? `@${p.author?.username}`}</Link>
            <span className="mono">@{p.author?.username}{p.author?.profile?.headline ? ` · ${p.author.profile.headline}` : ''}</span>
          </div>
          {status === 'authenticated' && !isOwner && p.author && (
            <Button variant={rel.isFollowingAuthor ? 'secondary' : 'primary'} size="sm" loading={follow.isPending} onClick={() => follow.mutate(p.author!.username)}>
              {rel.isFollowingAuthor ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
            </Button>
          )}
        </div>
        <div className="row wrap gap-2">
          <Button variant={rel.isLiked ? 'primary' : 'secondary'} size="sm" loading={like.isPending} onClick={() => (status === 'authenticated' ? like.mutate() : toast('Log in to like', 'error'))}>
            <Heart size={15} fill={rel.isLiked ? 'currentColor' : 'none'} /> {compact(p.likeCount)}
          </Button>
          <Button variant={rel.isBookmarked ? 'primary' : 'secondary'} size="sm" loading={bookmark.isPending} onClick={() => (status === 'authenticated' ? bookmark.mutate() : toast('Log in to bookmark', 'error'))}>
            <Bookmark size={15} fill={rel.isBookmarked ? 'currentColor' : 'none'} /> {compact(p.bookmarkCount)}
          </Button>
          <span className="btn btn-secondary btn-sm" style={{ cursor: 'default' }}><Eye size={15} /> {compact(p.viewCount)}</span>
        </div>
      </div>

      {/* cover */}
      <div className="card mt-6" style={{ overflow: 'hidden', padding: 0 }}>
        {cover ? <img src={cover} alt="" style={{ width: '100%', display: 'block' }} /> : (
          <div className="spec-cover" style={{ aspectRatio: '21/9' }}><div className="spec-cover-empty mono">no cover image</div></div>
        )}
      </div>

      {/* external links */}
      <div className="row wrap gap-2 mt-4">
        {p.liveUrl && <a className="btn btn-secondary btn-sm" href={p.liveUrl} target="_blank" rel="noreferrer" onClick={() => analyticsApi.track('DEMO_CLICK', slug).catch(() => {})}><ExternalLink size={15} /> Live demo</a>}
        {p.githubUrl && <a className="btn btn-secondary btn-sm" href={p.githubUrl} target="_blank" rel="noreferrer" onClick={() => analyticsApi.track('GITHUB_CLICK', slug).catch(() => {})}><Github size={15} /> Source</a>}
        {p.demoVideoUrl && <a className="btn btn-secondary btn-sm" href={p.demoVideoUrl} target="_blank" rel="noreferrer"><PlayCircle size={15} /> Video</a>}
        <div className="grow" />
        {status === 'authenticated' && !isOwner && <ReportButton slug={slug} />}
      </div>

      {/* two-column: body + spec sidebar */}
      <div className="mt-8" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 28, alignItems: 'start' }}>
        <div>
          {p.detailedDescription ? (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{p.detailedDescription}</div>
          ) : <p className="muted">No detailed write-up yet.</p>}

          {architecture && (
            <div className="mt-8">
              <div className="eyebrow" style={{ marginBottom: 10 }}>Architecture</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}><img src={architecture.url} alt="architecture diagram" style={{ width: '100%', display: 'block' }} /></div>
            </div>
          )}

          {gallery.length > 0 && (
            <div className="mt-8">
              <div className="eyebrow" style={{ marginBottom: 10 }}>Screens</div>
              <div className="grid-cards">
                {gallery.map((g) => <div key={g.id} className="card" style={{ padding: 0, overflow: 'hidden' }}><img src={g.url} alt="" style={{ width: '100%', display: 'block' }} /></div>)}
              </div>
            </div>
          )}
        </div>

        {/* spec sidebar */}
        <aside className="card card-pad stack gap-4" style={{ position: 'sticky', top: 76 }}>
          <SpecRow label="Difficulty" value={difficultyLabel[p.difficulty]} />
          {p.category && <SpecRow label="Category" value={p.category.name} />}
          <SpecRow label="Open source" value={p.isOpenSource ? 'Yes' : 'No'} />
          <SpecRow label="Comments" value={String(p.commentCount)} />
          <div className="stack gap-2">
            <span className="label">Stack</span>
            <div className="row wrap gap-1">{techs.length ? techs.map((t) => <span key={t} className="chip">{t}</span>) : <span className="muted">—</span>}</div>
          </div>
        </aside>
      </div>

      <CommentsSection slug={slug} projectAuthorId={p.author?.id} />
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', borderBottom: '1px dashed var(--line)', paddingBottom: 8 }}>
      <span className="label">{label}</span>
      <span className="mono" style={{ color: 'var(--ink)' }}>{value ?? '—'}</span>
    </div>
  );
}

function ReportButton({ slug }: { slug: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');
  const report = useMutation({
    mutationFn: () => reportsApi.reportProject(slug, reason, details || undefined),
    onSuccess: () => { setOpen(false); toast('Report submitted — thanks for flagging.', 'success'); },
    onError: (e) => toast(e instanceof ApiError ? e.message : 'Could not report', 'error'),
  });
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}><Flag size={14} /> Report</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Report this project">
        <div className="stack gap-4">
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
              <option value="SPAM">Spam</option>
              <option value="FAKE">Fake / plagiarized</option>
              <option value="ABUSE">Abuse</option>
              <option value="COPYRIGHT">Copyright</option>
              <option value="INAPPROPRIATE">Inappropriate</option>
            </Select>
          </Field>
          <Field label="Details (optional)"><Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What's wrong with this project?" /></Field>
          <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={report.isPending} onClick={() => report.mutate()}>Submit report</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
