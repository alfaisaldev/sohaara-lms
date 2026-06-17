export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(text: string, suffix?: string): string {
  const base = slugify(text);
  if (!suffix) return base;
  return `${base}-${suffix}`;
}
