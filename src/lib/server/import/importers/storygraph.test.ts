import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, isNull, and } from 'drizzle-orm';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const { TMP_ROOT } = vi.hoisted(() => ({
  TMP_ROOT: `/tmp/tierdom-storygraph-test-${process.pid}-${Date.now()}`,
}));

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: TMP_ROOT } }));
vi.mock('$lib/server/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ get: () => undefined }) }) }),
  },
}));

import * as schema from '$lib/server/db/schema';
import { categoryTable, tierListItemTable } from '$lib/server/db/schema';
import {
  cleanTitle,
  commitStorygraphImport,
  planStorygraphImport,
  primaryAuthor,
  storygraphImporter,
} from './storygraph';
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

const HEADER =
  'Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,Last Date Read,Dates Read,Read Count,Moods,Pace,Character- or Plot-Driven?,Strong Character Development?,Loveable Characters?,Diverse Characters?,Flawed Characters?,Star Rating,Review,Content Warnings,Content Warning Description,Tags,Owned?\n';

function csvFile(name: string, body: string): File {
  return new File([HEADER + body], name, { type: 'text/csv' });
}

const DEFAULTS: ImporterOptions = {
  titleClean: 'moderate',
  isbnKey: 'isbn',
  importAuthor: true,
  importFormat: false,
  readStatusFilter: 'all',
  unratedRows: 'skip',
  sortBy: 'title',
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

describe('storygraph importer', () => {
  beforeEach(() => {
    rmSync(IMPORTS_DIR, { recursive: true, force: true });
  });

  describe('static metadata', () => {
    it('exposes the configure options the route handler renders', () => {
      expect(storygraphImporter.status).toBe('available');
      expect(storygraphImporter.options?.map((o) => o.id)).toEqual([
        'titleClean',
        'isbnKey',
        'importAuthor',
        'importFormat',
        'readStatusFilter',
        'unratedRows',
        'sortBy',
        'placeholders',
      ]);
    });

    it('plan and commit on the importer object delegate to the exported functions', async () => {
      const file = fileFromFixture('storygraph-malformed.csv');
      const plan = await storygraphImporter.plan!(file, DEFAULTS);
      expect(plan.errors[0]).toMatch(/Missing required StoryGraph columns/);
      const result = await storygraphImporter.commit!(
        '00000000-0000-4000-8000-000000000000',
        [BOOKS_MAPPING],
        'skip',
      );
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('plan: header validation', () => {
    it('rejects a CSV missing required headers', async () => {
      const plan = await planStorygraphImport(
        fileFromFixture('storygraph-malformed.csv'),
        DEFAULTS,
      );
      expect(plan.planId).toBe('');
      expect(plan.errors[0]).toMatch(/Missing required StoryGraph columns/);
      expect(plan.errors[0]).toMatch(/Star Rating/);
    });

    it('rejects oversized files before parsing', async () => {
      const huge = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.csv', { type: 'text/csv' });
      const plan = await planStorygraphImport(huge, DEFAULTS);
      expect(plan.planId).toBe('');
      expect(plan.errors[0]).toMatch(/maximum is/);
    });
  });

  describe('plan: option defaults', () => {
    it('falls back to defaults when options are missing', async () => {
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), {});
      expect(plan.errors).toEqual([]);
      // Sample has 14 rows; all are rated and all are "read" — default
      // skip-unrated and all-statuses keep everything.
      expect(plan.categories[0]!.itemCount).toBe(14);
    });
  });

  describe('plan: synthetic category', () => {
    it('always proposes the "books" / "Books" category', async () => {
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      expect(plan.categories).toHaveLength(1);
      expect(plan.categories[0]!.fileSlug).toBe('books');
      expect(plan.categories[0]!.fileName).toBe('Books');
    });
  });

  describe('plan: matchedExisting', () => {
    it('sets matchedExistingId/Name when a "books" category already exists', async () => {
      const db = makeDb();
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-0000000000bb',
          slug: 'books',
          name: 'My Books',
          description: null,
          order: 0,
        })
        .run();
      const plan = await planStorygraphImport(
        fileFromFixture('storygraph-sample.csv'),
        DEFAULTS,
        db,
      );
      expect(plan.categories[0]!.matchedExistingId).toBe('00000000-0000-4000-8000-0000000000bb');
      expect(plan.categories[0]!.matchedExistingName).toBe('My Books');
    });
  });

  describe('plan: filtering', () => {
    it('readStatusFilter=read drops to-read and currently-reading rows', async () => {
      const file = csvFile(
        'mixed-status.csv',
        'A,A1,,1234567890,paperback,read,2024/01/01,,,1,,,,,,,,5.0,,,,,No\n' +
          'B,B1,,1234567891,paperback,to-read,2024/01/02,,,0,,,,,,,,,,,,,No\n' +
          'C,C1,,1234567892,paperback,currently-reading,2024/01/03,,,0,,,,,,,,,,,,,No\n' +
          'D,D1,,1234567893,paperback,did-not-finish,2024/01/04,,,1,,,,,,,,2.0,,,,,No\n',
      );
      const plan = await planStorygraphImport(file, {
        ...DEFAULTS,
        readStatusFilter: 'read',
        unratedRows: 'import',
      });
      expect(plan.categories[0]!.itemCount).toBe(1);
    });

    it('readStatusFilter=readAndDnf keeps read and did-not-finish', async () => {
      const file = csvFile(
        'mixed-status.csv',
        'A,A1,,1234567890,paperback,read,2024/01/01,,,1,,,,,,,,5.0,,,,,No\n' +
          'B,B1,,1234567891,paperback,to-read,2024/01/02,,,0,,,,,,,,,,,,,No\n' +
          'D,D1,,1234567893,paperback,did-not-finish,2024/01/04,,,1,,,,,,,,2.0,,,,,No\n',
      );
      const plan = await planStorygraphImport(file, {
        ...DEFAULTS,
        readStatusFilter: 'readAndDnf',
        unratedRows: 'import',
      });
      expect(plan.categories[0]!.itemCount).toBe(2);
    });

    it('skips unrated rows by default; imports them with score 0 when unratedRows=import', async () => {
      const file = csvFile(
        'unrated.csv',
        'Rated,Author,,1234567890,paperback,read,2024/01/01,,,1,,,,,,,,4.0,,,,,No\n' +
          'Unrated,Author,,1234567891,paperback,read,2024/01/02,,,1,,,,,,,,,,,,,No\n',
      );
      const skip = await planStorygraphImport(file, DEFAULTS);
      expect(skip.categories[0]!.itemCount).toBe(1);

      const importBlanks = await planStorygraphImport(file, {
        ...DEFAULTS,
        unratedRows: 'import',
      });
      expect(importBlanks.categories[0]!.itemCount).toBe(2);
    });
  });

  describe('plan: slug fallback and uniqueness', () => {
    it('falls back to a storygraph-<id> slug when the title slugifies to empty', async () => {
      const file = csvFile(
        'empty-slug.csv',
        '!!!,Anon,,9781234567890,paperback,read,2024/01/01,,,1,,,,,,,,4.0,,,,,No\n',
      );
      const plan = await planStorygraphImport(file, DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const slugs = realDb.select({ slug: tierListItemTable.slug }).from(tierListItemTable).all();
      expect(slugs).toEqual([{ slug: 'storygraph-9781234567890' }]);
    });

    it('appends ISBN/UID when two rows would slugify to the same value', async () => {
      const file = csvFile(
        'dup.csv',
        'Same Title,Alice,,1111111111111,paperback,read,2024/01/01,,,1,,,,,,,,5.0,,,,,No\n' +
          'Same Title,Bob,,2222222222222,paperback,read,2024/01/02,,,1,,,,,,,,5.0,,,,,No\n',
      );
      const plan = await planStorygraphImport(file, DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const slugs = realDb
        .select({ slug: tierListItemTable.slug })
        .from(tierListItemTable)
        .all()
        .map((r) => r.slug)
        .sort();
      // Title is the secondary tie-breaker, so the row sorted second by ISBN
      // gets the suffix.
      expect(slugs).toEqual(['same-title', 'same-title-2222222222222']);
    });
  });

  describe('cleanTitle', () => {
    it('verbatim returns the trimmed input unchanged', () => {
      expect(cleanTitle('Influence: The Psychology of Persuasion', 'verbatim')).toBe(
        'Influence: The Psychology of Persuasion',
      );
    });
    it('moderate splits on the LAST ": "', () => {
      expect(
        cleanTitle(
          'Hands-On Large Language Models: Language Understanding and Generation',
          'moderate',
        ),
      ).toBe('Hands-On Large Language Models');
      expect(cleanTitle('A: B: C', 'moderate')).toBe('A: B');
      expect(cleanTitle('Death March', 'moderate')).toBe('Death March');
    });
    it('full splits on the FIRST ": " and strips trailing parentheticals', () => {
      expect(cleanTitle('A: B: C', 'full')).toBe('A');
      expect(cleanTitle('Mort (Discworld, #4)', 'full')).toBe('Mort');
      expect(cleanTitle('Foo: Bar (Baz)', 'full')).toBe('Foo');
    });
    it('falls back to the raw title when cleanup leaves an empty string', () => {
      expect(cleanTitle('  : something', 'moderate')).toBe(': something');
      expect(cleanTitle('  : something', 'full')).toBe(': something');
    });
  });

  describe('primaryAuthor', () => {
    it('returns the first comma-separated author', () => {
      expect(primaryAuthor('Maarten Grootendorst, Jay Alammar')).toBe('Maarten Grootendorst');
      expect(primaryAuthor('Donald A. Norman')).toBe('Donald A. Norman');
    });
    it('returns empty for blank input', () => {
      expect(primaryAuthor('')).toBe('');
      expect(primaryAuthor('   ')).toBe('');
    });
  });

  describe('plan + commit: end-to-end', () => {
    it('imports the sample fixture into a fresh "Books" category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      const result = await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      expect(result.errors).toEqual([]);
      expect(result.inserted.categories).toBe(1);
      expect(result.inserted.items).toBe(14);
    });

    it('maps Star Rating linearly onto scores via rating * 20 (preserves fractional ratings)', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const influence = realDb
        .select()
        .from(tierListItemTable)
        .where(and(eq(tierListItemTable.slug, 'influence'), isNull(tierListItemTable.deletedAt)))
        .get();
      expect(influence!.score).toBe(100); // 5.0 → 100

      const handsOn = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'hands-on-large-language-models'))
        .get();
      expect(handsOn!.score).toBe(75); // 3.75 → 75 — fractional rating survives

      const powershell = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'learn-windows-powershell-in-a-month-of-lunches'))
        .get();
      expect(powershell!.score).toBe(40); // 2.0 → 40
    });

    it('writes Author by default; primary author from a comma-joined list', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const handsOn = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'hands-on-large-language-models'))
        .get();
      const props = handsOn!.props ?? [];
      expect(props.find((p) => p.key === 'Author')?.value).toBe('Maarten Grootendorst');
    });

    it('isbnKey=isbn emits ISBN13 for 13-digit values and skips ASIN-shaped UIDs', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      // ISBN row: Influence has a 13-digit ISBN.
      const influence = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'influence'))
        .get();
      expect((influence!.props ?? []).find((p) => p.key === 'ISBN13')?.value).toBe('9780061241895');
      // ASIN row: The Culture Map has B00IHGVQ9I — not ISBN-shaped.
      const culture = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'the-culture-map'))
        .get();
      const cultureProps = culture!.props ?? [];
      expect(cultureProps.find((p) => p.key === 'ISBN13')).toBeUndefined();
      expect(cultureProps.find((p) => p.key === 'UID')).toBeUndefined();
    });

    it('isbnKey=uid stores every non-empty value under a UID property', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), {
        ...DEFAULTS,
        isbnKey: 'uid',
      });
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const culture = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'the-culture-map'))
        .get();
      expect((culture!.props ?? []).find((p) => p.key === 'UID')?.value).toBe('B00IHGVQ9I');
    });

    it('isbnKey=isbn distinguishes 10-digit from 13-digit ISBNs', async () => {
      const file = csvFile(
        'isbn-shapes.csv',
        'Ten,Author,,0061241895,paperback,read,2024/01/01,,,1,,,,,,,,4.0,,,,,No\n' +
          'Thirteen,Author,,9780061241895,paperback,read,2024/01/02,,,1,,,,,,,,4.0,,,,,No\n',
      );
      const plan = await planStorygraphImport(file, DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const ten = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'ten'))
        .get();
      const thirteen = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'thirteen'))
        .get();
      expect((ten!.props ?? []).find((p) => p.key === 'ISBN')?.value).toBe('0061241895');
      expect((thirteen!.props ?? []).find((p) => p.key === 'ISBN13')?.value).toBe('9780061241895');
    });

    it('importFormat adds the Format prop and seeds the prop key', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), {
        ...DEFAULTS,
        importFormat: true,
      });
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const influence = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'influence'))
        .get();
      expect((influence!.props ?? []).find((p) => p.key === 'Format')?.value).toBe('paperback');
      const cat = realDb.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect((cat!.propKeys ?? []).find((k) => k.key === 'Format')).toEqual({ key: 'Format' });
    });

    it('does NOT import the Review column (HTML in reviews stays out of item data)', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const handsOn = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'hands-on-large-language-models'))
        .get();
      // No prop carries the review; description is left blank.
      expect(handsOn!.description).toBe('');
      expect(JSON.stringify(handsOn!.props ?? [])).not.toMatch(/<div>|<em>|<br>/i);
    });

    it('placeholders=false drops the gradient', async () => {
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), {
        ...DEFAULTS,
        placeholders: false,
      });
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const item = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'influence'))
        .get();
      expect(item!.placeholder).toBeNull();
    });

    it('seeds the new category with the StoryGraph tier cutoffs', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const cat = realDb.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      expect(cat!.cutoffS).toBe(90);
      expect(cat!.cutoffA).toBe(70);
      expect(cat!.cutoffB).toBe(50);
      expect(cat!.cutoffC).toBe(30);
      expect(cat!.cutoffD).toBe(20);
      expect(cat!.cutoffE).toBe(10);
      expect(cat!.cutoffF).toBe(0);
    });

    it('seeds Author with showOnCard', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const cat = realDb.select().from(categoryTable).where(eq(categoryTable.slug, 'books')).get();
      const keys = cat!.propKeys ?? [];
      expect(keys.find((k) => k.key === 'Author')).toEqual({ key: 'Author', showOnCard: true });
    });
  });

  describe('plan: sort and tie-breakers', () => {
    it('sorts by Star Rating desc with title as the secondary tie-breaker by default', async () => {
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const items = realDb
        .select({ name: tierListItemTable.name, score: tierListItemTable.score })
        .from(tierListItemTable)
        .where(isNull(tierListItemTable.deletedAt))
        .orderBy(tierListItemTable.order)
        .all();
      const scoresInOrder = items.map((i) => i.score);
      expect(scoresInOrder).toEqual([...scoresInOrder].sort((a, b) => b - a));

      // Within the 5-star (score 100) bucket, alphabetical.
      const fiveStar = items.filter((i) => i.score === 100).map((i) => i.name);
      expect(fiveStar).toEqual([...fiveStar].sort((a, b) => a.localeCompare(b)));
    });

    it('dateAddedDesc orders ties by Date Added newest first', async () => {
      const file = csvFile(
        'tie.csv',
        'Older,Author,,1111111111111,paperback,read,2024/01/01,,,1,,,,,,,,3.0,,,,,No\n' +
          'Newer,Author,,2222222222222,paperback,read,2024/06/01,,,1,,,,,,,,3.0,,,,,No\n',
      );
      const plan = await planStorygraphImport(file, { ...DEFAULTS, sortBy: 'dateAddedDesc' });
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const items = realDb
        .select({ name: tierListItemTable.name })
        .from(tierListItemTable)
        .orderBy(tierListItemTable.order)
        .all();
      expect(items.map((i) => i.name)).toEqual(['Newer', 'Older']);
    });

    it('dateAddedAsc orders ties by Date Added oldest first; ISBN/UID is the final tie-breaker', async () => {
      const file = csvFile(
        'tie.csv',
        'A,Author,,1111111111111,paperback,read,2024/01/01,,,1,,,,,,,,3.0,,,,,No\n' +
          'B,Author,,2222222222222,paperback,read,2024/01/01,,,1,,,,,,,,3.0,,,,,No\n',
      );
      const plan = await planStorygraphImport(file, { ...DEFAULTS, sortBy: 'dateAddedAsc' });
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      await commitStorygraphImport(plan.planId, [BOOKS_MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const items = realDb
        .select({ name: tierListItemTable.name })
        .from(tierListItemTable)
        .orderBy(tierListItemTable.order)
        .all();
      // Same date → ISBN/UID lexicographic tiebreak: 1111... < 2222...
      expect(items.map((i) => i.name)).toEqual(['A', 'B']);
    });
  });

  describe('commit: error and skip paths', () => {
    it('returns an error when the plan id is unknown', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const result = await commitStorygraphImport(
        '00000000-0000-4000-8000-000000000999',
        [BOOKS_MAPPING],
        'skip',
        db,
      );
      expect(result.errors[0]).toMatch(/not found|ENOENT|expired/i);
    });

    it('marks every item as skipped when the mapping action is skip', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      const result = await commitStorygraphImport(
        plan.planId,
        [{ fileSlug: 'books', action: 'skip' }],
        'skip',
        db,
      );
      expect(result.skipped.categories).toBe(1);
      expect(result.skipped.items).toBe(14);
      expect(result.inserted.items).toBe(0);
    });

    it('errors when no mapping is provided for the books category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      const result = await commitStorygraphImport(plan.planId, [], 'skip', db);
      expect(result.errors[0]).toMatch(/No mapping/);
      expect(result.skipped.categories).toBe(1);
    });

    it('merges prop keys and fills missing cutoffs on use-existing without overriding present ones', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitStorygraphImport>[3];
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-0000000000aa',
          slug: 'books',
          name: 'Books',
          description: null,
          order: 0,
          cutoffS: 95,
          propKeys: [{ key: 'Author' }, { key: 'Genre' }],
        })
        .run();
      const plan = await planStorygraphImport(fileFromFixture('storygraph-sample.csv'), DEFAULTS);
      await commitStorygraphImport(
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
      expect(cat!.cutoffS).toBe(95); // user-set, preserved
      expect(cat!.cutoffA).toBe(70); // filled from defaults
      const keys = cat!.propKeys ?? [];
      expect(keys.map((k) => k.key)).toEqual(['Author', 'Genre']);
    });
  });
});
