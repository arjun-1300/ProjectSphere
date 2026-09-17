export function Spinner({ label }: { label?: string }) {
  return (
    <div className="row gap-3" style={{ padding: 32, justifyContent: 'center', color: 'var(--ink-faint)' }}>
      <span className="spinner" />
      {label && <span className="mono">{label}</span>}
    </div>
  );
}
