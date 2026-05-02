import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, isNull, and } from 'drizzle-orm';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const { TMP_ROOT } = vi.hoisted(() => ({
  TMP_ROOT: `/tmp/tierdom-imdb-test-${process.pid}-${Date.now()}`,
}));

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: TMP_ROOT } }));
vi.mock('$lib/server/db', () => ({ db: {} }));

import * as schema from '$lib/server/db/schema';
import { categoryTable, tierListItemTable } from '$lib/server/db/schema';
import { commitImdbImport, imdbImporter, planImdbImport } from './imdb';
import type { CategoryMapping, ImporterOptions } from '../types';

const FIXTURES_DIR = 'tests/fixtures/imports';
const IMPORTS_DIR = join(TMP_ROOT, 'tmp', 'imports');

function makeDb() {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

function fileFromFixture(name: string): File {
  const text = readFileSync(join(FIXTURES_DIR, name), 'utf8');
  return new File([text], name, { type: 'text/csv' });
}

const DEFAULTS: ImporterOptions = {
  importYear: true,
  importDirectors: false,
  titleType: 'all',
  importUrl: true,
  sortBy: 'title',
  unratedRows: 'skip',
};

beforeAll(() => mkdirSync(TMP_ROOT, { recursive: true }));
afterAll(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

describe('imdb importer', () => {
  beforeEach(() => {
    rmSync(IMPORTS_DIR, { recursive: true, force: true });
  });

  describe('plan: header validation', () => {
    it('rejects a CSV missing required headers', async () => {
      const plan = await planImdbImport(fileFromFixture('imdb-malformed.csv'), DEFAULTS);
      expect(plan.planId).toBe('');
      expect(plan.errors[0]).toMatch(/Missing required IMDb columns/);
      expect(plan.errors[0]).toMatch(/Your Rating/);
    });

    it('rejects oversized files before parsing', async () => {
      const huge = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.csv', { type: 'text/csv' });
      const plan = await planImdbImport(huge, DEFAULTS);
      expect(plan.planId).toBe('');
      expect(plan.errors[0]).toMatch(/maximum is/);
    });
  });

  describe('plan: synthetic category', () => {
    it('uses imdb-watchlist for "all"', async () => {
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      expect(plan.categories).toHaveLength(1);
      expect(plan.categories[0]!.fileSlug).toBe('imdb-watchlist');
      expect(plan.categories[0]!.fileName).toBe('IMDb Watchlist');
    });

    it('uses movies for titleType=movie', async () => {
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        titleType: 'movie',
      });
      expect(plan.categories[0]!.fileSlug).toBe('movies');
      expect(plan.categories[0]!.fileName).toBe('Movies');
    });

    it('uses tv-series for titleType=tvSeries', async () => {
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        titleType: 'tvSeries',
      });
      expect(plan.categories[0]!.fileSlug).toBe('tv-series');
      expect(plan.categories[0]!.fileName).toBe('TV Series');
    });
  });

  describe('plan: filtering', () => {
    it('drops TV Series rows when titleType=movie', async () => {
      const allPlan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      const moviesOnly = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        titleType: 'movie',
      });
      expect(moviesOnly.categories[0]!.itemCount).toBeLessThan(allPlan.categories[0]!.itemCount);
      expect(moviesOnly.categories[0]!.itemCount).toBeGreaterThan(0);
    });

    it('drops Movie rows when titleType=tvSeries', async () => {
      const tvOnly = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        titleType: 'tvSeries',
      });
      expect(tvOnly.categories[0]!.itemCount).toBeGreaterThan(0);
    });
  });

  describe('plan + commit: end-to-end against a real DB', () => {
    it('imports the sample fixture into a fresh category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      expect(plan.errors).toEqual([]);
      const mapping: CategoryMapping = {
        fileSlug: 'imdb-watchlist',
        action: 'create-new',
        slug: 'imdb-watchlist',
        name: 'IMDb Watchlist',
      };
      const result = await commitImdbImport(plan.planId, [mapping], 'skip', db);
      expect(result.errors).toEqual([]);
      expect(result.inserted.categories).toBe(1);
      expect(result.inserted.items).toBe(plan.categories[0]!.itemCount);
    });

    it('writes Year as a prop and the URL as a markdown link in description', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      const mapping: CategoryMapping = {
        fileSlug: 'imdb-watchlist',
        action: 'create-new',
        slug: 'imdb-watchlist',
        name: 'IMDb Watchlist',
      };
      await commitImdbImport(plan.planId, [mapping], 'skip', db);

      // `db` is the typed connection; the cast above only unifies it with
      // the helper signature.
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const breakingBad = realDb
        .select()
        .from(tierListItemTable)
        .where(and(eq(tierListItemTable.slug, 'breaking-bad'), isNull(tierListItemTable.deletedAt)))
        .get();
      expect(breakingBad).toBeDefined();
      expect(breakingBad!.score).toBe(100); // rating 10 → 100
      expect(breakingBad!.description).toMatch(/^\[IMDB Link for 'Breaking Bad'\]\(https:/);
      const year = (breakingBad!.props ?? []).find((p) => p.key === 'Year');
      expect(year?.value).toBe('2008');
      const directors = (breakingBad!.props ?? []).find((p) => p.key === 'Directors');
      expect(directors).toBeUndefined();
    });

    it('writes Directors as a prop when toggled on', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        importDirectors: true,
      });
      const mapping: CategoryMapping = {
        fileSlug: 'imdb-watchlist',
        action: 'create-new',
        slug: 'imdb-watchlist',
        name: 'IMDb Watchlist',
      };
      await commitImdbImport(plan.planId, [mapping], 'skip', db);

      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const mario = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'the-super-mario-galaxy-movie'))
        .get();
      expect(mario).toBeDefined();
      const directors = (mario!.props ?? []).find((p) => p.key === 'Directors');
      expect(directors?.value).toContain('Aaron Horvath');
      expect(directors?.value).toContain('Michael Jelenic');
    });

    it('omits Year prop when importYear=false and description when importUrl=false', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        importYear: false,
        importUrl: false,
      });
      const mapping: CategoryMapping = {
        fileSlug: 'imdb-watchlist',
        action: 'create-new',
        slug: 'imdb-watchlist',
        name: 'IMDb Watchlist',
      };
      await commitImdbImport(plan.planId, [mapping], 'skip', db);

      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'breaking-bad'))
        .get();
      expect(item!.description).toBe('');
      expect((item!.props ?? []).find((p) => p.key === 'Year')).toBeUndefined();
    });

    it('seeds the new category with prop keys and marks Year showOnCard', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        importDirectors: true,
      });
      await commitImdbImport(
        plan.planId,
        [
          {
            fileSlug: 'imdb-watchlist',
            action: 'create-new',
            slug: 'imdb-watchlist',
            name: 'IMDb Watchlist',
          },
        ],
        'skip',
        db,
      );

      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.slug, 'imdb-watchlist'))
        .get();
      const keys = cat!.propKeys ?? [];
      expect(keys.find((k) => k.key === 'Year')).toEqual({ key: 'Year', showOnCard: true });
      expect(keys.find((k) => k.key === 'Directors')).toEqual({ key: 'Directors' });
    });

    it('does not add Year as a prop key when importYear is off', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        importYear: false,
      });
      await commitImdbImport(
        plan.planId,
        [
          {
            fileSlug: 'imdb-watchlist',
            action: 'create-new',
            slug: 'imdb-watchlist',
            name: 'IMDb Watchlist',
          },
        ],
        'skip',
        db,
      );

      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.slug, 'imdb-watchlist'))
        .get();
      expect((cat!.propKeys ?? []).find((k) => k.key === 'Year')).toBeUndefined();
    });

    it('merges new prop keys into an existing category without overwriting present ones', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      // Seed an existing category with Year already configured (no showOnCard)
      // so we can assert the merge preserves the existing config.
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-000000000001',
          slug: 'imdb-watchlist',
          name: 'IMDb Watchlist',
          description: null,
          order: 0,
          propKeys: [{ key: 'Year' }, { key: 'Network' }],
        })
        .run();

      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        importDirectors: true,
      });
      await commitImdbImport(
        plan.planId,
        [
          {
            fileSlug: 'imdb-watchlist',
            action: 'use-existing',
            targetId: '00000000-0000-4000-8000-000000000001',
          },
        ],
        'skip',
        db,
      );

      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.id, '00000000-0000-4000-8000-000000000001'))
        .get();
      const keys = cat!.propKeys ?? [];
      // Existing Year (no showOnCard) preserved; Network preserved; Directors added.
      expect(keys).toEqual([{ key: 'Year' }, { key: 'Network' }, { key: 'Directors' }]);
    });

    it('orders items by Your Rating DESC with the chosen tie-breaker, Const last', async () => {
      // The LOTR trilogy in the sample shares Your Rating=7 and Date Rated=2015-12-04.
      // sortBy=title should put them in alphabetical Title order, with Const as
      // the final tie-breaker (none needed here since titles differ).
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        sortBy: 'title',
      });
      const mapping: CategoryMapping = {
        fileSlug: 'imdb-watchlist',
        action: 'create-new',
        slug: 'imdb-watchlist',
        name: 'IMDb Watchlist',
      };
      await commitImdbImport(plan.planId, [mapping], 'skip', db);

      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const lotr = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.score, 70)) // rating 7
        .all()
        .filter((i) => i.name.startsWith('The Lord of the Rings'));
      expect(lotr.map((i) => i.name)).toEqual([
        'The Lord of the Rings: The Fellowship of the Ring',
        'The Lord of the Rings: The Return of the King',
        'The Lord of the Rings: The Two Towers',
      ]);
      // The order field should be strictly increasing across the three.
      expect(lotr[0]!.order).toBeLessThan(lotr[1]!.order);
      expect(lotr[1]!.order).toBeLessThan(lotr[2]!.order);
    });

    it('respects skip strategy on slug clash within the target', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      // First import.
      const plan1 = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      await commitImdbImport(
        plan1.planId,
        [{ fileSlug: 'imdb-watchlist', action: 'create-new', slug: 'imdb-watchlist', name: 'X' }],
        'skip',
        db,
      );
      // Second import (re-using the same slugs) into the same target.
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const target = realDb
        .select({ id: categoryTable.id })
        .from(categoryTable)
        .where(eq(categoryTable.slug, 'imdb-watchlist'))
        .get();
      const plan2 = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      const result = await commitImdbImport(
        plan2.planId,
        [{ fileSlug: 'imdb-watchlist', action: 'use-existing', targetId: target!.id }],
        'skip',
        db,
      );
      expect(result.skipped.items).toBeGreaterThan(0);
      expect(result.inserted.items).toBe(0);
    });

    it('skips the synthetic category when mapping action is "skip"', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      const result = await commitImdbImport(
        plan.planId,
        [{ fileSlug: 'imdb-watchlist', action: 'skip' }],
        'skip',
        db,
      );
      expect(result.skipped.categories).toBe(1);
      expect(result.skipped.items).toBe(plan.categories[0]!.itemCount);
      expect(result.inserted.categories).toBe(0);
    });
  });

  describe('importer registration', () => {
    it('exposes plan, commit, and an options schema', () => {
      expect(typeof imdbImporter.plan).toBe('function');
      expect(typeof imdbImporter.commit).toBe('function');
      expect(imdbImporter.status).toBe('available');
      expect((imdbImporter.options ?? []).length).toBeGreaterThan(0);
    });

    it('plan() on the registered importer short-circuits cleanly on bad input', async () => {
      const tooBig = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.csv', { type: 'text/csv' });
      const plan = await imdbImporter.plan!(tooBig, DEFAULTS);
      expect(plan.errors[0]).toMatch(/maximum is/);
    });

    it('commit() on the registered importer short-circuits cleanly on a missing plan', async () => {
      const result = await imdbImporter.commit!('00000000-0000-4000-8000-deadbeefdead', [], 'skip');
      expect(result.errors[0]).toMatch(/not found or expired/);
    });
  });
});
