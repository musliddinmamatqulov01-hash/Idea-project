import { nanoid } from 'nanoid';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

export function uniqueSlug(input: string): string {
  const base = slugify(input) || 'item';
  return `${base}-${nanoid(6).toLowerCase()}`;
}
