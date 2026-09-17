import type { Project } from '@/types/models';
import { ProjectCard } from './ProjectCard';

export function ProjectGrid({ projects, ranked }: { projects: Project[]; ranked?: boolean }) {
  return (
    <div className="grid-cards">
      {projects.map((p, i) => <ProjectCard key={p.id} project={p} rank={ranked ? i + 1 : undefined} />)}
    </div>
  );
}
