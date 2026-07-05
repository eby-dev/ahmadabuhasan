/**
 * SEO helpers.
 * - `truncateDescription` keeps meta descriptions within Google's ~155 char limit.
 * - `absoluteUrl` resolves a relative path against the site origin.
 * - `PERSON_ID`, `WEBSITE_ID` are the canonical JSON-LD @id values.
 */

import { SITE } from '@/config/site';

export const PERSON_ID = `${SITE.url}/#person`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export function truncateDescription(text: string, max = 155): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const sliced = trimmed.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const cutoff = lastSpace > 0 ? lastSpace : max - 1;
  return `${sliced.slice(0, cutoff).replace(/[,.;:]$/, '')}…`;
}

export function absoluteUrl(pathname: string, base: string = SITE.url): string {
  return new URL(pathname, base).toString();
}
