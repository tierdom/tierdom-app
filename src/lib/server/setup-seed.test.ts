import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

// setup-seed transitively imports seed-images → sharp → $env. Stub both.
vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: '/tmp/test' } }));
vi.mock('sharp', () => ({ default: vi.fn() }));

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
    expect(cats[0].slug).toBe('tier-list');
    const items = db.select().from(tierListItemTable).all();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Sample Item');
  });

  it('"demo" seeds the full content set', async () => {
    await seedPreset(db, 'demo');
    expect(db.select().from(page).all().length).toBeGreaterThan(0);
    expect(db.select().from(categoryTable).all().length).toBeGreaterThan(0);
    expect(db.select().from(tierListItemTable).all().length).toBeGreaterThan(0);
  });
});
