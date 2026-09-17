import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';
import { projectsApi, type CreateProjectPayload } from '@/lib/api/projects';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api/client';

interface FormValues {
  title: string;
  shortDescription: string;
  detailedDescription: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'DRAFT' | 'PUBLISHED';
  isOpenSource: boolean;
  technologies: string;
  tags: string;
  liveUrl: string;
  githubUrl: string;
  demoVideoUrl: string;
}

const csv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function ProjectEditorPage() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);
  const navigate = useNavigate();
  const toast = useToast();
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { difficulty: 'INTERMEDIATE', status: 'DRAFT', isOpenSource: false, technologies: '', tags: '', detailedDescription: '', liveUrl: '', githubUrl: '', demoVideoUrl: '' },
  });

  const existing = useQuery({ queryKey: ['project', slug], queryFn: () => projectsApi.get(slug!), enabled: isEdit });

  useEffect(() => {
    if (existing.data) {
      const p = existing.data.project;
      reset({
        title: p.title,
        shortDescription: p.shortDescription,
        detailedDescription: p.detailedDescription ?? '',
        difficulty: p.difficulty,
        status: p.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        isOpenSource: !!p.isOpenSource,
        technologies: (p.technologies ?? []).map((t) => t.technology.name).join(', '),
        tags: (p.tags ?? []).map((t) => t.tag.name).join(', '),
        liveUrl: p.liveUrl ?? '',
        githubUrl: p.githubUrl ?? '',
        demoVideoUrl: p.demoVideoUrl ?? '',
      });
    }
  }, [existing.data, reset]);

  async function onSubmit(v: FormValues) {
    setSaving(true);
    const payload: CreateProjectPayload = {
      title: v.title,
      shortDescription: v.shortDescription,
      detailedDescription: v.detailedDescription || undefined,
      difficulty: v.difficulty,
      status: v.status,
      isOpenSource: v.isOpenSource,
      technologies: csv(v.technologies),
      tags: csv(v.tags),
      liveUrl: v.liveUrl || undefined,
      githubUrl: v.githubUrl || undefined,
      demoVideoUrl: v.demoVideoUrl || undefined,
    };
    try {
      const targetSlug = isEdit
        ? (await projectsApi.update(slug!, payload)).project.slug
        : (await projectsApi.create(payload)).project.slug;
      if (cover) {
        try { await projectsApi.uploadCover(targetSlug, cover); } catch { toast('Project saved, but the cover upload failed.', 'error'); }
      }
      toast(isEdit ? 'Project updated' : 'Project created', 'success');
      navigate(`/projects/${targetSlug}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save project', 'error');
    } finally { setSaving(false); }
  }

  if (isEdit && existing.isLoading) return <Spinner label="loading project" />;

  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: 32, paddingBottom: 48 }}>
      <div className="eyebrow">{isEdit ? 'edit project' : 'new project'}</div>
      <h1 style={{ fontSize: 30, marginTop: 8, marginBottom: 22 }}>{isEdit ? 'Edit project' : 'Publish a project'}</h1>

      <form className="stack gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Title" error={errors.title && 'Title is required (min 3 chars).'}>
          <input className="input" placeholder="Offline-first note sync" {...register('title', { required: true, minLength: 3 })} />
        </Field>
        <Field label="One-line summary" error={errors.shortDescription && 'A short summary is required (min 10 chars).'} hint="Shown on cards and in search.">
          <input className="input" placeholder="CRDT-based notes that sync when you're back online" {...register('shortDescription', { required: true, minLength: 10 })} />
        </Field>
        <Field label="Detailed write-up" hint="Problem, approach, what you'd do differently. Plain text or markdown.">
          <textarea className="textarea" style={{ minHeight: 160 }} {...register('detailedDescription')} />
        </Field>

        <div className="row gap-4 wrap">
          <Field label="Difficulty"><select className="select" {...register('difficulty')}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></Field>
          <Field label="Visibility"><select className="select" {...register('status')}><option value="DRAFT">Draft (only you)</option><option value="PUBLISHED">Published</option></select></Field>
          <Field label="Open source">
            <label className="row gap-2 mono" style={{ height: 38 }}><input type="checkbox" {...register('isOpenSource')} /> Public repo</label>
          </Field>
        </div>

        <Field label="Tech stack" hint="Comma-separated. e.g. TypeScript, React, PostgreSQL">
          <input className="input" placeholder="TypeScript, React, PostgreSQL" {...register('technologies')} />
        </Field>
        <Field label="Tags" hint="Comma-separated discovery keywords.">
          <input className="input" placeholder="offline-first, crdt, sync" {...register('tags')} />
        </Field>

        <div className="row gap-4 wrap">
          <Field label="Live URL"><input className="input" {...register('liveUrl')} placeholder="https://" /></Field>
          <Field label="Source URL"><input className="input" {...register('githubUrl')} placeholder="https://github.com/..." /></Field>
        </div>
        <Field label="Demo video URL" hint="YouTube or Vimeo."><input className="input" {...register('demoVideoUrl')} placeholder="https://youtube.com/..." /></Field>

        <Field label="Cover image" hint="16:9 works best. Uploaded after the project saves.">
          <label className="btn btn-secondary" style={{ width: 'fit-content' }}>
            <UploadCloud size={15} /> {cover ? cover.name : 'Choose image'}
            <input type="file" accept="image/*" hidden onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </label>
        </Field>

        <hr className="divider-dashed mt-2" />
        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={saving}>{isEdit ? 'Save changes' : 'Publish project'}</Button>
        </div>
      </form>
    </div>
  );
}
