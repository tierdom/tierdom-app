import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, isNull, and } from 'drizzle-orm';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const { TMP_ROOT } = vi.hoisted(() => ({
  TMP_ROOT: `/tmp/tierdom-goodreads-test-${process.pid}-${Date.now()}`,
}));

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: TMP_ROOT } }));
vi.mock('$lib/server/db', () => ({ db: {} }));

import * as schema from '$lib/server/db/schema';
import { categoryTable, tierListItemTable } from '$lib/server/db/schema';
import {
  commitGoodreadsImport,
  goodreadsImporter,
  planGoodreadsImport,
  unwrapIsbn,
} from './goodreads';
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
  isbnMode: 'isbn13',
  importAuthor: true,
  importBinding: false,
  pubYear: 'original',
  sortBy: 'title',
  unratedRows: 'skip',
  placeholders: true,
};

const BOOKS_MAPPING: CategoryMapping = {
  fileSlug: 'books',
  action: 'create-new',
  slug: 'books',
  name: 'Books',
};

beforeAll(() => mkdirSync(TMP_ROOT, { recursive: true }));
afterAll(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

describe('goodreads importer', () => {
  beforeEach(() => {
    rmSync(IMPORTS_DIR, { recursive: true, force: true });
  });

  describe('static metadata', () => {
    it('exposes the configure options the route handler renders', () => {
      expect(goodreadsImporter.status).toBe('available');
      expect(goodreadsImporter.options?.map((o) => o.id)).toEqual([
        'isbnMode',
        'importAuthor',
        'importBinding',
        'pubYear',
        'sortBy',
        'unratedRows',
        'placeholders',
      ]);
    });

    it('plan and commit on the importer object delegate to the exported functions', async () => {
      const file = fileFromFixture('goodreads-malformed.csv');
      const plan = await goodreadsImporter.plan!(file, DEFAULTS);
      expect(plan.errors[0]).toMatch(/Missing required Goodreads columns/);
      // commit returns an error on an unknown plan id — proves the wrapper
      // call reaches the underlying function.
      const result = await goodreadsImporter.commit!(
        '00000000-0000-4000-8000-000000000000',
        [BOOKS_MAPPING],
        'skip',
      );
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('plan: placeholders and slug fallback', () => {
    it('placeholders=false drops the gradient', async () => {
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        placeholders: false,
      });
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'thinking-fast-and-slow'))
        .get();
      expect(item!.placeholder).toBeNull();
    });

    it('falls back to a goodreads-<bookId> slug when the title slugifies to empty', async () => {
      const csv =
        'Book Id,Title,Author,ISBN,ISBN13,My Rating,Binding,Year Published,Original Publication Year,Date Added\n' +
        '999,!!!,Anon,"=""""","=""""",4,Paperback,2020,2020,2020/01/01\n';
      const file = new File([csv], 'empty-slug.csv', { type: 'text/csv' });
      const plan = await planGoodreadsImport(file, DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const slugs = realDb.select({ slug: tierListItemTable.slug }).from(tierListItemTable).all();
      expect(slugs).toEqual([{ slug: 'goodreads-999' }]);
    });
  });

  describe('plan: option defaults', () => {
    it('falls back to defaults when options are missing', async () => {
      // Mirrors the situation where the route handler omits a key for an
      // unchecked checkbox or a freshly added option without a stored value.
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {});
      expect(plan.errors).toEqual([]);
      // Defaults: isbnMode=isbn13, pubYear=original, unratedRows=skip,
      // sortBy=title, importAuthor=true, importBinding=false, placeholders=true.
      expect(plan.categories[0]!.itemCount).toBe(19); // unrated rows skipped
    });
  });

  describe('plan: slug uniqueness', () => {
    it('appends Book Id when two rows would slugify to the same value', async () => {
      const csv =
        'Book Id,Title,Author,ISBN,ISBN13,My Rating,Binding,Year Published,Original Publication Year,Date Added\n' +
        '111,Same Title,Alice,"=""""","=""""",5,Paperback,2020,2020,2020/01/01\n' +
        '222,Same Title,Bob,"=""""","=""""",5,Paperback,2021,2021,2021/01/01\n';
      const file = new File([csv], 'dup.csv', { type: 'text/csv' });
      const plan = await planGoodreadsImport(file, DEFAULTS);
      expect(plan.errors).toEqual([]);

      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const slugs = realDb
        .select({ slug: tierListItemTable.slug })
        .from(tierListItemTable)
        .all()
        .map((r) => r.slug)
        .sort();
      // Title compare is the secondary tie-breaker; both have the same title,
      // so the second row (Book Id 222) gets the dedup suffix.
      expect(slugs).toEqual(['same-title', 'same-title-222']);
    });
  });

  describe('unwrapIsbn', () => {
    it('strips the Excel-armoured ="..." wrapper', () => {
      expect(unwrapIsbn('="9780374275631"')).toBe('9780374275631');
      expect(unwrapIsbn('="0374275637"')).toBe('0374275637');
    });
    it('returns empty for the empty Goodreads sentinel =""', () => {
      expect(unwrapIsbn('=""')).toBe('');
    });
    it('passes through bare values unchanged', () => {
      expect(unwrapIsbn('9780374275631')).toBe('9780374275631');
      expect(unwrapIsbn('')).toBe('');
    });
  });

  describe('plan: header validation', () => {
    it('rejects a CSV missing required headers', async () => {
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-malformed.csv'), DEFAULTS);
      expect(plan.planId).toBe('');
      expect(plan.errors[0]).toMatch(/Missing required Goodreads columns/);
      expect(plan.errors[0]).toMatch(/My Rating/);
    });

    it('rejects oversized files before parsing', async () => {
      const huge = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.csv', { type: 'text/csv' });
      const plan = await planGoodreadsImport(huge, DEFAULTS);
      expect(plan.planId).toBe('');
      expect(plan.errors[0]).toMatch(/maximum is/);
    });
  });

  describe('plan: synthetic category', () => {
    it('always proposes the "books" / "Books" category', async () => {
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      expect(plan.errors).toEqual([]);
      expect(plan.categories).toHaveLength(1);
      expect(plan.categories[0]!.fileSlug).toBe('books');
      expect(plan.categories[0]!.fileName).toBe('Books');
    });
  });

  describe('plan: filtering by rating', () => {
    it('skips unrated rows by default', async () => {
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      // Sample has 21 books, 2 with My Rating=0 (Master 4D + Art of War).
      expect(plan.categories[0]!.itemCount).toBe(19);
    });
    it('imports unrated rows with score 0 when unratedRows=import', async () => {
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        unratedRows: 'import',
      });
      expect(plan.categories[0]!.itemCount).toBe(21);
    });
  });

  describe('plan + commit: end-to-end', () => {
    it('imports the sample fixture into a fresh "Books" category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      const result = await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      expect(result.errors).toEqual([]);
      expect(result.inserted.categories).toBe(1);
      expect(result.inserted.items).toBe(19);
    });

    it('multiplies My Rating by 20 to produce the 0-100 score', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const influence = realDb
        .select()
        .from(tierListItemTable)
        .where(
          and(
            eq(tierListItemTable.slug, 'influence-the-psychology-of-persuasion'),
            isNull(tierListItemTable.deletedAt),
          ),
        )
        .get();
      expect(influence).toBeDefined();
      expect(influence!.score).toBe(100); // rating 5 → 100
      const codeComplete = realDb
        .select()
        .from(tierListItemTable)
        .where(
          eq(tierListItemTable.slug, 'code-complete-a-practical-handbook-of-software-construction'),
        )
        .get();
      expect(codeComplete!.score).toBe(20); // rating 1 → 20
    });

    it('writes Author and ISBN13 by default; omits ISBN10 and Binding', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'thinking-fast-and-slow'))
        .get();
      const props = item!.props ?? [];
      expect(props.find((p) => p.key === 'Author')?.value).toBe('Daniel Kahneman');
      expect(props.find((p) => p.key === 'ISBN13')?.value).toBe('9780374275631');
      expect(props.find((p) => p.key === 'ISBN')).toBeUndefined();
      expect(props.find((p) => p.key === 'Binding')).toBeUndefined();
    });

    it('isbnMode=both writes ISBN13 and ISBN; isbn10 swaps to ISBN only', async () => {
      const db1 = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const both = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        isbnMode: 'both',
      });
      await commitGoodreadsImport(both.planId, [BOOKS_MAPPING], 'skip', db1);
      const realDb1 = db1 as unknown as ReturnType<typeof makeDb>;
      const propsBoth =
        realDb1
          .select()
          .from(tierListItemTable)
          .where(eq(tierListItemTable.slug, 'thinking-fast-and-slow'))
          .get()!.props ?? [];
      expect(propsBoth.find((p) => p.key === 'ISBN13')?.value).toBe('9780374275631');
      expect(propsBoth.find((p) => p.key === 'ISBN')?.value).toBe('0374275637');

      const db2 = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const ten = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        isbnMode: 'isbn10',
      });
      await commitGoodreadsImport(ten.planId, [BOOKS_MAPPING], 'skip', db2);
      const realDb2 = db2 as unknown as ReturnType<typeof makeDb>;
      const propsTen =
        realDb2
          .select()
          .from(tierListItemTable)
          .where(eq(tierListItemTable.slug, 'thinking-fast-and-slow'))
          .get()!.props ?? [];
      expect(propsTen.find((p) => p.key === 'ISBN')?.value).toBe('0374275637');
      expect(propsTen.find((p) => p.key === 'ISBN13')).toBeUndefined();
    });

    it('omits ISBN props for rows where Goodreads returned the empty sentinel', async () => {
      // Master 4D has =""/="" — even with unratedRows=import (so the row is
      // included), the ISBN props should not appear.
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        unratedRows: 'import',
        isbnMode: 'both',
      });
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const master = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'master-4d-time-management-delete-defer-delegate-do'))
        .get();
      const props = master!.props ?? [];
      expect(props.find((p) => p.key === 'ISBN13')).toBeUndefined();
      expect(props.find((p) => p.key === 'ISBN')).toBeUndefined();
    });

    it('pubYear=original prefers Original Publication Year; falls back to Year Published when blank', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const mythical = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'the-mythical-man-month-essays-on-software-engineering'))
        .get();
      // Original=1975, Edition=1995 → original chosen
      expect((mythical!.props ?? []).find((p) => p.key === 'Year')?.value).toBe('1975');

      // Six Thinking Hats has Original blank → falls back to Year Published 2009
      const hats = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'six-thinking-hats'))
        .get();
      expect((hats!.props ?? []).find((p) => p.key === 'Year')?.value).toBe('2009');
    });

    it('pubYear=edition uses Year Published; pubYear=none drops the prop', async () => {
      const dbA = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const planA = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        pubYear: 'edition',
      });
      await commitGoodreadsImport(planA.planId, [BOOKS_MAPPING], 'skip', dbA);
      const realA = dbA as unknown as ReturnType<typeof makeDb>;
      const mythicalEdition = realA
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'the-mythical-man-month-essays-on-software-engineering'))
        .get();
      expect((mythicalEdition!.props ?? []).find((p) => p.key === 'Year')?.value).toBe('1995');

      const dbB = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const planB = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        pubYear: 'none',
      });
      await commitGoodreadsImport(planB.planId, [BOOKS_MAPPING], 'skip', dbB);
      const realB = dbB as unknown as ReturnType<typeof makeDb>;
      const mythicalNone = realB
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'the-mythical-man-month-essays-on-software-engineering'))
        .get();
      expect((mythicalNone!.props ?? []).find((p) => p.key === 'Year')).toBeUndefined();
      const cat = realB.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect((cat!.propKeys ?? []).find((k) => k.key === 'Year')).toBeUndefined();
    });

    it('importBinding adds the Binding prop and seeds the prop key', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        importBinding: true,
      });
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'thinking-fast-and-slow'))
        .get();
      expect((item!.props ?? []).find((p) => p.key === 'Binding')?.value).toBe('Hardcover');
      const cat = realDb.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect((cat!.propKeys ?? []).find((k) => k.key === 'Binding')).toEqual({ key: 'Binding' });
    });

    it('seeds the new category with the Goodreads tier cutoffs', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const cat = realDb.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect(cat!.cutoffS).toBe(91);
      expect(cat!.cutoffA).toBe(71);
      expect(cat!.cutoffB).toBe(51);
      expect(cat!.cutoffC).toBe(31);
      expect(cat!.cutoffD).toBe(21);
      expect(cat!.cutoffE).toBe(11);
      expect(cat!.cutoffF).toBe(0);
    });

    it('seeds Author and Year with showOnCard but ISBN13 without', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const cat = realDb.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      const keys = cat!.propKeys ?? [];
      expect(keys.find((k) => k.key === 'Author')).toEqual({ key: 'Author', showOnCard: true });
      expect(keys.find((k) => k.key === 'Year')).toEqual({ key: 'Year', showOnCard: true });
      expect(keys.find((k) => k.key === 'ISBN13')).toEqual({ key: 'ISBN13' });
    });

    it('merges prop keys and fills missing cutoffs on use-existing without overriding present ones', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-0000000000aa',
          slug: 'books',
          name: 'Books',
          description: null,
          order: 0,
          cutoffS: 95, // user-set, must not be overridden
          propKeys: [{ key: 'Author' }, { key: 'Genre' }],
        })
        .run();

      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      await commitGoodreadsImport(
        plan.planId,
        [
          {
            fileSlug: 'books',
            action: 'use-existing',
            targetId: '00000000-0000-4000-8000-0000000000aa',
          },
        ],
        'skip',
        db,
      );

      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.id, '00000000-0000-4000-8000-0000000000aa'))
        .get();
      expect(cat!.cutoffS).toBe(95);
      expect(cat!.cutoffA).toBe(71); // filled in from defaults
      expect(cat!.cutoffD).toBe(21);
      const keys = cat!.propKeys ?? [];
      expect(keys.map((k) => k.key)).toEqual(['Author', 'Genre', 'Year', 'ISBN13']);
    });
  });

  describe('plan: sort and tie-breakers', () => {
    it('sorts by My Rating desc with title as the secondary tie-breaker by default', async () => {
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const items = realDb
        .select({ name: tierListItemTable.name, score: tierListItemTable.score })
        .from(tierListItemTable)
        .where(isNull(tierListItemTable.deletedAt))
        .orderBy(tierListItemTable.order)
        .all();
      // Higher scores first; alphabetical within a score band.
      const scoresInOrder = items.map((i) => i.score);
      const sorted = [...scoresInOrder].sort((a, b) => b - a);
      expect(scoresInOrder).toEqual(sorted);

      // Within the 5-star (score 100) bucket, alphabetical.
      const fiveStar = items.filter((i) => i.score === 100).map((i) => i.name);
      expect(fiveStar).toEqual([...fiveStar].sort((a, b) => a.localeCompare(b)));
    });

    it('dateAddedDesc orders ties by Date Added newest first', async () => {
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        sortBy: 'dateAddedDesc',
      });
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      // Within the 1-star band (score 20) the sample has three entries:
      // Code Complete (2015/09/21), Writing Effective Use Cases (2015/09/21),
      // Agile Retrospectives (2015/12/15). Newest-first puts Agile first.
      const oneStar = realDb
        .select({ name: tierListItemTable.name, score: tierListItemTable.score })
        .from(tierListItemTable)
        .where(eq(tierListItemTable.score, 20))
        .orderBy(tierListItemTable.order)
        .all();
      expect(oneStar[0]!.name).toBe('Agile Retrospectives: Making Good Teams Great');
    });

    it('dateAddedAsc orders ties by Date Added oldest first', async () => {
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), {
        ...DEFAULTS,
        sortBy: 'dateAddedAsc',
      });
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      await commitGoodreadsImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const oneStar = realDb
        .select({ name: tierListItemTable.name })
        .from(tierListItemTable)
        .where(eq(tierListItemTable.score, 20))
        .orderBy(tierListItemTable.order)
        .all();
      // Oldest-first: 2015/09/21 entries come before 2015/12/15. Among the
      // two same-day rows, Book Id is the final tie-breaker — compared as
      // strings (matching the IMDb importer convention), so "161370" sorts
      // before "4845".
      expect(oneStar.map((i) => i.name)).toEqual([
        'Writing Effective Use Cases (Agile Software Development Series)',
        'Code Complete: A Practical Handbook of Software Construction',
        'Agile Retrospectives: Making Good Teams Great',
      ]);
    });
  });

  describe('commit: error and skip paths', () => {
    it('returns an error when the plan id is unknown', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const result = await commitGoodreadsImport(
        '00000000-0000-4000-8000-000000000999',
        [BOOKS_MAPPING],
        'skip',
        db,
      );
      expect(result.errors[0]).toMatch(/not found|ENOENT|expired/i);
    });

    it('marks every item as skipped when the mapping action is skip', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      const result = await commitGoodreadsImport(
        plan.planId,
        [{ fileSlug: 'books', action: 'skip' }],
        'skip',
        db,
      );
      expect(result.skipped.categories).toBe(1);
      expect(result.skipped.items).toBe(19);
      expect(result.inserted.items).toBe(0);
    });

    it('errors when no mapping is provided for the books category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitGoodreadsImport>[3];
      const plan = await planGoodreadsImport(fileFromFixture('goodreads-sample.csv'), DEFAULTS);
      const result = await commitGoodreadsImport(plan.planId, [], 'skip', db);
      expect(result.errors[0]).toMatch(/No mapping/);
      expect(result.skipped.categories).toBe(1);
    });
  });
});
