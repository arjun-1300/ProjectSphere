import type { Project } from '@/types/models';

export function TechChips({ project, max = 4 }: { project: Project; max?: number }) {
  const techs = (project.technologies ?? []).map((t) => t.technology.name);
  const shown = techs.slice(0, max);
  const extra = techs.length - shown.length;
  if (techs.length === 0) return null;
  return (
    <div className="row wrap gap-1">
      {shown.map((t) => <span key={t} className="chip">{t}</span>)}
      {extra > 0 && <span className="chip">+{extra}</span>}
    </div>
  );
}
