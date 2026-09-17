import { initials } from '@/lib/format';

export function Avatar({ name, url, size = 36 }: { name?: string | null; url?: string | null; size?: number }) {
  const fontSize = Math.round(size * 0.4);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize }}>
      {url ? <img src={url} alt={name ?? 'avatar'} /> : initials(name)}
    </span>
  );
}
