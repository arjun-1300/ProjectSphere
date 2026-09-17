import type { ReactNode } from 'react';

export function AuthLayout({ title, subtitle, children, foot }: { title: string; subtitle?: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="container" style={{ maxWidth: 420, padding: '56px 24px' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>ProjectSphere / access</div>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>{title}</h1>
      {subtitle && <p className="soft" style={{ marginTop: 0, marginBottom: 22 }}>{subtitle}</p>}
      <div className="card card-pad">{children}</div>
      {foot && <div className="mono" style={{ textAlign: 'center', marginTop: 16 }}>{foot}</div>}
    </div>
  );
}
