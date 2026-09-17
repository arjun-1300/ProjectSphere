import { Link } from 'react-router-dom';
import { Eye, Heart, MessageSquare, Star } from 'lucide-react';
import type { Project } from '@/types/models';
import { compact, difficultyLabel } from '@/lib/format';
import { TechChips } from './TechChips';

export function ProjectCard({ project, rank }: { project: Project; rank?: number }) {
  const cover = project.images?.find((i) => i.type === 'COVER')?.url;
  return (
    <Link to={`/projects/${project.slug}`} className="spec">
      <div className="spec-cover">
        {cover ? <img src={cover} alt="" loading="lazy" /> : (
          <div className="spec-cover-empty mono">{'{ }'}</div>
        )}
        {project.isFeatured && (
          <span className="badge badge-featured" style={{ position: 'absolute', top: 10, left: 10 }}>
            <Star size={11} /> featured
          </span>
        )}
      </div>

      <div className="spec-meta">
        {rank != null && <span className="rank">{String(rank).padStart(2, '0')}</span>}
        <span>{difficultyLabel[project.difficulty] ?? project.difficulty}</span>
        <span aria-hidden>·</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>/{project.slug}</span>
      </div>

      <div className="spec-body">
        <div className="spec-title">{project.title}</div>
        <div className="spec-desc">{project.shortDescription}</div>
        <div className="mt-2"><TechChips project={project} /></div>
        <div className="spec-foot">
          <span className="stat"><Eye size={13} /> {compact(project.viewCount)}</span>
          <span className="stat"><Heart size={13} /> {compact(project.likeCount)}</span>
          <span className="stat"><MessageSquare size={13} /> {compact(project.commentCount)}</span>
        </div>
      </div>
    </Link>
  );
}
