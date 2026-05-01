import { and, count, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { categoryTable, tierListItemTable } from './schema';
import { deleteImage as defaultDeleteImage } from '../images';
import type * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

// Match the SQL-side timestamp format used by created_at / updated_at so the
// shared `formatRelativeDate` helper formats it correctly.
const NOW = sql`(datetime('now'))`;

/**
 * Trash older than this is considered "stale" and surfaced via the admin
 * warning banner — soft nudge to permanently delete it. Light alternative to
 * an automated housekeeping job.
 */
export const STALE_TRASH_DAYS = 60;

export type SoftDeleteErrorCode = 'slug_conflict' | 'parent_in_trash';

export class SoftDeleteError extends Error {
  constructor(
    public code: SoftDeleteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SoftDeleteError';
  }
}

/**
 * Soft-delete a category and cascade-soft-delete every active item inside it.
 * Cascaded items get `deletedWithCascade = true` as a marker so restore can
 * reverse exactly those — items the user trashed independently keep their
 * state. No-op if the category is already in trash or doesn't exist.
 */
export function softDeleteCategory(db: DB, id: string): void {
  db.transaction((tx) => {
    tx.update(categoryTable)
      .set({ deletedAt: NOW })
      .where(and(eq(categoryTable.id, id), isNull(categoryTable.deletedAt)))
      .run();
    tx.update(tierListItemTable)
      .set({ deletedAt: NOW, deletedWithCascade: true })
      .where(and(eq(tierListItemTable.categoryId, id), isNull(tierListItemTable.deletedAt)))
      .run();
  });
}

/** Soft-delete a single item. No-op if already trashed or missing. */
export function softDeleteItem(db: DB, id: string): void {
  db.update(tierListItemTable)
    .set({ deletedAt: NOW })
    .where(and(eq(tierListItemTable.id, id), isNull(tierListItemTable.deletedAt)))
    .run();
}

/**
 * Restore a category from trash, plus any items cascade-deleted at the same
 * moment. Throws SoftDeleteError('slug_conflict') if an active category now
 * holds the slug. No-op if the category isn't actually in trash.
 */
export function restoreCategory(db: DB, id: string): void {
  db.transaction((tx) => {
    const cat = tx
      .select({ slug: categoryTable.slug, deletedAt: categoryTable.deletedAt })
      .from(categoryTable)
      .where(eq(categoryTable.id, id))
      .get();
    if (!cat || !cat.deletedAt) return;

    const conflict = tx
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(and(eq(categoryTable.slug, cat.slug), isNull(categoryTable.deletedAt)))
      .get();
    if (conflict) {
      throw new SoftDeleteError(
        'slug_conflict',
        `Cannot restore — slug "${cat.slug}" is already used by an active category. Rename or delete the active one first.`,
      );
    }

    tx.update(tierListItemTable)
      .set({ deletedAt: null, deletedWithCascade: null })
      .where(
        and(
          eq(tierListItemTable.categoryId, id),
          eq(tierListItemTable.deletedWithCascade, true),
          isNotNull(tierListItemTable.deletedAt),
        ),
      )
      .run();
    tx.update(categoryTable).set({ deletedAt: null }).where(eq(categoryTable.id, id)).run();
  });
}

/**
 * Restore a single item from trash. Throws if the parent category is in trash
 * (restore the category first) or if an active sibling has taken the slug.
 * No-op if the item isn't in trash.
 */
export function restoreItem(db: DB, id: string): void {
  db.transaction((tx) => {
    const item = tx
      .select({
        slug: tierListItemTable.slug,
        categoryId: tierListItemTable.categoryId,
        deletedAt: tierListItemTable.deletedAt,
      })
      .from(tierListItemTable)
      .where(eq(tierListItemTable.id, id))
      .get();
    if (!item || !item.deletedAt) return;

    const parent = tx
      .select({ deletedAt: categoryTable.deletedAt })
      .from(categoryTable)
      .where(eq(categoryTable.id, item.categoryId))
      .get();
    if (parent?.deletedAt) {
      throw new SoftDeleteError(
        'parent_in_trash',
        'Cannot restore — the parent category is in trash. Restore the category first.',
      );
    }

    const conflict = tx
      .select({ id: tierListItemTable.id })
      .from(tierListItemTable)
      .where(
        and(
          eq(tierListItemTable.categoryId, item.categoryId),
          eq(tierListItemTable.slug, item.slug),
          isNull(tierListItemTable.deletedAt),
        ),
      )
      .get();
    if (conflict) {
      throw new SoftDeleteError(
        'slug_conflict',
        `Cannot restore — slug "${item.slug}" is already used by an active item in this category.`,
      );
    }

    tx.update(tierListItemTable)
      .set({ deletedAt: null, deletedWithCascade: null })
      .where(eq(tierListItemTable.id, id))
      .run();
  });
}

/**
 * Permanently delete a category and (via FK CASCADE) every item inside it,
 * including items that were already in trash. Cleans image files first.
 */
export function permanentlyDeleteCategory(
  db: DB,
  id: string,
  deleteImage: (hash: string) => void = defaultDeleteImage,
): void {
  const items = db
    .select({ imageHash: tierListItemTable.imageHash })
    .from(tierListItemTable)
    .where(eq(tierListItemTable.categoryId, id))
    .all();
  for (const item of items) {
    if (item.imageHash) deleteImage(item.imageHash);
  }
  db.delete(categoryTable).where(eq(categoryTable.id, id)).run();
}

/** Permanently delete a single item, cleaning its image file first. */
export function permanentlyDeleteItem(
  db: DB,
  id: string,
  deleteImage: (hash: string) => void = defaultDeleteImage,
): void {
  const item = db
    .select({ imageHash: tierListItemTable.imageHash })
    .from(tierListItemTable)
    .where(eq(tierListItemTable.id, id))
    .get();
  if (item?.imageHash) deleteImage(item.imageHash);
  db.delete(tierListItemTable).where(eq(tierListItemTable.id, id)).run();
}

/**
 * List trash contents. Items are only included when their parent category is
 * still active — items inside a trashed category are reachable through the
 * category row instead, which avoids the dead-end "restore item, fails because
 * parent is in trash" UX.
 */
/**
 * Count trashed rows whose `deleted_at` is older than the given threshold.
 * Used by the admin warning banner; defaults to STALE_TRASH_DAYS.
 */
export function countStaleTrash(
  db: DB,
  days: number = STALE_TRASH_DAYS,
): { categories: number; items: number } {
  const cutoff = sql`datetime('now', ${'-' + days + ' days'})`;
  const cats = db
    .select({ count: count() })
    .from(categoryTable)
    .where(and(isNotNull(categoryTable.deletedAt), lt(categoryTable.deletedAt, cutoff)))
    .get();
  const items = db
    .select({ count: count() })
    .from(tierListItemTable)
    .where(and(isNotNull(tierListItemTable.deletedAt), lt(tierListItemTable.deletedAt, cutoff)))
    .get();
  return { categories: cats?.count ?? 0, items: items?.count ?? 0 };
}

export function listTrashed(db: DB) {
  const categories = db
    .select({
      id: categoryTable.id,
      slug: categoryTable.slug,
      name: categoryTable.name,
      deletedAt: categoryTable.deletedAt,
    })
    .from(categoryTable)
    .where(isNotNull(categoryTable.deletedAt))
    .all();

  const items = db
    .select({
      id: tierListItemTable.id,
      slug: tierListItemTable.slug,
      name: tierListItemTable.name,
      deletedAt: tierListItemTable.deletedAt,
      categoryId: tierListItemTable.categoryId,
      categoryName: categoryTable.name,
    })
    .from(tierListItemTable)
    .innerJoin(categoryTable, eq(categoryTable.id, tierListItemTable.categoryId))
    .where(and(isNotNull(tierListItemTable.deletedAt), isNull(categoryTable.deletedAt)))
    .all();

  return { categories, items };
}
