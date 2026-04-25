import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { asc, eq } from 'drizzle-orm';

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: '/tmp/test' } }));
vi.mock('sharp', () => ({ default: vi.fn() }));
// Stub the singleton db so reorder.ts can be imported without opening a real
// SQLite file. Each test passes its own in-memory db to the function.
vi.mock('$lib/server/db', () => ({ db: {} }));

import * as schema from './db/schema';
import { categoryTable, tierListItemTable } from './db/schema';
import { sortCategoryByScore } from './reorder';
import { softDeleteItem } from './db/soft-delete';

type DB = ReturnType<typeof makeDb>;

function makeDb() {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

describe('sortCategoryByScore', () => {
  let db: DB;
  let catId: string;
  beforeEach(() => {
    db = makeDb();
    const [cat] = db
      .insert(categoryTable)
      .values({ slug: 'games', name: 'Games', order: 0 })
      .returning({ id: categoryTable.id })
      .all();
    catId = cat.id;
  });

  function seed(name: string, score: number) {
    const [row] = db
      .insert(tierListItemTable)
      .values({ categoryId: catId, slug: name.toLowerCase(), name, score, order: 999 })
      .returning({ id: tierListItemTable.id })
      .all();
    return row.id;
  }

  it('renumbers active items by score DESC, name ASC starting at 0', () => {
    expect.assertions(1);
    seed('Charlie', 50);
    seed('Alpha', 90);
    seed('Bravo', 50);

    sortCategoryByScore(catId, db);

    const rows = db
      .select({ name: tierListItemTable.name, order: tierListItemTable.order })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.categoryId, catId))
      .orderBy(asc(tierListItemTable.order))
      .all();
    expect(rows).toEqual([
      { name: 'Alpha', order: 0 },
      { name: 'Bravo', order: 1 },
      { name: 'Charlie', order: 2 }
    ]);
  });

  it('skips soft-deleted items so cascade-restore can reuse their original order', () => {
    expect.assertions(2);
    const trashedId = seed('Trashed', 100);
    seed('Alpha', 90);
    seed('Bravo', 50);
    softDeleteItem(db, trashedId);

    sortCategoryByScore(catId, db);

    const trashedRow = db
      .select({ order: tierListItemTable.order })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, trashedId))
      .get();
    const active = db
      .select({ name: tierListItemTable.name, order: tierListItemTable.order })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.categoryId, catId))
      .orderBy(asc(tierListItemTable.order))
      .all()
      .filter((r) => r.name !== 'Trashed');

    // The trashed item's order is left at the seed value (999) — sort only
    // touches active rows, ranked from the *_active view.
    expect(trashedRow?.order).toBe(999);
    expect(active).toEqual([
      { name: 'Alpha', order: 0 },
      { name: 'Bravo', order: 1 }
    ]);
  });
});
