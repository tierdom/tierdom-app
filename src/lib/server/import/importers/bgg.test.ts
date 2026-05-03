import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, isNull } from 'drizzle-orm';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const { TMP_ROOT } = vi.hoisted(() => ({
  TMP_ROOT: `/tmp/tierdom-bgg-test-${process.pid}-${Date.now()}`,
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
  bggImporter,
  buildDescription,
  commitBggImport,
  formatPlayers,
  planBggImport,
} from './bgg';
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
  collection: 'rated',
  unratedRows: 'skip',
  importYear: true,
  importPlayers: true,
  sortBy: 'title',
  placeholders: true,
};

const MAPPING: CategoryMapping = {
  fileSlug: 'board-games',
  action: 'create-new',
  slug: 'board-games',
  name: 'Board Games',
};

beforeAll(() => mkdirSync(TMP_ROOT, { recursive: true }));
afterAll(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

describe('bgg importer', () => {
  beforeEach(() => {
    rmSync(IMPORTS_DIR, { recursive: true, force: true });
  });

  describe('static metadata', () => {
    it('exposes the configure options the route handler renders', () => {
      expect(bggImporter.status).toBe('available');
      expect(bggImporter.options?.map((o) => o.id)).toEqual([
        'collection',
        'unratedRows',
        'importYear',
        'importPlayers',
        'sortBy',
        'placeholders',
      ]);
    });

    it('plan and commit on the importer object delegate to the exported functions', async () => {
      const file = fileFromFixture('bgg-malformed.csv');
      const plan = await bggImporter.plan!(file, DEFAULTS);
      expect(plan.errors[0]).toMatch(/Missing required BoardGameGeek columns/);
      const result = await bggImporter.commit!(
        '00000000-0000-4000-8000-000000000000',
        [MAPPING],
        'skip',
      );
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('plan: header validation', () => {
    it('rejects a CSV missing required headers', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-malformed.csv'), DEFAULTS);
      expect(plan.planId).toBe('');
      expect(plan.errors[0]).toMatch(/Missing required BoardGameGeek columns/);
      expect(plan.errors[0]).toMatch(/own/);
    });

    it('rejects oversized files before parsing', async () => {
      const huge = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.csv', { type: 'text/csv' });
      const plan = await planBggImport(huge, DEFAULTS);
      expect(plan.planId).toBe('');
      expect(plan.errors[0]).toMatch(/maximum is/);
    });
  });

  describe('plan: synthetic category', () => {
    it('always proposes the "board-games" / "Board Games" category', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      expect(plan.errors).toEqual([]);
      expect(plan.categories).toHaveLength(1);
      expect(plan.categories[0]!.fileSlug).toBe('board-games');
      expect(plan.categories[0]!.fileName).toBe('Board Games');
    });
  });

  describe('plan: matchedExisting', () => {
    it('sets matchedExistingId/Name when a category with the synthetic slug already exists', async () => {
      const db = makeDb();
      db.insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-0000000000bb',
          slug: 'board-games',
          name: 'My Games',
          description: null,
          order: 0,
        })
        .run();
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS, db);
      expect(plan.categories[0]!.matchedExistingId).toBe('00000000-0000-4000-8000-0000000000bb');
      expect(plan.categories[0]!.matchedExistingName).toBe('My Games');
    });

    it('returns matchedExisting nulls when the slug is free', async () => {
      const db = makeDb();
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS, db);
      expect(plan.categories[0]!.matchedExistingId).toBeNull();
      expect(plan.categories[0]!.matchedExistingName).toBeNull();
    });
  });

  describe('plan: collection filter', () => {
    it('default rated keeps rows with rating > 0 (17 of 20 in the sample)', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      expect(plan.categories[0]!.itemCount).toBe(17);
    });

    it('owned keeps own=1 rows', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        collection: 'owned',
        unratedRows: 'import',
      });
      expect(plan.categories[0]!.itemCount).toBe(10);
    });

    it('ownedOrPrev keeps own=1 OR prevowned=1', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        collection: 'ownedOrPrev',
        unratedRows: 'import',
      });
      expect(plan.categories[0]!.itemCount).toBe(13);
    });

    it('wishlist keeps wishlist OR wanttobuy OR wanttoplay rows', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        collection: 'wishlist',
        unratedRows: 'import',
      });
      expect(plan.categories[0]!.itemCount).toBe(4);
    });

    it('all keeps every row', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        collection: 'all',
        unratedRows: 'import',
      });
      expect(plan.categories[0]!.itemCount).toBe(20);
    });
  });

  describe('plan: unratedRows', () => {
    it('skips unrated rows by default within the collection slice', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        collection: 'wishlist',
      });
      // 4 wishlist-like rows, but 3 are unrated; only Sky Team (rated 7)
      // survives unratedRows=skip.
      expect(plan.categories[0]!.itemCount).toBe(1);
    });

    it('imports unrated rows with score 0 when unratedRows=import', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        collection: 'all',
        unratedRows: 'import',
      });
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const archeOlogic = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'archeologic'))
        .get();
      expect(archeOlogic!.score).toBe(0);
    });
  });

  describe('plan: option defaults', () => {
    it('falls back to defaults when options are missing', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {});
      expect(plan.errors).toEqual([]);
      expect(plan.categories[0]!.itemCount).toBe(17);
    });
  });

  describe('plan + commit: end-to-end', () => {
    it('imports the sample fixture into a fresh "Board Games" category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      const result = await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      expect(result.errors).toEqual([]);
      expect(result.inserted.categories).toBe(1);
      expect(result.inserted.items).toBe(17);
    });

    it('maps rating 1-10 onto scores 10/.../100 (rating × 10)', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const bridge = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'bridge'))
        .get();
      expect(bridge!.score).toBe(100); // rating 10 → 100
      const risk = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'risk'))
        .get();
      expect(risk!.score).toBe(20); // rating 2 → 20
    });

    it('writes Year and Players props by default; collapses min==max to a single number', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const bridge = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'bridge'))
        .get();
      const props = bridge!.props ?? [];
      // Bridge: 1925, 4-4 players → "4"
      expect(props.find((p) => p.key === 'Year')?.value).toBe('1925');
      expect(props.find((p) => p.key === 'Players')?.value).toBe('4');

      const codenames = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'codenames'))
        .get();
      // Codenames: 2-8 players
      expect((codenames!.props ?? []).find((p) => p.key === 'Players')?.value).toBe('2-8');
    });

    it('omits Year and Players props when their checkboxes are off', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        importYear: false,
        importPlayers: false,
      });
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const bridge = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'bridge'))
        .get();
      const props = bridge!.props ?? [];
      expect(props.find((p) => p.key === 'Year')).toBeUndefined();
      expect(props.find((p) => p.key === 'Players')).toBeUndefined();
      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.slug, 'board-games'))
        .get();
      const keys = cat!.propKeys ?? [];
      expect(keys.find((k) => k.key === 'Year')).toBeUndefined();
      expect(keys.find((k) => k.key === 'Players')).toBeUndefined();
    });

    it('seeds the new category with the BGG tier cutoffs', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.slug, 'board-games'))
        .get();
      expect(cat!.cutoffS).toBe(91);
      expect(cat!.cutoffA).toBe(81);
      expect(cat!.cutoffB).toBe(71);
      expect(cat!.cutoffC).toBe(60);
      expect(cat!.cutoffD).toBe(50);
      expect(cat!.cutoffE).toBe(40);
      expect(cat!.cutoffF).toBe(0);
    });

    it('seeds Year prop key with showOnCard, Players without', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.slug, 'board-games'))
        .get();
      const keys = cat!.propKeys ?? [];
      expect(keys.find((k) => k.key === 'Year')).toEqual({ key: 'Year', showOnCard: true });
      expect(keys.find((k) => k.key === 'Players')).toEqual({ key: 'Players' });
    });

    it('builds description: comment + blank line + BGG link', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const go = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'go'))
        .get();
      expect(go!.description).toBe(
        "Ancient game of strategy. Endless depth.\n\n[BGG Link for 'Go'](https://boardgamegeek.com/boardgame/188)",
      );
    });

    it('builds description: link only when comment is empty', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const azul = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'azul'))
        .get();
      expect(azul!.description).toBe(
        "[BGG Link for 'Azul'](https://boardgamegeek.com/boardgame/230802)",
      );
    });

    it('placeholders=false drops the gradient', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        placeholders: false,
      });
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const azul = realDb
        .select()
        .from(tierListItemTable)
        .where(eq(tierListItemTable.slug, 'azul'))
        .get();
      expect(azul!.placeholder).toBeNull();
    });

    it('use-existing is a no-op for cutoffs and prop keys when both are already complete', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-0000000000cc',
          slug: 'board-games',
          name: 'Board Games',
          description: null,
          order: 0,
          cutoffS: 91,
          cutoffA: 81,
          cutoffB: 71,
          cutoffC: 60,
          cutoffD: 50,
          cutoffE: 40,
          cutoffF: 0,
          propKeys: [
            { key: 'Year', showOnCard: true },
            { key: 'Players', showOnCard: true },
          ],
        })
        .run();

      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      const result = await commitBggImport(
        plan.planId,
        [
          {
            fileSlug: 'board-games',
            action: 'use-existing',
            targetId: '00000000-0000-4000-8000-0000000000cc',
          },
        ],
        'skip',
        db,
      );
      expect(result.errors).toEqual([]);

      const cat = realDb
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.id, '00000000-0000-4000-8000-0000000000cc'))
        .get();
      // Cutoffs and prop keys are unchanged.
      expect(cat!.cutoffS).toBe(91);
      expect((cat!.propKeys ?? []).map((k) => k.key)).toEqual(['Year', 'Players']);
    });

    it('merges prop keys and fills missing cutoffs on use-existing without overriding present ones', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      realDb
        .insert(categoryTable)
        .values({
          id: '00000000-0000-4000-8000-0000000000aa',
          slug: 'board-games',
          name: 'Board Games',
          description: null,
          order: 0,
          cutoffS: 95, // user-set, must not be overridden
          propKeys: [{ key: 'Players' }, { key: 'Genre' }],
        })
        .run();

      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      await commitBggImport(
        plan.planId,
        [
          {
            fileSlug: 'board-games',
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
      expect(cat!.cutoffA).toBe(81);
      expect(cat!.cutoffD).toBe(50);
      const keys = cat!.propKeys ?? [];
      expect(keys.map((k) => k.key)).toEqual(['Players', 'Genre', 'Year']);
    });
  });

  describe('plan: sort and tie-breakers', () => {
    it('sorts by rating desc with title as the secondary tie-breaker by default', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const items = realDb
        .select({ name: tierListItemTable.name, score: tierListItemTable.score })
        .from(tierListItemTable)
        .where(isNull(tierListItemTable.deletedAt))
        .orderBy(tierListItemTable.order)
        .all();
      const scoresInOrder = items.map((i) => i.score);
      const sorted = [...scoresInOrder].sort((a, b) => b - a);
      expect(scoresInOrder).toEqual(sorted);
      // Within the rating=10 (score 100) bucket, alphabetical by title.
      const tens = items.filter((i) => i.score === 100).map((i) => i.name);
      expect(tens).toEqual([
        'Bridge',
        'Chess',
        'Diplomacy',
        'Go',
        'Klaverjassen',
        'Magic: The Gathering',
      ]);
    });

    it('yearAsc orders ties by yearpublished oldest first', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        sortBy: 'yearAsc',
      });
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const tens = realDb
        .select({ name: tierListItemTable.name })
        .from(tierListItemTable)
        .where(eq(tierListItemTable.score, 100))
        .orderBy(tierListItemTable.order)
        .all()
        .map((r) => r.name);
      // Go (-2200), Chess (1475), Klaverjassen (1890), Bridge (1925),
      // Diplomacy (1959), Magic (1993).
      expect(tens).toEqual([
        'Go',
        'Chess',
        'Klaverjassen',
        'Bridge',
        'Diplomacy',
        'Magic: The Gathering',
      ]);
    });

    it('yearDesc orders ties by yearpublished newest first', async () => {
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), {
        ...DEFAULTS,
        sortBy: 'yearDesc',
      });
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const tens = realDb
        .select({ name: tierListItemTable.name })
        .from(tierListItemTable)
        .where(eq(tierListItemTable.score, 100))
        .orderBy(tierListItemTable.order)
        .all()
        .map((r) => r.name);
      expect(tens).toEqual([
        'Magic: The Gathering',
        'Diplomacy',
        'Bridge',
        'Klaverjassen',
        'Chess',
        'Go',
      ]);
    });

    it('playsDesc orders ties by numplays most first; objectid is the final tie-breaker', async () => {
      // Inline CSV — the real fixture has numplays=0 across the board, so a
      // dedicated mini-CSV is the cleanest way to exercise this path.
      const csv =
        'objectname,objectid,rating,numplays,own,fortrade,want,wanttobuy,wanttoplay,prevowned,wishlist,comment,minplayers,maxplayers,yearpublished\n' +
        '"Game A","100","8","12","1","0","0","0","0","0","0","","2","4","2020"\n' +
        '"Game B","200","8","5","1","0","0","0","0","0","0","","2","4","2020"\n' +
        // Same rating + same plays → falls through to objectid string compare.
        '"Game C","300","8","12","1","0","0","0","0","0","0","","2","4","2020"\n';
      const file = new File([csv], 'plays.csv', { type: 'text/csv' });
      const plan = await planBggImport(file, { ...DEFAULTS, sortBy: 'playsDesc' });
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const names = realDb
        .select({ name: tierListItemTable.name })
        .from(tierListItemTable)
        .orderBy(tierListItemTable.order)
        .all()
        .map((r) => r.name);
      // Plays 12 first (Game A and Game C tied → objectid 100 < 300, so A
      // before C), then plays 5 (Game B).
      expect(names).toEqual(['Game A', 'Game C', 'Game B']);
    });
  });

  describe('plan: slug fallback and dedup', () => {
    it('falls back to a bgg-<objectid> slug when the title slugifies to empty', async () => {
      const csv =
        'objectname,objectid,rating,numplays,own,fortrade,want,wanttobuy,wanttoplay,prevowned,wishlist,comment,minplayers,maxplayers,yearpublished\n' +
        '!!!,999,7,0,1,0,0,0,0,0,0,,2,4,2020\n';
      const file = new File([csv], 'empty-slug.csv', { type: 'text/csv' });
      const plan = await planBggImport(file, DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const slugs = realDb.select({ slug: tierListItemTable.slug }).from(tierListItemTable).all();
      expect(slugs).toEqual([{ slug: 'bgg-999' }]);
    });

    it('appends objectid when two rows would slugify to the same value', async () => {
      const csv =
        'objectname,objectid,rating,numplays,own,fortrade,want,wanttobuy,wanttoplay,prevowned,wishlist,comment,minplayers,maxplayers,yearpublished\n' +
        '"Same Title","111","8","0","1","0","0","0","0","0","0","","2","4","2020"\n' +
        '"Same Title","222","8","0","1","0","0","0","0","0","0","","2","4","2020"\n';
      const file = new File([csv], 'dup.csv', { type: 'text/csv' });
      const plan = await planBggImport(file, DEFAULTS);
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      await commitBggImport(plan.planId, [MAPPING], 'skip', db);
      const realDb = db as unknown as ReturnType<typeof makeDb>;
      const slugs = realDb
        .select({ slug: tierListItemTable.slug })
        .from(tierListItemTable)
        .all()
        .map((r) => r.slug)
        .sort();
      expect(slugs).toEqual(['same-title', 'same-title-222']);
    });
  });

  describe('formatPlayers', () => {
    it('collapses min==max to a single number', () => {
      expect(formatPlayers('2', '2')).toBe('2');
      expect(formatPlayers('4', '4')).toBe('4');
    });
    it('renders a range when min < max', () => {
      expect(formatPlayers('2', '6')).toBe('2-6');
    });
    it('handles missing fields gracefully', () => {
      expect(formatPlayers('', '')).toBe('');
      expect(formatPlayers('2', '')).toBe('2');
      expect(formatPlayers('', '4')).toBe('4');
    });
  });

  describe('buildDescription', () => {
    it('combines comment and BGG link with a blank line', () => {
      expect(buildDescription('Catan', '13', 'Classic.')).toBe(
        "Classic.\n\n[BGG Link for 'Catan'](https://boardgamegeek.com/boardgame/13)",
      );
    });
    it('returns just the link when the comment is empty or whitespace', () => {
      expect(buildDescription('Catan', '13', '')).toBe(
        "[BGG Link for 'Catan'](https://boardgamegeek.com/boardgame/13)",
      );
      expect(buildDescription('Catan', '13', '   ')).toBe(
        "[BGG Link for 'Catan'](https://boardgamegeek.com/boardgame/13)",
      );
    });
    it('returns just the comment when objectid is missing', () => {
      expect(buildDescription('Catan', '', 'Classic.')).toBe('Classic.');
    });
    it('returns empty when both are missing', () => {
      expect(buildDescription('Catan', '', '')).toBe('');
    });
    it("strips ']' from the title so it can't terminate the link text early", () => {
      expect(buildDescription('Foo]Bar', '13', '')).toBe(
        "[BGG Link for 'FooBar'](https://boardgamegeek.com/boardgame/13)",
      );
    });
  });

  describe('commit: error and skip paths', () => {
    it('returns an error when the plan id is unknown', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const result = await commitBggImport(
        '00000000-0000-4000-8000-000000000999',
        [MAPPING],
        'skip',
        db,
      );
      expect(result.errors[0]).toMatch(/not found|ENOENT|expired/i);
    });

    it('marks every item as skipped when the mapping action is skip', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      const result = await commitBggImport(
        plan.planId,
        [{ fileSlug: 'board-games', action: 'skip' }],
        'skip',
        db,
      );
      expect(result.skipped.categories).toBe(1);
      expect(result.skipped.items).toBe(17);
      expect(result.inserted.items).toBe(0);
    });

    it('errors when no mapping is provided for the board-games category', async () => {
      const db = makeDb() as unknown as Parameters<typeof commitBggImport>[3];
      const plan = await planBggImport(fileFromFixture('bgg-sample.csv'), DEFAULTS);
      const result = await commitBggImport(plan.planId, [], 'skip', db);
      expect(result.errors[0]).toMatch(/No mapping/);
      expect(result.skipped.categories).toBe(1);
    });
  });
});
