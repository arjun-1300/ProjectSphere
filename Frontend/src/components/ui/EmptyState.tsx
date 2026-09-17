import type { ReactNode } from 'react';

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty stack gap-3" style={{ alignItems: 'center' }}>
      <div className="stack gap-1" style={{ alignItems: 'center' }}>
        <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{title}</strong>
        {hint && <span className="mono">{hint}</span>}
      </div>
      {action}
    </div>
  );
}
