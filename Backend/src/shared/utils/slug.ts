import { nanoid } from 'nanoid';

/** Convert arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Generate a unique slug for `title`, using `exists` to check the store. On
 * collision it appends a short nanoid so URLs stay readable but never clash.
 */
export async function generateUniqueSlug(
  title: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(title) || 'project';
  if (!(await exists(base))) return base;

  // Try a few short suffixes before falling back to a longer one.
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${nanoid(6).toLowerCase()}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base}-${nanoid(12).toLowerCase()}`;
}
