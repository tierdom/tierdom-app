import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
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
