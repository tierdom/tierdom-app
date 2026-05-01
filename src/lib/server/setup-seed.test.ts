import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';

// setup-seed transitively imports seed-images → sharp → $env. Stub both.
vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: '/tmp/test' } }));
vi.mock('sharp', () => ({ default: vi.fn() }));

// Mock seed-images so the with-images test can simulate the real UPDATE
// pattern (which is what was triggering the updated_at bug). Default impl
// is a no-op so other tests are unaffected.
const generateSeedImagesMock =
  vi.fn<(db: BetterSQLite3Database<typeof schema>, dataPath: string) => Promise<number>>();
generateSeedImagesMock.mockImplementation(async () => 0);
vi.mock('$lib/server/db/seed-images', () => ({
  generateSeedImages: (db: BetterSQLite3Database<typeof schema>, dataPath: string) =>
    generateSeedImagesMock(db, dataPath),
}));

import * as schema from './db/schema';
import { categoryTable, page, tierListItemTable } from './db/schema';
import { seedPreset } from './setup-seed';

type DB = BetterSQLite3Database<typeof schema>;

function makeDb(): DB {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

describe('seedPreset', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
  });

  it('throws on an unknown preset', async () => {
    await expect(seedPreset(db, 'bogus')).rejects.toThrow(/Unknown preset: bogus/);
  });

  it('"empty" creates only the home and about pages', async () => {
    await seedPreset(db, 'empty');
    const slugs = db
      .select({ slug: page.slug })
      .from(page)
      .all()
      .map((p) => p.slug)
      .sort();
    expect(slugs).toEqual(['about', 'home']);
    expect(db.select().from(categoryTable).all()).toHaveLength(0);
  });

  it('"minimal" creates pages plus one category with a sample item', async () => {
    await seedPreset(db, 'minimal');
    expect(db.select().from(page).all()).toHaveLength(2);
    const cats = db.select().from(categoryTable).all();
    expect(cats).toHaveLength(1);
    expect(cats[0]!.slug).toBe('tier-list');
    const items = db.select().from(tierListItemTable).all();
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Sample Item');
  });

  it('"demo" seeds the full content set', async () => {
    await seedPreset(db, 'demo');
    expect(db.select().from(page).all().length).toBeGreaterThan(0);
    expect(db.select().from(categoryTable).all().length).toBeGreaterThan(0);
    expect(db.select().from(tierListItemTable).all().length).toBeGreaterThan(0);
  });

  // Regression: two separate bugs caused every demo item to display as "just
  // now". (1) setup-seed used to skip timestamp randomization entirely.
  // (2) When randomization ran *before* seed-image generation, the per-item
  // UPDATE for imageHash/placeholder re-fired the updated_at trigger and
  // stamped every row with "now".
  function assertSpread(rows: { createdAt: string; updatedAt: string }[]): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    // SQLite stores timestamps as 'YYYY-MM-DD HH:MM:SS' UTC — append 'Z' to parse.
    const parse = (s: string) => new Date(s.replace(' ', 'T') + 'Z').getTime();
    const created = rows.map((r) => parse(r.createdAt));
    const updated = rows.map((r) => parse(r.updatedAt));
    expect(created.every((t) => t < oneHourAgo)).toBe(true);
    expect(created.some((t) => t < oneWeekAgo)).toBe(true);
    expect(updated.every((t) => t < oneHourAgo)).toBe(true);
    expect(updated.some((t) => t < oneWeekAgo)).toBe(true);
  }

  it('"demo" spreads created_at and updated_at into the past', async () => {
    await seedPreset(db, 'demo');
    assertSpread(db.select().from(page).all());
    assertSpread(db.select().from(categoryTable).all());
    assertSpread(db.select().from(tierListItemTable).all());
  });

  it('"demo" with images still spreads timestamps (image UPDATEs must not bump updated_at)', async () => {
    // Make the mock do exactly what the real seed-image pass does: UPDATE
    // every tier_list_item with imageHash/placeholder. This is the operation
    // that was re-firing the updated_at trigger and clobbering the spread.
    generateSeedImagesMock.mockImplementationOnce(async (database: DB) => {
      const items = database.select({ id: tierListItemTable.id }).from(tierListItemTable).all();
      for (const item of items) {
        database
          .update(tierListItemTable)
          .set({ imageHash: 'h', placeholder: 'p' })
          .where(eq(tierListItemTable.id, item.id))
          .run();
      }
      return items.length;
    });

    await seedPreset(db, 'demo', true);
    assertSpread(db.select().from(tierListItemTable).all());
  });
});
