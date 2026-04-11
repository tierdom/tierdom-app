import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { tierListItem } from '$lib/server/db/schema';
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * Set the `order` column for each row based on its position in `orderedIds`.
 */
export function applyOrder(
  table: SQLiteTable,
  idColumn: SQLiteColumn,
  orderColumn: SQLiteColumn,
  orderedIds: number[]
): void {
  db.transaction((tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      tx.update(table)
        .set({ [orderColumn.name]: i })
        .where(sql`${idColumn} = ${orderedIds[i]}`)
        .run();
    }
  });
}

/**
 * Insert an item into a category at the position matching its score.
 * Tiebreaker: name ASC, then id ASC.
 * Shifts existing items to make room.
 */
export function insertByScore(
  categoryId: number,
  score: number,
  name: string,
  itemId: number
): number {
  const result = db
    .select({
      pos: sql<number>`count(*)`
    })
    .from(tierListItem)
    .where(
      sql`${tierListItem.categoryId} = ${categoryId}
        AND ${tierListItem.id} != ${itemId}
        AND (
          ${tierListItem.score} > ${score}
          OR (${tierListItem.score} = ${score} AND ${tierListItem.name} < ${name})
          OR (${tierListItem.score} = ${score} AND ${tierListItem.name} = ${name} AND ${tierListItem.id} < ${itemId})
        )`
    )
    .all();
  const pos = result[0].pos;

  db.run(
    sql`UPDATE ${tierListItem}
      SET "order" = "order" + 1
      WHERE ${tierListItem.categoryId} = ${categoryId}
        AND ${tierListItem.id} != ${itemId}
        AND "order" >= ${pos}`
  );

  return pos;
}

/**
 * Sort all items in a category by score DESC, name ASC, id ASC.
 * Single atomic UPDATE using a window function.
 */
export function sortCategoryByScore(categoryId: number): void {
  db.run(
    sql`UPDATE ${tierListItem}
      SET "order" = sub.new_order
      FROM (
        SELECT id, ROW_NUMBER() OVER (
          ORDER BY score DESC, name ASC, id ASC
        ) - 1 AS new_order
        FROM ${tierListItem}
        WHERE ${tierListItem.categoryId} = ${categoryId}
      ) AS sub
      WHERE ${tierListItem}.id = sub.id`
  );
}
