import { slugify, generateUniqueSlug } from '../../src/shared/utils/slug.js';

describe('slugify', () => {
  it('lowercases, trims, and hyphenates', () => {
    expect(slugify('My Awesome Project!!')).toBe('my-awesome-project');
  });
  it('strips accents', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });
  it('collapses separators and trims edges', () => {
    expect(slugify('  --Hello___World--  ')).toBe('hello-world');
  });
});

describe('generateUniqueSlug', () => {
  it('returns the base slug when free', async () => {
    const slug = await generateUniqueSlug('New Project', async () => false);
    expect(slug).toBe('new-project');
  });
  it('appends a suffix on collision', async () => {
    const taken = new Set(['taken-title']);
    const slug = await generateUniqueSlug('Taken Title', async (s) => taken.has(s));
    expect(slug).not.toBe('taken-title');
    expect(slug.startsWith('taken-title-')).toBe(true);
  });
});
