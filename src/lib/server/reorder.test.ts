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
import { applyOrder, insertByScore, sortCategoryByScore } from './reorder';
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
      { name: 'Charlie', order: 2 },
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
      { name: 'Bravo', order: 1 },
    ]);
  });
});

describe('applyOrder', () => {
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

  function seed(name: string) {
    const [row] = db
      .insert(tierListItemTable)
      .values({ categoryId: catId, slug: name.toLowerCase(), name, score: 0, order: 999 })
      .returning({ id: tierListItemTable.id })
      .all();
    return row.id;
  }

  it('writes the position of each id as its new order', () => {
    expect.assertions(1);
    const a = seed('A');
    const b = seed('B');
    const c = seed('C');

    applyOrder(tierListItemTable, tierListItemTable.id, tierListItemTable.order, [c, a, b], db);

    const rows = db
      .select({ id: tierListItemTable.id, order: tierListItemTable.order })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.categoryId, catId))
      .all();
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.order]));
    expect(byId).toEqual({ [c]: 0, [a]: 1, [b]: 2 });
  });

  it('leaves ids not present in the orderedIds list untouched', () => {
    expect.assertions(1);
    const a = seed('A');
    const b = seed('B');

    applyOrder(tierListItemTable, tierListItemTable.id, tierListItemTable.order, [b], db);

    const aRow = db
      .select({ order: tierListItemTable.order })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, a))
      .get();
    expect(aRow?.order).toBe(999);
  });
});

describe('insertByScore', () => {
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

  function seed(name: string, score: number, order: number) {
    const [row] = db
      .insert(tierListItemTable)
      .values({ categoryId: catId, slug: name.toLowerCase(), name, score, order })
      .returning({ id: tierListItemTable.id })
      .all();
    return row.id;
  }

  it('returns 0 for the highest score in an empty-besides-self category', () => {
    expect.assertions(1);
    const id = seed('Solo', 100, 0);
    const pos = insertByScore(catId, 100, 'Solo', id, db);
    expect(pos).toBe(0);
  });

  it('returns the count of items that out-rank the new item', () => {
    expect.assertions(1);
    seed('Top', 100, 0);
    seed('Mid', 50, 1);
    const newId = seed('Low', 10, 2);

    const pos = insertByScore(catId, 10, 'Low', newId, db);
    expect(pos).toBe(2);
  });

  it('breaks ties on name ASC', () => {
    expect.assertions(2);
    seed('Alpha', 50, 0);
    seed('Charlie', 50, 1);
    const bravoId = seed('Bravo', 50, 999);

    const pos = insertByScore(catId, 50, 'Bravo', bravoId, db);
    // Alpha out-ranks Bravo (name ASC), Charlie does not.
    expect(pos).toBe(1);

    // Verify side-effect: Charlie was shifted from order=1 to order=2.
    const charlie = db
      .select({ order: tierListItemTable.order })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.name, 'Charlie'))
      .get();
    expect(charlie?.order).toBe(2);
  });

  it('shifts items with order >= insertion position by +1', () => {
    expect.assertions(1);
    const top = seed('Top', 100, 0);
    const mid = seed('Mid', 50, 1);
    const newId = seed('New', 75, 999);

    insertByScore(catId, 75, 'New', newId, db);

    const orders = db
      .select({ id: tierListItemTable.id, order: tierListItemTable.order })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.categoryId, catId))
      .all();
    const byId = Object.fromEntries(orders.map((r) => [r.id, r.order]));
    // Top stays at 0, Mid shifts from 1→2, New keeps its seed order of 999
    // (insertByScore returns the slot number; the caller writes it).
    expect(byId).toEqual({ [top]: 0, [mid]: 2, [newId]: 999 });
  });

  it('does not count the inserted item itself when computing position', () => {
    expect.assertions(1);
    seed('Top', 100, 0);
    const selfId = seed('Self', 50, 1);
    // Re-inserting the same id at the same score should still report position 1.
    const pos = insertByScore(catId, 50, 'Self', selfId, db);
    expect(pos).toBe(1);
  });
});
