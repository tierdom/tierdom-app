import { eq } from 'drizzle-orm';
import { db } from './db';
import { siteSetting } from './db/schema';
import { renderMarkdown } from './markdown';

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

export async function getSiteContentRecord(key: SiteContentKey): Promise<SiteContentRecord> {
  const [row] = await db.select().from(siteSetting).where(eq(siteSetting.key, key)).limit(1);
  return {
    value: row?.value ?? null,
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null
  };
}

export async function getSiteContentHtml(key: SiteContentKey): Promise<string> {
  const { value } = await getSiteContentRecord(key);
  return renderMarkdown(value?.trim() ? value : siteContentBlocks[key].fallback);
}

export async function setSiteContent(key: SiteContentKey, value: string): Promise<void> {
  await db
    .insert(siteSetting)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSetting.key, set: { value } });
}

export async function clearSiteContent(key: SiteContentKey): Promise<void> {
  await db.delete(siteSetting).where(eq(siteSetting.key, key));
}
