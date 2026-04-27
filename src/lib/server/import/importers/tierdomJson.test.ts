import { describe, expect, it, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: '/tmp/tierdom-import-test-stub' } }));
vi.mock('$lib/server/db', () => ({ db: {} }));
const { invalidateSpy } = vi.hoisted(() => ({ invalidateSpy: vi.fn() }));
vi.mock('$lib/server/site-content', () => ({ invalidateAllSiteContent: invalidateSpy }));

import * as schema from '$lib/server/db/schema';
import { categoryTable, tierListItemTable, page, siteSetting } from '$lib/server/db/schema';
import { runTierdomJsonImport, tierdomJsonImporter } from './tierdomJson';

const FIXTURES_DIR = 'tests/fixtures/imports';

type DB = ReturnType<typeof makeDb>;

function makeDb() {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

function fileFromFixture(name: string): File {
  const text = readFileSync(join(FIXTURES_DIR, name), 'utf8');
  return new File([text], name, { type: 'application/json' });
}

function totals(group: { categories: number; items: number; pages: number; siteSettings: number }) {
  return group.categories + group.items + group.pages + group.siteSettings;
}

describe('runTierdomJsonImport', () => {
  let db: DB;

  beforeEach(() => {
    db = makeDb();
    invalidateSpy.mockClear();
  });

  describe('happy path (001-good into empty DB)', () => {
    it('inserts every row and returns matching counts', async () => {
      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.errors).toEqual([]);
      // 001 has 2 categories, 4 items, 0 pages, 0 settings
      expect(totals(result.inserted)).toBe(6);
      expect(totals(result.updated)).toBe(0);
      expect(totals(result.skipped)).toBe(0);
      expect(result.inserted.categories).toBe(2);
      expect(result.inserted.items).toBe(4);

      const cats = db.select().from(categoryTable).all();
      expect(cats.map((c) => c.slug).sort()).toEqual(['board-games', 'books']);
      const items = db.select().from(tierListItemTable).all();
      expect(items).toHaveLength(4);
    });

    it('records every touched row in details with slug-based paths', async () => {
      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.details.inserted).toContain('categories/books');
      expect(result.details.inserted).toContain(
        'categories/books/items/influence-the-psychology-of-persuasion'
      );
      expect(result.details.inserted).toContain('categories/board-games/items/chess');
      expect(result.details.skipped).toEqual([]);
      expect(result.details.updated).toEqual([]);
    });

    it('does not touch the site-content cache when no pages or settings landed', async () => {
      await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('full fixture (004) writes pages + settings and invalidates the cache', () => {
    it('counts pages and settings correctly', async () => {
      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-004-full.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );
      expect(result.errors).toEqual([]);
      expect(result.inserted.pages).toBe(2);
      expect(result.inserted.siteSettings).toBe(1);
    });

    it('invalidates site-content cache once at the end', async () => {
      await runTierdomJsonImport(
        fileFromFixture('tierdom-json-004-full.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('overlap (002) — skip leaves prior content untouched', () => {
    it('skips every row when the same UUIDs already exist', async () => {
      // First import 001 to seed the DB with known UUIDs
      await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-002-overlap.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.errors).toEqual([]);
      // 002 contains pages and a setting (those slugs are new) plus the same
      // UUIDs as 001. New rows get inserted; matching UUIDs get skipped.
      expect(result.skipped.categories).toBe(2);
      expect(result.skipped.items).toBe(4);
      expect(result.updated.categories).toBe(0);
      expect(result.updated.items).toBe(0);

      // The "Books" name is still 001's, not 002's "Books — Updated".
      const books = db.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect(books?.name).toBe('Books');
    });
  });

  describe('overlap (002) — upsert overwrites existing UUIDs', () => {
    it('updates every overlapping row', async () => {
      await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-002-overlap.json'),
        { strategy: 'upsert' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.updated.categories).toBe(2);
      expect(result.updated.items).toBe(4);
      expect(result.skipped.categories).toBe(0);

      const books = db.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect(books?.name).toBe('Books — Updated');

      const chess = db
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'chess'))
        .get();
      expect(chess?.name).toBe('Chess — Updated');
      expect(chess?.score).toBe(99);
    });
  });

  describe('malformed (003) is rejected before any write', () => {
    it('returns AJV errors and writes nothing', async () => {
      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-003-malformed.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.errors.length).toBeGreaterThan(0);
      // Sample assertions tied to the deliberately broken rows in 003
      expect(result.errors.some((e) => e.includes('score'))).toBe(true);
      expect(result.errors.some((e) => e.includes('required'))).toBe(true);

      // Database remained empty
      expect(db.select().from(categoryTable).all()).toEqual([]);
      expect(db.select().from(tierListItemTable).all()).toEqual([]);
      expect(db.select().from(page).all()).toEqual([]);
      expect(db.select().from(siteSetting).all()).toEqual([]);
    });
  });

  describe('JSON parse failure', () => {
    it('returns a single Invalid JSON error and writes nothing', async () => {
      const file = new File(['{not valid json'], 'broken.json', { type: 'application/json' });
      const result = await runTierdomJsonImport(
        file,
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/^Invalid JSON/);
      expect(db.select().from(categoryTable).all()).toEqual([]);
    });
  });

  describe('size guard', () => {
    it('rejects files over MAX_JSON_BYTES without parsing them', async () => {
      // Construct a File whose size exceeds the limit but contains nonsense content.
      // We just need .size to be over 10 MB — the guard short-circuits before parsing.
      const tooBig = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.json', {
        type: 'application/json'
      });
      const result = await runTierdomJsonImport(
        tooBig,
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/maximum is/);
    });
  });

  describe('pages and site settings — skip + upsert paths', () => {
    it('skip leaves existing pages and settings untouched on a second import', async () => {
      // First import puts pages + settings into place
      await runTierdomJsonImport(
        fileFromFixture('tierdom-json-004-full.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-004-full.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.skipped.pages).toBe(2);
      expect(result.skipped.siteSettings).toBe(1);
      expect(result.updated.pages).toBe(0);
      expect(result.updated.siteSettings).toBe(0);
    });

    it('upsert overwrites existing pages and settings', async () => {
      await runTierdomJsonImport(
        fileFromFixture('tierdom-json-004-full.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-002-overlap.json'),
        { strategy: 'upsert' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.updated.pages).toBe(2);
      expect(result.updated.siteSettings).toBe(1);

      const footer = db.select().from(siteSetting).where(eq(siteSetting.key, 'footer')).get();
      expect(footer?.value).toBe('Footer overwritten by overlap fixture.');

      const about = db.select().from(page).where(eq(page.slug, 'about')).get();
      expect(about?.title).toBe('About — Updated');
    });
  });

  describe('item slug clash within an existing category', () => {
    async function seedItemWithDifferentUuid() {
      // Pre-create the books category with the SAME UUID as the fixture so
      // items get attempted under it, then add an item that occupies the
      // "influence-…" slug under a different UUID.
      db.insert(categoryTable)
        .values({
          id: '3f710286-e2bd-45a1-962b-510828192863',
          slug: 'books',
          name: 'Books',
          order: 0
        })
        .run();
      db.insert(tierListItemTable)
        .values({
          id: '99999999-9999-4999-8999-999999999999',
          categoryId: '3f710286-e2bd-45a1-962b-510828192863',
          slug: 'influence-the-psychology-of-persuasion',
          name: 'Pre-existing Influence',
          score: 50,
          order: 0
        })
        .run();
    }

    it('skip mode counts the slug-clashing item as skipped', async () => {
      await seedItemWithDifferentUuid();

      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.errors).toEqual([]);
      // The pre-existing item kept its name
      const item = db
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'influence-the-psychology-of-persuasion'))
        .get();
      expect(item?.name).toBe('Pre-existing Influence');
      // Exactly one item in the file's books category clashes with the seeded
      // pre-existing item; board-games items still import normally.
      expect(result.skipped.items).toBe(1);
    });

    it('upsert mode emits a per-row error and skips the clashing item', async () => {
      await seedItemWithDifferentUuid();

      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'upsert' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(
        result.errors.some((e) => /upsert keys on UUID, not slug/i.test(e) && e.includes('Item'))
      ).toBe(true);
      const item = db
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'influence-the-psychology-of-persuasion'))
        .get();
      expect(item?.name).toBe('Pre-existing Influence');
    });
  });

  describe('importer registration', () => {
    it('exposes a run() callback that returns gracefully on a broken DB', async () => {
      // Contract: any DB error (transaction failure, FK violation, etc.) must
      // surface as a string in result.errors — never thrown out of run().
      // We exercise that contract here by invoking the registered .run()
      // against the default-mocked `db = {}`, which makes db.transaction
      // throw because the method doesn't exist. The importer's try/catch
      // must convert it to a "Database error: …" entry.
      const file = fileFromFixture('tierdom-json-001-good.json');
      expect(typeof tierdomJsonImporter.run).toBe('function');
      const result = await tierdomJsonImporter.run!(file, { strategy: 'skip' });
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/^Database error:/);
    });
  });

  describe('slug clash on a different UUID', () => {
    it('skip mode quietly skips the category and its items (FK-safe)', async () => {
      // Pre-create a Books category with a *different* UUID than the fixture
      db.insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-000000000000',
          slug: 'books',
          name: 'My Books',
          order: 0
        })
        .run();

      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'skip' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.errors).toEqual([]);
      // Books category skipped + its 1 item skipped; board-games still imports
      expect(result.skipped.categories).toBe(1);
      expect(result.skipped.items).toBeGreaterThanOrEqual(1);
      expect(result.inserted.categories).toBe(1); // only board-games

      // The user's "My Books" was untouched
      const books = db.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect(books?.name).toBe('My Books');
    });

    it('upsert mode reports a per-row error instead of silently merging UUIDs', async () => {
      db.insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-000000000000',
          slug: 'books',
          name: 'My Books',
          order: 0
        })
        .run();

      const result = await runTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        { strategy: 'upsert' },
        db as unknown as Parameters<typeof runTierdomJsonImport>[2]
      );

      expect(result.errors.some((e) => /upsert keys on UUID, not slug/i.test(e))).toBe(true);
      // The user's "My Books" was untouched
      const books = db.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect(books?.name).toBe('My Books');
    });
  });
});
