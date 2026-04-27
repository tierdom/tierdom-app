import { eq } from 'drizzle-orm';
import { db } from './db';
import { siteSetting } from './db/schema';
import { createKeyedCache } from './keyed-cache';
import { renderMarkdown } from './markdown';

/**
 * Hard cap on a single site_setting value. Generous for markdown but
 * bounded so a runaway edit can't bloat every page render.
 */
export const MAX_SITE_CONTENT_BYTES = 16 * 1024;

export class SiteContentTooLargeError extends Error {
  constructor(
    readonly byteLength: number,
    readonly maxBytes: number
  ) {
    super(`Content is ${byteLength} bytes, exceeds the ${maxBytes} byte limit`);
    this.name = 'SiteContentTooLargeError';
  }
}

/**
 * Registry of generic site-wide content blocks the admin can edit.
 * Each entry defines the admin label, a one-line description, and the
 * markdown fallback used when no row exists in `site_setting`.
 * Adding a new block = one entry here + (for now) a consumer somewhere.
 */
export const siteContentBlocks = {
  footer: {
    title: 'Footer',
    description: 'Markdown shown in the site-wide footer',
    fallback: `Tierdom — Self-hosted tier lists. A project by [Jeroen Heijmans](https://jeroenheijmans.nl).

[Source on GitHub](https://github.com/tierdom/tierdom-app)`
  }
} as const satisfies Record<string, { title: string; description: string; fallback: string }>;

export type SiteContentKey = keyof typeof siteContentBlocks;

export function isSiteContentKey(key: string): key is SiteContentKey {
  return key in siteContentBlocks;
}

export type SiteContentRecord = {
  value: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type CachedEntry = {
  record: SiteContentRecord;
  html: string;
};

/**
 * In-process cache. site_setting is low-cardinality and the footer is
 * loaded on every public request — caching avoids both the DB hit and
 * the markdown render/sanitize pipeline. Writes go through this module,
 * so every mutation invalidates its key locally. Single-process app,
 * so no distributed invalidation needed.
 */
const cache = createKeyedCache<SiteContentKey, CachedEntry>(async (key) => {
  const [row] = await db.select().from(siteSetting).where(eq(siteSetting.key, key)).limit(1);
  const record: SiteContentRecord = {
    value: row?.value ?? null,
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null
  };
  const effective = record.value?.trim() ? record.value : siteContentBlocks[key].fallback;
  return { record, html: renderMarkdown(effective) };
});

/** Test-only reset hook. Not used by the app at runtime. */
export function _resetSiteContentCacheForTests(): void {
  cache.clear();
}

/**
 * Drop every cached site-content entry. Call after a bulk write (e.g. an
 * import) that bypasses setSiteContent/clearSiteContent.
 */
export function invalidateAllSiteContent(): void {
  cache.clear();
}

export async function getSiteContentRecord(key: SiteContentKey): Promise<SiteContentRecord> {
  return (await cache.get(key)).record;
}

export async function getSiteContentHtml(key: SiteContentKey): Promise<string> {
  return (await cache.get(key)).html;
}

export async function setSiteContent(key: SiteContentKey, value: string): Promise<void> {
  const byteLength = new TextEncoder().encode(value).length;
  if (byteLength > MAX_SITE_CONTENT_BYTES) {
    throw new SiteContentTooLargeError(byteLength, MAX_SITE_CONTENT_BYTES);
  }
  await db
    .insert(siteSetting)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSetting.key, set: { value } });
  cache.invalidate(key);
}

export async function clearSiteContent(key: SiteContentKey): Promise<void> {
  await db.delete(siteSetting).where(eq(siteSetting.key, key));
  cache.invalidate(key);
}
