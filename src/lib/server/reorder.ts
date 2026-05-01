import { db as defaultDb } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { tierListItem, tierListItemTable } from '$lib/server/db/schema';
import type * as schema from '$lib/server/db/schema';
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core';

type DB = BetterSQLite3Database<typeof schema>;

const SUPPRESS_ON = sql`INSERT INTO _suppress_updated_at VALUES (1)`;
const SUPPRESS_OFF = sql`DELETE FROM _suppress_updated_at`;

/**
 * Set the `order` column for each row based on its position in `orderedIds`.
 */
export function applyOrder(
  table: SQLiteTable,
  idColumn: SQLiteColumn,
  orderColumn: SQLiteColumn,
  orderedIds: string[],
  db: DB = defaultDb,
): void {
  db.transaction((tx) => {
    tx.run(SUPPRESS_ON);
    for (let i = 0; i < orderedIds.length; i++) {
      tx.update(table)
        .set({ [orderColumn.name]: i })
        .where(sql`${idColumn} = ${orderedIds[i]}`)
        .run();
    }
    tx.run(SUPPRESS_OFF);
  });
}

/**
 * Insert an item into a category at the position matching its score.
 * Tiebreaker: name ASC, then id ASC.
 * Shifts existing items to make room.
 */
export function insertByScore(
  categoryId: string,
  score: number,
  name: string,
  itemId: string,
  db: DB = defaultDb,
): number {
  const result = db
    .select({
      pos: sql<number>`count(*)`,
    })
    .from(tierListItem)
    .where(
      sql`${tierListItem.categoryId} = ${categoryId}
        AND ${tierListItem.id} != ${itemId}
        AND (
          ${tierListItem.score} > ${score}
          OR (${tierListItem.score} = ${score} AND ${tierListItem.name} < ${name})
          OR (${tierListItem.score} = ${score} AND ${tierListItem.name} = ${name} AND ${tierListItem.id} < ${itemId})
        )`,
    )
    .all();
  const pos = result[0].pos;

  db.run(SUPPRESS_ON);
  db.run(
    sql`UPDATE ${tierListItemTable}
      SET "order" = "order" + 1
      WHERE ${tierListItemTable.categoryId} = ${categoryId}
        AND ${tierListItemTable.id} != ${itemId}
        AND "order" >= ${pos}`,
  );
  db.run(SUPPRESS_OFF);

  return pos;
}

/**
 * Sort all items in a category by score DESC, name ASC, id ASC.
 * Single atomic UPDATE using a window function.
 */
export function sortCategoryByScore(categoryId: string, db: DB = defaultDb): void {
  db.run(SUPPRESS_ON);
  db.run(
    sql`UPDATE ${tierListItemTable}
      SET "order" = sub.new_order
      FROM (
        SELECT id, ROW_NUMBER() OVER (
          ORDER BY score DESC, name ASC, id ASC
        ) - 1 AS new_order
        FROM ${tierListItem}
        WHERE ${tierListItem.categoryId} = ${categoryId}
      ) AS sub
      WHERE ${tierListItemTable}.id = sub.id`,
  );
  db.run(SUPPRESS_OFF);
}
