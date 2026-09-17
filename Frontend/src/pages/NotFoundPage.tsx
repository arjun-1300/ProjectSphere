import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container" style={{ padding: '90px 24px', textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 13, color: 'var(--ink-faint)' }}>HTTP 404 · route not found</div>
      <h1 style={{ fontSize: 'clamp(48px, 12vw, 120px)', marginTop: 8, letterSpacing: '-0.04em' }}>404</h1>
      <p className="soft" style={{ maxWidth: 420, margin: '8px auto 24px' }}>This page didn't compile. The project you're after may have moved or been unpublished.</p>
      <Link to="/" className="btn btn-primary">Back to Discover</Link>
    </div>
  );
}
