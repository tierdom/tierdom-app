import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Lightweight in-memory stand-in for the site_setting table. Just enough
 * surface for site-content.ts's read/write/delete paths. insertCount is
 * kept so we can assert the byte-cap guard short-circuits before writing.
 */
type Row = { key: string; value: string; createdAt: string; updatedAt: string };
const store = new Map<string, Row>();
let insertCount = 0;

function resetMockDb() {
  store.clear();
  insertCount = 0;
}

vi.mock('$lib/server/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (predicate: { key: string }) => ({
          limit: async () => {
            const row = store.get(predicate.key);
            return row ? [row] : [];
          },
        }),
      }),
    }),
    insert: () => ({
      values: (v: { key: string; value: string }) => ({
        onConflictDoUpdate: async () => {
          insertCount += 1;
          const prev = store.get(v.key);
          const now = new Date().toISOString();
          store.set(v.key, {
            key: v.key,
            value: v.value,
            createdAt: prev?.createdAt ?? now,
            updatedAt: now,
          });
        },
      }),
    }),
    delete: () => ({
      where: async (predicate: { key: string }) => {
        store.delete(predicate.key);
      },
    }),
  },
}));

// drizzle's eq(column, value) returns a predicate; our mock `where` reads
// `.key` off whatever's passed, so we forward the column's name alongside
// the value.
vi.mock('$lib/server/db/schema', () => ({
  siteSetting: { key: { name: 'key' } },
}));

vi.mock('drizzle-orm', () => ({
  eq: (_col: unknown, value: string) => ({ key: value }),
}));

import {
  MAX_SITE_CONTENT_BYTES,
  SiteContentTooLargeError,
  _resetSiteContentCacheForTests,
  clearSiteContent,
  getSiteContentHtml,
  getSiteContentRecord,
  isSiteContentKey,
  setSiteContent,
  siteContentBlocks,
} from './site-content';

beforeEach(() => {
  resetMockDb();
  _resetSiteContentCacheForTests();
});

describe('isSiteContentKey', () => {
  it('accepts known keys', () => {
    expect.assertions(1);
    expect(isSiteContentKey('footer')).toBe(true);
  });

  it('rejects unknown keys', () => {
    expect.assertions(2);
    expect(isSiteContentKey('logo')).toBe(false);
    expect(isSiteContentKey('')).toBe(false);
  });
});

describe('getSiteContentHtml', () => {
  it('renders the fallback when no row exists', async () => {
    expect.assertions(2);
    const html = await getSiteContentHtml('footer');
    expect(html).toContain('Self-hosted tier lists');
    expect(html).toContain('Source on GitHub');
  });

  it('renders the fallback when the stored value is whitespace-only', async () => {
    expect.assertions(1);
    store.set('footer', {
      key: 'footer',
      value: '   \n  ',
      createdAt: 't',
      updatedAt: 't',
    });
    const html = await getSiteContentHtml('footer');
    expect(html).toContain('Self-hosted tier lists');
  });

  it('renders the stored value when present', async () => {
    expect.assertions(2);
    store.set('footer', {
      key: 'footer',
      value: '**Custom** footer',
      createdAt: 't',
      updatedAt: 't',
    });
    const html = await getSiteContentHtml('footer');
    expect(html).toContain('<strong>Custom</strong>');
    expect(html).not.toContain('Self-hosted tier lists');
  });
});

// Cache mechanism is covered in keyed-cache.test.ts. These integration
// tests pin down the site-content wiring: writes must invalidate so the
// next read reflects the new state (no stale served after a mutation).
describe('read-after-write', () => {
  it('sees the new value after setSiteContent, even when the prior read cached the fallback', async () => {
    expect.assertions(1);
    await getSiteContentHtml('footer'); // prime cache with the fallback
    await setSiteContent('footer', 'new value');
    expect(await getSiteContentHtml('footer')).toContain('new value');
  });

  it('reverts to fallback after clearSiteContent, even when a custom value was cached', async () => {
    expect.assertions(1);
    await setSiteContent('footer', 'custom');
    await getSiteContentHtml('footer'); // prime cache with the custom value
    await clearSiteContent('footer');
    expect(await getSiteContentHtml('footer')).toContain('Self-hosted tier lists');
  });
});

describe('setSiteContent', () => {
  it('stores the value', async () => {
    expect.assertions(1);
    await setSiteContent('footer', 'hello');
    expect((await getSiteContentRecord('footer')).value).toBe('hello');
  });

  it('rejects values over the byte cap', async () => {
    expect.assertions(3);
    const oversized = 'x'.repeat(MAX_SITE_CONTENT_BYTES + 1);
    await expect(setSiteContent('footer', oversized)).rejects.toBeInstanceOf(
      SiteContentTooLargeError,
    );
    // Didn't hit the DB because the guard fires first
    expect(insertCount).toBe(0);
    // Still readable (fallback); cache entry untouched
    const html = await getSiteContentHtml('footer');
    expect(html).toContain('Self-hosted tier lists');
  });

  it('counts bytes, not characters (multi-byte aware)', async () => {
    expect.assertions(2);
    // Each emoji is 4 UTF-8 bytes; construct a value whose char length is
    // under the cap but whose byte length exceeds it.
    const emoji = '🚀';
    const chars = Math.floor(MAX_SITE_CONTENT_BYTES / 3);
    const value = emoji.repeat(chars); // ~4 bytes * chars > 16 KB
    expect(new TextEncoder().encode(value).length).toBeGreaterThan(MAX_SITE_CONTENT_BYTES);
    await expect(setSiteContent('footer', value)).rejects.toBeInstanceOf(SiteContentTooLargeError);
  });
});

describe('siteContentBlocks registry', () => {
  it('has matching title / description / fallback for every exposed key', () => {
    expect.assertions(4);
    for (const [key, block] of Object.entries(siteContentBlocks)) {
      expect(isSiteContentKey(key)).toBe(true);
      expect(block.title.length).toBeGreaterThan(0);
      expect(block.description.length).toBeGreaterThan(0);
      expect(block.fallback.length).toBeGreaterThan(0);
    }
  });
});
