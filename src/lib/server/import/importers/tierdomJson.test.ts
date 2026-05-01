import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { and, eq, isNull } from 'drizzle-orm';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { TMP_ROOT } = vi.hoisted(() => ({
  TMP_ROOT: `/tmp/tierdom-import-test-${process.pid}-${Date.now()}`,
}));

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: TMP_ROOT } }));
vi.mock('$lib/server/db', () => ({ db: {} }));

import * as schema from '$lib/server/db/schema';
import { categoryTable, tierListItemTable } from '$lib/server/db/schema';
import { commitTierdomJsonImport, planTierdomJsonImport, tierdomJsonImporter } from './tierdomJson';
import type { CategoryMapping } from '../types';

const FIXTURES_DIR = 'tests/fixtures/imports';
const IMPORTS_DIR = join(TMP_ROOT, 'tmp', 'imports');

type DB = ReturnType<typeof makeDb>;
type ImporterDb = Parameters<typeof planTierdomJsonImport>[1];

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

beforeAll(() => mkdirSync(TMP_ROOT, { recursive: true }));
afterAll(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

describe('tierdomJson importer', () => {
  let db: DB;

  beforeEach(() => {
    db = makeDb();
    rmSync(IMPORTS_DIR, { recursive: true, force: true });
  });

  describe('plan()', () => {
    it('returns proposed categories with no matches against an empty DB', async () => {
      const plan = await planTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        db as unknown as ImporterDb,
      );
      expect(plan.errors).toEqual([]);
      expect(plan.planId).toMatch(/^[0-9a-f-]{36}$/);
      expect(plan.categories.map((c) => c.fileSlug).sort()).toEqual(['board-games', 'books']);
      for (const c of plan.categories) {
        expect(c.matchedExistingId).toBeNull();
        expect(c.matchedExistingName).toBeNull();
      }
      // The temp file is on disk
      expect(readdirSync(IMPORTS_DIR)).toEqual([`${plan.planId}.json`]);
    });

    it('matches an existing active category by slug', async () => {
      db.insert(categoryTable)
        .values({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'books', name: 'My Books' })
        .run();
      const plan = await planTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        db as unknown as ImporterDb,
      );
      const books = plan.categories.find((c) => c.fileSlug === 'books');
      expect(books?.matchedExistingId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(books?.matchedExistingName).toBe('My Books');
    });

    it('does not match a soft-deleted category', async () => {
      db.insert(categoryTable)
        .values({
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          slug: 'books',
          name: 'Trashed Books',
          deletedAt: '2026-01-01T00:00:00Z',
        })
        .run();
      const plan = await planTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        db as unknown as ImporterDb,
      );
      const books = plan.categories.find((c) => c.fileSlug === 'books');
      expect(books?.matchedExistingId).toBeNull();
    });

    it('rejects malformed fixtures with AJV errors and writes nothing to temp', async () => {
      const plan = await planTierdomJsonImport(
        fileFromFixture('tierdom-json-003-malformed.json'),
        db as unknown as ImporterDb,
      );
      expect(plan.errors.length).toBeGreaterThan(0);
      expect(plan.errors.some((e) => e.includes('score'))).toBe(true);
      expect(plan.planId).toBe('');
      expect(existsSync(IMPORTS_DIR)).toBe(false);
    });

    it('rejects unparseable JSON', async () => {
      const file = new File(['{not valid'], 'broken.json', { type: 'application/json' });
      const plan = await planTierdomJsonImport(file, db as unknown as ImporterDb);
      expect(plan.errors).toHaveLength(1);
      expect(plan.errors[0]).toMatch(/^Invalid JSON/);
    });

    it('rejects files larger than the cap without parsing', async () => {
      const tooBig = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.json', {
        type: 'application/json',
      });
      const plan = await planTierdomJsonImport(tooBig, db as unknown as ImporterDb);
      expect(plan.errors).toHaveLength(1);
      expect(plan.errors[0]).toMatch(/maximum is/);
    });
  });

  describe('commit()', () => {
    async function planFixture(name: string) {
      return planTierdomJsonImport(fileFromFixture(name), db as unknown as ImporterDb);
    }

    function defaultMappings(plan: Awaited<ReturnType<typeof planFixture>>): CategoryMapping[] {
      return plan.categories.map((c) =>
        c.matchedExistingId
          ? { fileSlug: c.fileSlug, action: 'use-existing', targetId: c.matchedExistingId }
          : { fileSlug: c.fileSlug, action: 'create-new', slug: c.fileSlug, name: c.fileName },
      );
    }

    it('create-new inserts categories and items into a fresh DB', async () => {
      const plan = await planFixture('tierdom-json-001-good.json');
      const result = await commitTierdomJsonImport(
        plan.planId,
        defaultMappings(plan),
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors).toEqual([]);
      expect(result.inserted.categories).toBe(2);
      expect(result.inserted.items).toBe(4);
      expect(result.skipped.items).toBe(0);
      // Temp file is gone after a successful commit
      expect(readdirSync(IMPORTS_DIR)).toEqual([]);
    });

    it('does not import imageHash even when the file carries one', async () => {
      // tierdom-json-001-good.json includes items with non-null imageHash
      // (e.g. "3103f130db64"). Those reference image files that only exist on
      // the exporter — importing the hash would leave the item pointing at a
      // missing file. See ADR-0024 ("No image imports").
      const plan = await planFixture('tierdom-json-001-good.json');
      await commitTierdomJsonImport(
        plan.planId,
        defaultMappings(plan),
        'skip',
        db as unknown as ImporterDb,
      );
      const items = db.select().from(tierListItemTable).all();
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.imageHash).toBeNull();
      }
    });

    it('use-existing routes items into the chosen target category', async () => {
      db.insert(categoryTable)
        .values({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'books', name: 'My Books' })
        .run();
      const plan = await planFixture('tierdom-json-001-good.json');
      const result = await commitTierdomJsonImport(
        plan.planId,
        defaultMappings(plan),
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors).toEqual([]);
      expect(result.inserted.categories).toBe(1); // board-games only
      expect(result.inserted.items).toBe(4); // 1 book + 3 board games

      // The book item landed under My Books, not a freshly created category
      const item = db
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'influence-the-psychology-of-persuasion'))
        .get();
      expect(item?.categoryId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

      const books = db
        .select()
        .from(categoryTable)
        .where(and(eq(categoryTable.slug, 'books'), isNull(categoryTable.deletedAt)))
        .all();
      expect(books).toHaveLength(1);
      expect(books[0]!.name).toBe('My Books');
    });

    it('skip leaves an existing item slug in the target category alone', async () => {
      db.insert(categoryTable)
        .values({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'books', name: 'My Books' })
        .run();
      db.insert(tierListItemTable)
        .values({
          id: '99999999-9999-4999-8999-999999999999',
          categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          slug: 'influence-the-psychology-of-persuasion',
          name: 'Pre-existing',
          score: 50,
        })
        .run();
      const plan = await planFixture('tierdom-json-001-good.json');
      const result = await commitTierdomJsonImport(
        plan.planId,
        defaultMappings(plan),
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.skipped.items).toBe(1);
      const item = db
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'influence-the-psychology-of-persuasion'))
        .get();
      expect(item?.name).toBe('Pre-existing');
    });

    it('overwrite replaces an existing item slug in the target category', async () => {
      db.insert(categoryTable)
        .values({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'books', name: 'My Books' })
        .run();
      db.insert(tierListItemTable)
        .values({
          id: '99999999-9999-4999-8999-999999999999',
          categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          slug: 'influence-the-psychology-of-persuasion',
          name: 'Pre-existing',
          score: 50,
        })
        .run();
      const plan = await planFixture('tierdom-json-001-good.json');
      const result = await commitTierdomJsonImport(
        plan.planId,
        defaultMappings(plan),
        'overwrite',
        db as unknown as ImporterDb,
      );
      expect(result.updated.items).toBe(1);
      const item = db
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'influence-the-psychology-of-persuasion'))
        .get();
      expect(item?.name).not.toBe('Pre-existing');
      expect(item?.id).toBe('99999999-9999-4999-8999-999999999999');
    });

    it('create-new with a custom slug uses the override, not the file slug', async () => {
      const plan = await planFixture('tierdom-json-001-good.json');
      const mappings: CategoryMapping[] = plan.categories.map((c) => ({
        fileSlug: c.fileSlug,
        action: 'create-new',
        slug: `imported-${c.fileSlug}`,
        name: `Imported ${c.fileName}`,
      }));
      const result = await commitTierdomJsonImport(
        plan.planId,
        mappings,
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors).toEqual([]);
      const slugs = db.select({ slug: categoryTable.slug }).from(categoryTable).all();
      expect(slugs.map((s) => s.slug).sort()).toEqual(['imported-board-games', 'imported-books']);
    });

    it('create-new fails per-row when the chosen slug clashes with an active category', async () => {
      db.insert(categoryTable)
        .values({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'books', name: 'My Books' })
        .run();
      const plan = await planFixture('tierdom-json-001-good.json');
      // Force create-new for books even though there's an active match — the user
      // chose "create new" with the same slug.
      const mappings: CategoryMapping[] = plan.categories.map((c) =>
        c.fileSlug === 'books'
          ? { fileSlug: 'books', action: 'create-new', slug: 'books', name: c.fileName }
          : { fileSlug: c.fileSlug, action: 'create-new', slug: c.fileSlug, name: c.fileName },
      );
      const result = await commitTierdomJsonImport(
        plan.planId,
        mappings,
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors.some((e) => /slug already in use/.test(e))).toBe(true);
    });

    it('use-existing fails when the target category no longer exists', async () => {
      const plan = await planFixture('tierdom-json-001-good.json');
      const mappings: CategoryMapping[] = plan.categories.map((c) => ({
        fileSlug: c.fileSlug,
        action: 'use-existing',
        targetId: '00000000-0000-4000-8000-000000000000',
      }));
      const result = await commitTierdomJsonImport(
        plan.planId,
        mappings,
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors.some((e) => /no longer exists/.test(e))).toBe(true);
    });

    it('skip mapping skips the category and all its items, no error', async () => {
      const plan = await planFixture('tierdom-json-001-good.json');
      const mappings: CategoryMapping[] = plan.categories.map((c) => ({
        fileSlug: c.fileSlug,
        action: 'skip',
      }));
      const result = await commitTierdomJsonImport(
        plan.planId,
        mappings,
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors).toEqual([]);
      expect(result.skipped.categories).toBe(2);
      expect(result.skipped.items).toBe(4);
      expect(result.inserted.categories).toBe(0);
      expect(result.inserted.items).toBe(0);
      expect(db.select().from(categoryTable).all()).toEqual([]);
    });

    it('mixed skip + create-new only writes the kept category', async () => {
      const plan = await planFixture('tierdom-json-001-good.json');
      const mappings: CategoryMapping[] = plan.categories.map((c) =>
        c.fileSlug === 'books'
          ? { fileSlug: 'books', action: 'skip' }
          : { fileSlug: c.fileSlug, action: 'create-new', slug: c.fileSlug, name: c.fileName },
      );
      const result = await commitTierdomJsonImport(
        plan.planId,
        mappings,
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors).toEqual([]);
      expect(result.inserted.categories).toBe(1);
      expect(result.skipped.categories).toBe(1);
      const slugs = db.select({ slug: categoryTable.slug }).from(categoryTable).all();
      expect(slugs.map((s) => s.slug)).toEqual(['board-games']);
    });

    it('records a per-category error when a mapping is missing', async () => {
      const plan = await planFixture('tierdom-json-001-good.json');
      const mappings: CategoryMapping[] = []; // intentionally empty
      const result = await commitTierdomJsonImport(
        plan.planId,
        mappings,
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors.some((e) => /No mapping provided/.test(e))).toBe(true);
      expect(result.skipped.categories).toBe(2);
      expect(result.skipped.items).toBe(4);
    });

    it('returns a friendly error when the planId points nowhere', async () => {
      const result = await commitTierdomJsonImport(
        '00000000-0000-4000-8000-000000000000',
        [],
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors[0]).toMatch(/not found or expired/);
    });

    it('returns a friendly error for a malformed planId', async () => {
      const result = await commitTierdomJsonImport(
        '../../etc/passwd',
        [],
        'skip',
        db as unknown as ImporterDb,
      );
      expect(result.errors[0]).toMatch(/Invalid plan id/);
    });

    it('rejects a temp file whose contents are not parseable JSON', async () => {
      // Place a corrupt file directly under a valid <uuid>.json name. This
      // simulates someone (or something) tampering with the temp file between
      // plan and commit — the importer must not blow up.
      mkdirSync(IMPORTS_DIR, { recursive: true });
      const planId = '00000000-0000-4000-8000-000000000000';
      writeFileSync(join(IMPORTS_DIR, `${planId}.json`), '{not valid json');
      const result = await commitTierdomJsonImport(planId, [], 'skip', db as unknown as ImporterDb);
      expect(result.errors[0]).toMatch(/^Invalid JSON in stored plan/);
    });

    it('rejects a temp file whose contents do not match the schema', async () => {
      mkdirSync(IMPORTS_DIR, { recursive: true });
      const planId = '00000000-0000-4000-8000-000000000001';
      // Valid JSON but not an export — AJV must reject it on commit.
      writeFileSync(join(IMPORTS_DIR, `${planId}.json`), JSON.stringify({ hello: 'world' }));
      const result = await commitTierdomJsonImport(planId, [], 'skip', db as unknown as ImporterDb);
      expect(result.errors.length).toBeGreaterThan(0);
      // AJV errors carry instance paths, not the "Invalid JSON" prefix.
      expect(result.errors.every((e) => !e.startsWith('Invalid JSON'))).toBe(true);
    });

    it('catches a transaction throw and returns it as a Database error', async () => {
      // Plan first against a real DB so the temp file lands; then commit with
      // a stub that throws on .transaction(). The outer try/catch in commit
      // must convert the throw into an error string.
      const plan = await planTierdomJsonImport(
        fileFromFixture('tierdom-json-001-good.json'),
        db as unknown as ImporterDb,
      );
      const brokenDb = {
        transaction: () => {
          throw new Error('connection lost');
        },
      };
      const result = await commitTierdomJsonImport(
        plan.planId,
        [{ fileSlug: 'books', action: 'skip' }],
        'skip',
        brokenDb as unknown as ImporterDb,
      );
      expect(result.errors[0]).toMatch(/^Database error: connection lost/);
    });
  });

  describe('importer registration', () => {
    it('exposes plan and commit on the registered importer', () => {
      expect(typeof tierdomJsonImporter.plan).toBe('function');
      expect(typeof tierdomJsonImporter.commit).toBe('function');
    });

    it('plan() on the registered importer short-circuits cleanly on bad input', async () => {
      // Routes through tierdomJsonImporter.plan(file) — exercises the thunk
      // that wraps planTierdomJsonImport. Oversized file returns errors
      // before the importer touches the (mocked-as-{}) default DB.
      const tooBig = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.json', {
        type: 'application/json',
      });
      const plan = await tierdomJsonImporter.plan!(tooBig);
      expect(plan.errors[0]).toMatch(/maximum is/);
    });

    it('commit() on the registered importer short-circuits cleanly on a missing plan', async () => {
      // Routes through tierdomJsonImporter.commit(...) — exercises the thunk.
      // An unknown planId fails fast in readImportTemp, before the default DB
      // is ever consulted.
      const result = await tierdomJsonImporter.commit!(
        '00000000-0000-4000-8000-deadbeefdead',
        [],
        'skip',
      );
      expect(result.errors[0]).toMatch(/not found or expired/);
    });
  });
});
