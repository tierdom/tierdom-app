import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';

// Soft-delete imports `images.ts`, which reads `$env/dynamic/private` and
// loads `sharp` — stub both so the module graph imports cleanly in vitest.
vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: '/tmp/test' } }));
vi.mock('sharp', () => ({ default: vi.fn() }));

import * as schema from './schema';
import { category, categoryTable, tierListItem, tierListItemTable } from './schema';
import {
  SoftDeleteError,
  listTrashed,
  permanentlyDeleteCategory,
  permanentlyDeleteItem,
  restoreCategory,
  restoreItem,
  softDeleteCategory,
  softDeleteItem
} from './soft-delete';

type DB = ReturnType<typeof makeDb>;

function makeDb() {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

function seedCategory(db: DB, slug: string, name = slug) {
  const [row] = db
    .insert(categoryTable)
    .values({ slug, name, order: 0 })
    .returning({ id: categoryTable.id })
    .all();
  return row.id;
}

function seedItem(
  db: DB,
  categoryId: string,
  slug: string,
  opts: { score?: number; imageHash?: string } = {}
) {
  const [row] = db
    .insert(tierListItemTable)
    .values({
      categoryId,
      slug,
      name: slug,
      score: opts.score ?? 50,
      order: 0,
      imageHash: opts.imageHash ?? null
    })
    .returning({ id: tierListItemTable.id })
    .all();
  return row.id;
}

describe('softDeleteCategory', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
  });

  it('cascades soft-delete to all active items in the category', () => {
    expect.assertions(4);
    const catId = seedCategory(db, 'games');
    const itemA = seedItem(db, catId, 'a');
    const itemB = seedItem(db, catId, 'b');

    softDeleteCategory(db, catId);

    const cat = db.select().from(categoryTable).where(eq(categoryTable.id, catId)).get();
    const items = db
      .select()
      .from(tierListItemTable)
      .where(eq(tierListItemTable.categoryId, catId))
      .all();

    expect(cat?.deletedAt).not.toBeNull();
    expect(items.every((i) => i.deletedAt === cat?.deletedAt)).toBe(true);
    // Cascade flag is what links the items to the category-restore, not
    // the timestamp — same-millisecond standalone deletes won't collide.
    expect(items.every((i) => i.deletedWithCascade === true)).toBe(true);
    expect([itemA, itemB].sort()).toEqual(items.map((i) => i.id).sort());
  });

  it('leaves items in another category untouched', () => {
    expect.assertions(2);
    const catA = seedCategory(db, 'a');
    const catB = seedCategory(db, 'b');
    seedItem(db, catA, 'in-a');
    const otherId = seedItem(db, catB, 'in-b');

    softDeleteCategory(db, catA);

    const other = db
      .select()
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, otherId))
      .get();
    const catBRow = db.select().from(categoryTable).where(eq(categoryTable.id, catB)).get();
    expect(other?.deletedAt).toBeNull();
    expect(catBRow?.deletedAt).toBeNull();
  });

  it('does not touch items the user trashed earlier (no flag, original timestamp kept)', () => {
    expect.assertions(3);
    const catId = seedCategory(db, 'games');
    const standalone = seedItem(db, catId, 'standalone');
    const sibling = seedItem(db, catId, 'sibling');

    softDeleteItem(db, standalone);
    const before = db
      .select()
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, standalone))
      .get();

    softDeleteCategory(db, catId);

    const standaloneAfter = db
      .select()
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, standalone))
      .get();
    const siblingAfter = db
      .select()
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, sibling))
      .get();

    expect(standaloneAfter?.deletedAt).toBe(before?.deletedAt);
    expect(standaloneAfter?.deletedWithCascade).toBeNull();
    expect(siblingAfter?.deletedWithCascade).toBe(true);
  });

  it('is a no-op when the category is already in trash', () => {
    expect.assertions(1);
    const catId = seedCategory(db, 'games');
    softDeleteCategory(db, catId);
    const tsBefore = db
      .select({ deletedAt: categoryTable.deletedAt })
      .from(categoryTable)
      .where(eq(categoryTable.id, catId))
      .get()?.deletedAt;

    softDeleteCategory(db, catId);

    const tsAfter = db
      .select({ deletedAt: categoryTable.deletedAt })
      .from(categoryTable)
      .where(eq(categoryTable.id, catId))
      .get()?.deletedAt;
    expect(tsAfter).toBe(tsBefore);
  });
});

describe('restoreCategory', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
  });

  it('restores the category and only the items cascade-deleted with it', () => {
    expect.assertions(3);
    const catId = seedCategory(db, 'games');
    const cascaded = seedItem(db, catId, 'cascaded');
    const standalone = seedItem(db, catId, 'standalone');

    softDeleteItem(db, standalone);
    softDeleteCategory(db, catId);
    restoreCategory(db, catId);

    const cat = db
      .select({ deletedAt: categoryTable.deletedAt })
      .from(categoryTable)
      .where(eq(categoryTable.id, catId))
      .get();
    const cascadedRow = db
      .select({ deletedAt: tierListItemTable.deletedAt })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, cascaded))
      .get();
    const standaloneRow = db
      .select({ deletedAt: tierListItemTable.deletedAt })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, standalone))
      .get();

    expect(cat?.deletedAt).toBeNull();
    expect(cascadedRow?.deletedAt).toBeNull();
    expect(standaloneRow?.deletedAt).not.toBeNull();
  });

  it('throws SoftDeleteError when slug is taken by an active category', () => {
    expect.assertions(2);
    const catId = seedCategory(db, 'games');
    softDeleteCategory(db, catId);
    seedCategory(db, 'games', 'New Games');

    let err: unknown;
    try {
      restoreCategory(db, catId);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(SoftDeleteError);
    expect((err as SoftDeleteError).code).toBe('slug_conflict');
  });

  it('is a no-op when the category was never trashed', () => {
    expect.assertions(1);
    const catId = seedCategory(db, 'games');
    expect(() => restoreCategory(db, catId)).not.toThrow();
  });

  it('clears the cascade flag on items it brings back', () => {
    expect.assertions(1);
    const catId = seedCategory(db, 'games');
    const itemId = seedItem(db, catId, 'a');
    softDeleteCategory(db, catId);
    restoreCategory(db, catId);

    const row = db.select().from(tierListItemTable).where(eq(tierListItemTable.id, itemId)).get();
    expect(row?.deletedWithCascade).toBeNull();
  });
});

describe('restoreItem', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
  });

  it('restores a standalone-trashed item', () => {
    expect.assertions(1);
    const catId = seedCategory(db, 'games');
    const itemId = seedItem(db, catId, 'a');

    softDeleteItem(db, itemId);
    restoreItem(db, itemId);

    const row = db
      .select({ deletedAt: tierListItemTable.deletedAt })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, itemId))
      .get();
    expect(row?.deletedAt).toBeNull();
  });

  it('refuses to restore when the parent category is in trash', () => {
    expect.assertions(2);
    const catId = seedCategory(db, 'games');
    const itemId = seedItem(db, catId, 'a');
    softDeleteCategory(db, catId);

    let err: unknown;
    try {
      restoreItem(db, itemId);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(SoftDeleteError);
    expect((err as SoftDeleteError).code).toBe('parent_in_trash');
  });

  it('refuses to restore when an active sibling has taken the slug', () => {
    expect.assertions(2);
    const catId = seedCategory(db, 'games');
    const itemId = seedItem(db, catId, 'a');
    softDeleteItem(db, itemId);
    seedItem(db, catId, 'a');

    let err: unknown;
    try {
      restoreItem(db, itemId);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(SoftDeleteError);
    expect((err as SoftDeleteError).code).toBe('slug_conflict');
  });

  it('is a no-op when the item was never trashed', () => {
    expect.assertions(1);
    const catId = seedCategory(db, 'games');
    const itemId = seedItem(db, catId, 'a');
    expect(() => restoreItem(db, itemId)).not.toThrow();
  });
});

describe('softDeleteItem edge cases', () => {
  it('is a no-op for an unknown id', () => {
    expect.assertions(1);
    const db = makeDb();
    expect(() => softDeleteItem(db, 'no-such-id')).not.toThrow();
  });
});

describe('permanentlyDeleteCategory', () => {
  let db: DB;
  let images: string[];
  let stubDelete: (h: string) => void;
  beforeEach(() => {
    db = makeDb();
    images = [];
    stubDelete = (h: string) => images.push(h);
  });

  it('cleans every item image (including already-trashed ones) then drops the rows', () => {
    expect.assertions(3);
    const catId = seedCategory(db, 'games');
    const liveId = seedItem(db, catId, 'a', { imageHash: 'live123' });
    const trashedId = seedItem(db, catId, 'b', { imageHash: 'trashed456' });
    softDeleteItem(db, trashedId);

    permanentlyDeleteCategory(db, catId, stubDelete);

    expect(images.sort()).toEqual(['live123', 'trashed456']);
    expect(db.select().from(categoryTable).where(eq(categoryTable.id, catId)).all()).toHaveLength(
      0
    );
    // FK CASCADE drops items.
    expect(
      db.select().from(tierListItemTable).where(eq(tierListItemTable.id, liveId)).all()
    ).toHaveLength(0);
  });

  it('skips deleteImage for items without an image hash', () => {
    expect.assertions(1);
    const catId = seedCategory(db, 'games');
    seedItem(db, catId, 'a');
    permanentlyDeleteCategory(db, catId, stubDelete);
    expect(images).toEqual([]);
  });

  it('is a no-op for an unknown id', () => {
    expect.assertions(1);
    expect(() => permanentlyDeleteCategory(db, 'no-such-id', stubDelete)).not.toThrow();
  });
});

describe('permanentlyDeleteItem', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
  });

  it('removes the row and cleans the image when present', () => {
    expect.assertions(2);
    const catId = seedCategory(db, 'games');
    const itemId = seedItem(db, catId, 'a', { imageHash: 'abc' });
    const seen: string[] = [];

    permanentlyDeleteItem(db, itemId, (h) => seen.push(h));

    expect(seen).toEqual(['abc']);
    expect(
      db.select().from(tierListItemTable).where(eq(tierListItemTable.id, itemId)).all()
    ).toHaveLength(0);
  });

  it('does not call deleteImage when the item has no image', () => {
    expect.assertions(1);
    const catId = seedCategory(db, 'games');
    const itemId = seedItem(db, catId, 'a');
    const seen: string[] = [];
    permanentlyDeleteItem(db, itemId, (h) => seen.push(h));
    expect(seen).toEqual([]);
  });

  it('is a no-op for an unknown id', () => {
    expect.assertions(1);
    expect(() => permanentlyDeleteItem(db, 'no-such-id', () => {})).not.toThrow();
  });
});

describe('listTrashed', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
  });

  it('lists trashed categories and standalone-trashed items, hiding cascaded items', () => {
    expect.assertions(3);
    const liveCat = seedCategory(db, 'live');
    const trashedCat = seedCategory(db, 'trashed');
    const standalone = seedItem(db, liveCat, 'standalone');
    seedItem(db, trashedCat, 'cascaded');

    softDeleteItem(db, standalone);
    softDeleteCategory(db, trashedCat);

    const result = listTrashed(db);
    expect(result.categories.map((c) => c.slug)).toEqual(['trashed']);
    expect(result.items.map((i) => i.slug)).toEqual(['standalone']);
    // Cascaded item's slug is not in the items list — its category covers it.
    expect(result.items.find((i) => i.slug === 'cascaded')).toBeUndefined();
  });

  it('returns empty when nothing is in trash', () => {
    expect.assertions(2);
    const catId = seedCategory(db, 'live');
    seedItem(db, catId, 'a');
    const result = listTrashed(db);
    expect(result.categories).toEqual([]);
    expect(result.items).toEqual([]);
  });
});

// The headline ADR-0022 guarantee: reads via the schema's view exports
// transparently exclude soft-deleted rows. Each table+view pair is tested
// once so a regression in the view definition (or a future column-add that
// forgets to recreate the view) is caught here, not in production.
describe('view-based read filter (ADR-0022)', () => {
  it('excludes soft-deleted categories from the active view', () => {
    expect.assertions(2);
    const db = makeDb();
    const liveId = seedCategory(db, 'live');
    const trashedId = seedCategory(db, 'trashed');
    softDeleteCategory(db, trashedId);

    const all = db.select({ id: categoryTable.id }).from(categoryTable).all();
    const active = db.select({ id: category.id }).from(category).all();
    expect(all.map((r) => r.id).sort()).toEqual([liveId, trashedId].sort());
    expect(active.map((r) => r.id)).toEqual([liveId]);
  });

  it('excludes soft-deleted items from the active view', () => {
    expect.assertions(2);
    const db = makeDb();
    const catId = seedCategory(db, 'live');
    const liveItem = seedItem(db, catId, 'live');
    const trashedItem = seedItem(db, catId, 'trashed');
    softDeleteItem(db, trashedItem);

    const all = db.select({ id: tierListItemTable.id }).from(tierListItemTable).all();
    const active = db.select({ id: tierListItem.id }).from(tierListItem).all();
    expect(all.map((r) => r.id).sort()).toEqual([liveItem, trashedItem].sort());
    expect(active.map((r) => r.id)).toEqual([liveItem]);
  });
});
