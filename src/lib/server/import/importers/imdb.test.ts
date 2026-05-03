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
// Stub the default db with a chain that resolves to undefined — the planner's
// matchedExisting lookup runs on every plan call, but most tests pass a real
// makeDb() into plan/commit and don't exercise the default. Tests that DO want
// to verify the lookup pass an in-memory DB explicitly.
vi.mock('$lib/server/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ get: () => undefined }) }) }),
  },
}));

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
  genres: 'none',
  placeholders: true,
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

  describe('plan: matchedExisting', () => {
    it('sets matchedExistingId/Name when a category with the synthetic slug already exists', async () => {
      const db = makeDb();
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-0000000000cc',
          slug: 'imdb-watchlist',
          name: 'My Watchlist',
          description: null,
          order: 0,
        })
        .run();
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS, db);
      expect(plan.categories[0]!.matchedExistingId).toBe('00000000-0000-4000-8000-0000000000cc');
      expect(plan.categories[0]!.matchedExistingName).toBe('My Watchlist');
    });

    it('returns matchedExisting nulls when the slug is free', async () => {
      const db = makeDb();
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS, db);
      expect(plan.categories[0]!.matchedExistingId).toBeNull();
      expect(plan.categories[0]!.matchedExistingName).toBeNull();
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

    it('applies the IMDb tier cutoffs on a new category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
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
      expect({
        S: cat!.cutoffS,
        A: cat!.cutoffA,
        B: cat!.cutoffB,
        C: cat!.cutoffC,
        D: cat!.cutoffD,
        E: cat!.cutoffE,
        F: cat!.cutoffF,
      }).toEqual({ S: 91, A: 81, B: 71, C: 61, D: 51, E: 41, F: 0 });
    });

    it('fills in missing tier cutoffs on use-existing without overriding set ones', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      // Existing has only S and A set; the rest must be filled with IMDb defaults.
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-000000000002',
          slug: 'imdb-watchlist',
          name: 'IMDb Watchlist',
          description: null,
          order: 0,
          cutoffS: 95,
          cutoffA: 85,
          propKeys: [],
        })
        .run();
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      await commitImdbImport(
        plan.planId,
        [
          {
            fileSlug: 'imdb-watchlist',
            action: 'use-existing',
            targetId: '00000000-0000-4000-8000-000000000002',
          },
        ],
        'skip',
        db,
      );
      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.id, '00000000-0000-4000-8000-000000000002'))
        .get();
      expect(cat!.cutoffS).toBe(95); // preserved
      expect(cat!.cutoffA).toBe(85); // preserved
      expect(cat!.cutoffB).toBe(71); // filled
      expect(cat!.cutoffF).toBe(0); // filled
    });

    it('writes a deterministic gradient placeholder by default and skips when toggled off', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const planOn = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      await commitImdbImport(
        planOn.planId,
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
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'breaking-bad'))
        .get();
      expect(item!.placeholder).toMatch(/^linear-gradient\(135deg, hsl\(/);

      // A second importer with placeholders off lands in a fresh category.
      const dbOff = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const planOff = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        placeholders: false,
      });
      await commitImdbImport(
        planOff.planId,
        [
          {
            fileSlug: 'imdb-watchlist',
            action: 'create-new',
            slug: 'imdb-watchlist',
            name: 'IMDb Watchlist',
          },
        ],
        'skip',
        dbOff,
      );
      const realDbOff = dbOff as unknown as ReturnType<typeof makeDb>;
      const itemOff = realDbOff
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'breaking-bad'))
        .get();
      expect(itemOff!.placeholder).toBeNull();
    });

    it('imports the main genre and seeds the Genres prop key', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        genres: 'main',
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
      expect((cat!.propKeys ?? []).find((k) => k.key === 'Genres')).toEqual({ key: 'Genres' });

      const breakingBad = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'breaking-bad'))
        .get();
      // Breaking Bad's Genres CSV cell is "Drama, Crime, Thriller" — main = "Drama".
      expect((breakingBad!.props ?? []).find((p) => p.key === 'Genres')?.value).toBe('Drama');
    });

    it('imports all genres as a single property value', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        genres: 'all',
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
      const breakingBad = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'breaking-bad'))
        .get();
      expect((breakingBad!.props ?? []).find((p) => p.key === 'Genres')?.value).toBe(
        'Drama, Crime, Thriller',
      );
    });

    it('omits the Genres prop and prop key when mode is "none"', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
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
      expect((cat!.propKeys ?? []).find((k) => k.key === 'Genres')).toBeUndefined();
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'breaking-bad'))
        .get();
      expect((item!.props ?? []).find((p) => p.key === 'Genres')).toBeUndefined();
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

    it('errors when commit is called with no mapping for the synthetic category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      const result = await commitImdbImport(plan.planId, [], 'skip', db);
      expect(result.errors[0]).toMatch(/No mapping provided/);
      expect(result.skipped.categories).toBe(1);
      expect(result.inserted.categories).toBe(0);
    });

    it('appends Const to the slug when two titles slugify to the same value', async () => {
      const csv = [
        'Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Year,Genres,Directors',
        'tt0000001,7,2020-01-01,"Spider-Man",https://www.imdb.com/title/tt0000001,Movie,7.0,2002,"Action","Sam Raimi"',
        'tt0000002,7,2020-01-02,"Spider Man",https://www.imdb.com/title/tt0000002,Movie,7.0,2017,"Action","Jon Watts"',
      ].join('\n');
      const file = new File([csv], 'collision.csv', { type: 'text/csv' });
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(file, DEFAULTS);
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
      const slugs = realDb
        .select({ slug: tierListItemTable.slug })
        .from(tierListItemTable)
        .all()
        .map((r) => r.slug)
        .sort();
      expect(slugs).toHaveLength(2);
      expect(slugs[0]).toBe('spider-man');
      // The second slug carries the colliding row's Const suffix, but which
      // row "wins" the bare slug depends on the title sort — both shapes
      // ("spider-man-tt0000001" or "spider-man-tt0000002") are valid.
      expect(slugs[1]).toMatch(/^spider-man-tt000000[12]$/);
    });

    // For each tie-breaker mode, verify the FIRST item among Your Rating=7
    // rows. The sample has 11 rating-7 rows; each mode picks a different
    // winner. (LOTR rows alone don't differentiate dateRated tie-breakers
    // because the three films share Date Rated=2015-12-04.)
    it.each([
      // A Knight of the Seven Kingdoms, Date Rated 2026-03-14 — the most
      // recent rating-7 row.
      ['dateRatedDesc', 'a-knight-of-the-seven-kingdoms'],
      // Johnny Mnemonic, Date Rated 2014-08-24 — the oldest rating-7 row.
      ['dateRatedAsc', 'johnny-mnemonic'],
      // The Return of the King, IMDb Rating 9.0 — highest among rating-7 rows.
      ['imdbRating', 'the-lord-of-the-rings-the-return-of-the-king'],
    ])(
      'uses %s as the tie-breaker for items with the same Your Rating',
      async (sortBy, expected) => {
        const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
        const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
          ...DEFAULTS,
          sortBy,
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
        const tied = realDb
          .select()
          .from(tierListItemTable)
          .where(eq(tierListItemTable.score, 70))
          .all()
          .sort((a, b) => a.order - b.order);
        expect(tied[0]!.slug).toBe(expected);
      },
    );

    it('imports unrated rows with score 0 when unratedRows=import', async () => {
      const csv = [
        'Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Year,Genres,Directors',
        'tt0000001,,,"Watchlist Pick",https://www.imdb.com/title/tt0000001,Movie,7.0,2020,"Drama","Anon"',
      ].join('\n');
      const file = new File([csv], 'unrated.csv', { type: 'text/csv' });
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(file, { ...DEFAULTS, unratedRows: 'import' });
      expect(plan.categories[0]!.itemCount).toBe(1);
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
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'watchlist-pick'))
        .get();
      expect(item!.score).toBe(0);
    });

    it('use-existing skips the propKeys merge when nothing new is being imported', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-000000000003',
          slug: 'imdb-watchlist',
          name: 'IMDb Watchlist',
          description: null,
          order: 0,
          propKeys: [{ key: 'Custom' }],
        })
        .run();
      // All prop-producing toggles off — the importer has no propKeys to merge.
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), {
        ...DEFAULTS,
        importYear: false,
        importDirectors: false,
        genres: 'none',
      });
      await commitImdbImport(
        plan.planId,
        [
          {
            fileSlug: 'imdb-watchlist',
            action: 'use-existing',
            targetId: '00000000-0000-4000-8000-000000000003',
          },
        ],
        'skip',
        db,
      );
      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.id, '00000000-0000-4000-8000-000000000003'))
        .get();
      // Existing prop key untouched; nothing added.
      expect(cat!.propKeys).toEqual([{ key: 'Custom' }]);
    });

    it('use-existing skips the cutoff fill when the target already has all cutoffs set', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-000000000004',
          slug: 'imdb-watchlist',
          name: 'IMDb Watchlist',
          description: null,
          order: 0,
          cutoffS: 95,
          cutoffA: 85,
          cutoffB: 75,
          cutoffC: 65,
          cutoffD: 55,
          cutoffE: 45,
          cutoffF: 5,
          propKeys: [],
        })
        .run();
      const plan = await planImdbImport(fileFromFixture('imdb-sample.csv'), DEFAULTS);
      await commitImdbImport(
        plan.planId,
        [
          {
            fileSlug: 'imdb-watchlist',
            action: 'use-existing',
            targetId: '00000000-0000-4000-8000-000000000004',
          },
        ],
        'skip',
        db,
      );
      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.id, '00000000-0000-4000-8000-000000000004'))
        .get();
      // Every cutoff preserved verbatim.
      expect({
        S: cat!.cutoffS,
        A: cat!.cutoffA,
        B: cat!.cutoffB,
        C: cat!.cutoffC,
        D: cat!.cutoffD,
        E: cat!.cutoffE,
        F: cat!.cutoffF,
      }).toEqual({ S: 95, A: 85, B: 75, C: 65, D: 55, E: 45, F: 5 });
    });

    it('drops empty Genres cells silently when mode is "main" or "all"', async () => {
      const csv = [
        'Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Year,Genres,Directors',
        'tt0000001,7,2020-01-01,"No Genre",https://www.imdb.com/title/tt0000001,Movie,7.0,2020,,"Anon"',
      ].join('\n');
      const file = new File([csv], 'no-genre.csv', { type: 'text/csv' });
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(file, { ...DEFAULTS, genres: 'main' });
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
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'no-genre'))
        .get();
      expect((item!.props ?? []).find((p) => p.key === 'Genres')).toBeUndefined();
    });

    it('produces an empty description when importUrl=true but the row has no URL', async () => {
      const csv = [
        'Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Year,Genres,Directors',
        'tt0000001,7,2020-01-01,"Local Only",,Movie,7.0,2020,"Drama","Anon"',
      ].join('\n');
      const file = new File([csv], 'no-url.csv', { type: 'text/csv' });
      const db = makeDb() as unknown as Parameters<typeof commitImdbImport>[3];
      const plan = await planImdbImport(file, DEFAULTS);
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
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'local-only'))
        .get();
      expect(item!.description).toBe('');
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
