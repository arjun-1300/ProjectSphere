import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Link2, Github, Linkedin, UploadCloud, UserPlus, UserCheck, Pencil } from 'lucide-react';
import { profilesApi, type UpdateProfilePayload } from '@/lib/api/profiles';
import { projectsApi } from '@/lib/api/projects';
import { socialApi } from '@/lib/api/social';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { ProjectGrid } from '@/components/project/ProjectGrid';
import { EmptyState } from '@/components/ui/EmptyState';

export function ProfilePage() {
  const { username = '' } = useParams();
  const { status } = useAuth();
  const qc = useQueryClient();
  const key = ['profile', username];

  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: () => profilesApi.get(username) });
  const projects = useQuery({ queryKey: ['profile-projects', username], queryFn: () => projectsApi.listByUser(username, { limit: 12 }) });

  const follow = useMutation({
    mutationFn: () => socialApi.toggleFollow(username),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const [editing, setEditing] = useState(false);

  if (isLoading) return <Spinner label="loading profile" />;
  if (isError || !data) return <div className="container" style={{ padding: 60 }}><h2>Profile not found</h2></div>;

  const { user, profile, counts, isOwner, isFollowing } = data;

  return (
    <div>
      {/* cover band */}
      <div style={{ height: 150, background: profile.coverImageUrl ? `center/cover url(${profile.coverImageUrl})` : 'linear-gradient(120deg, var(--signal-wash), var(--paper-2))', borderBottom: '1px solid var(--line)' }} />
      <div className="container" style={{ paddingBottom: 40 }}>
        <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -40, gap: 16 }}>
          <div className="row gap-4" style={{ alignItems: 'flex-end' }}>
            <div style={{ border: '4px solid var(--paper)', borderRadius: '50%' }}>
              <Avatar name={profile.name ?? user.username} url={profile.avatarUrl} size={92} />
            </div>
            <div className="stack" style={{ paddingBottom: 6 }}>
              <h1 style={{ fontSize: 26 }}>{profile.name ?? `@${user.username}`}</h1>
              <span className="mono">@{user.username} · {user.role.toLowerCase()}{profile.openToWork ? '' : ''}</span>
              {profile.headline && <span className="soft" style={{ marginTop: 2 }}>{profile.headline}</span>}
            </div>
          </div>
          <div className="row gap-2" style={{ paddingBottom: 6 }}>
            {profile.openToWork && <Badge tone="signal">open to work</Badge>}
            {isOwner ? (
              <Button variant="secondary" size="sm" onClick={() => setEditing((v) => !v)}><Pencil size={14} /> {editing ? 'Close' : 'Edit profile'}</Button>
            ) : status === 'authenticated' ? (
              <Button variant={isFollowing ? 'secondary' : 'primary'} size="sm" loading={follow.isPending} onClick={() => follow.mutate()}>
                {isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
              </Button>
            ) : null}
          </div>
        </div>

        {/* stats */}
        <div className="row gap-6 mt-6 mono">
          <span><strong style={{ color: 'var(--ink)' }}>{counts.projectCount}</strong> projects</span>
          <span><strong style={{ color: 'var(--ink)' }}>{counts.followerCount}</strong> followers</span>
          <span><strong style={{ color: 'var(--ink)' }}>{counts.followingCount}</strong> following</span>
          <span>profile {profile.completionPercentage}% complete</span>
        </div>

        {editing && isOwner ? (
          <EditProfileForm profile={profile} onDone={() => { setEditing(false); qc.invalidateQueries({ queryKey: key }); }} />
        ) : (
          <>
            {profile.bio && <p className="soft mt-6" style={{ maxWidth: 680, whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}
            <div className="row wrap gap-4 mt-4 mono">
              {profile.location && <span className="row gap-1"><MapPin size={13} /> {profile.location}</span>}
              {profile.portfolioWebsite && <a className="link row gap-1" href={profile.portfolioWebsite} target="_blank" rel="noreferrer"><Link2 size={13} /> website</a>}
              {profile.githubUrl && <a className="link row gap-1" href={profile.githubUrl} target="_blank" rel="noreferrer"><Github size={13} /> github</a>}
              {profile.linkedinUrl && <a className="link row gap-1" href={profile.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={13} /> linkedin</a>}
            </div>
            {profile.skills.length > 0 && (
              <div className="row wrap gap-1 mt-4">{profile.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
            )}
          </>
        )}

        <hr className="divider-dashed mt-8" />
        <h2 style={{ fontSize: 20, margin: '24px 0 16px' }}>Projects</h2>
        {projects.isLoading ? <Spinner /> : (projects.data?.data.projects.length ?? 0) > 0 ? (
          <ProjectGrid projects={projects.data!.data.projects} />
        ) : (
          <EmptyState title="No public projects yet" />
        )}
      </div>
    </div>
  );
}

function EditProfileForm({ profile, onDone }: { profile: import('@/types/models').Profile; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<UpdateProfilePayload>({});
  const [avatar, setAvatar] = useState<File | null>(null);

  useEffect(() => {
    setForm({
      name: profile.name ?? '', headline: profile.headline ?? '', bio: profile.bio ?? '', location: profile.location ?? '',
      skills: profile.skills, portfolioWebsite: profile.portfolioWebsite ?? '', githubUrl: profile.githubUrl ?? '',
      linkedinUrl: profile.linkedinUrl ?? '', openToWork: profile.openToWork,
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (avatar) await profilesApi.uploadAvatar(avatar);
      return profilesApi.updateMine(form);
    },
    onSuccess: () => { toast('Profile saved', 'success'); onDone(); },
    onError: () => toast('Could not save profile', 'error'),
  });

  const set = (k: keyof UpdateProfilePayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card card-pad mt-6 stack gap-4">
      <div className="row gap-4 wrap">
        <Field label="Display name"><Input value={form.name ?? ''} onChange={set('name')} /></Field>
        <Field label="Headline"><Input value={form.headline ?? ''} onChange={set('headline')} placeholder="Full-stack engineer" /></Field>
      </div>
      <Field label="Bio"><Textarea value={form.bio ?? ''} onChange={set('bio')} /></Field>
      <div className="row gap-4 wrap">
        <Field label="Location"><Input value={form.location ?? ''} onChange={set('location')} /></Field>
        <Field label="Skills" hint="Comma-separated.">
          <Input value={(form.skills ?? []).join(', ')} onChange={(e) => setForm({ ...form, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        </Field>
      </div>
      <div className="row gap-4 wrap">
        <Field label="Website"><Input value={form.portfolioWebsite ?? ''} onChange={set('portfolioWebsite')} /></Field>
        <Field label="GitHub"><Input value={form.githubUrl ?? ''} onChange={set('githubUrl')} /></Field>
        <Field label="LinkedIn"><Input value={form.linkedinUrl ?? ''} onChange={set('linkedinUrl')} /></Field>
      </div>
      <div className="row gap-4 wrap" style={{ alignItems: 'center' }}>
        <label className="row gap-2 mono"><input type="checkbox" checked={!!form.openToWork} onChange={(e) => setForm({ ...form, openToWork: e.target.checked })} /> Open to work</label>
        <label className="btn btn-secondary btn-sm"><UploadCloud size={14} /> {avatar ? avatar.name : 'New avatar'}<input type="file" accept="image/*" hidden onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} /></label>
      </div>
      <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button loading={save.isPending} onClick={() => save.mutate()}>Save profile</Button>
      </div>
    </div>
  );
}
