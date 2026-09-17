import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { ProjectStatus } from '@/types/models';

export function Badge({ children, tone, className }: { children: ReactNode; tone?: string; className?: string }) {
  return <span className={cn('badge', tone && `badge-${tone}`, className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const tone = status === 'PUBLISHED' ? 'published' : status === 'ARCHIVED' ? 'hidden' : 'draft';
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}
