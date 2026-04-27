import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import type * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

const SIX_MONTHS_SEC = 6 * 30 * 24 * 60 * 60;
// Floor the spread so no row lands within the last 2 hours. This keeps the
// "demo data is from the past, not 'just now'" feel honest, and lets tests
// assert "< 1 hour ago" deterministically (otherwise ~1-2% of runs draw a
// row into the last hour by chance with N items in the demo seed).
const FLOOR_SEC = 2 * 60 * 60;

const TABLES = ['category', 'tier_list_item', 'page', 'site_setting'] as const;

/**
 * Spread created_at across the past 6 months (with a 2-hour floor) and bump
 * updated_at on ~1/3 of rows. Suppresses the updated_at triggers via
 * _suppress_updated_at so the randomized timestamps survive.
 */
export function randomizeSeedTimestamps(db: DB): void {
  db.run(sql.raw(`INSERT INTO _suppress_updated_at VALUES (1)`));
  try {
    for (const t of TABLES) {
      db.run(
        sql.raw(
          `UPDATE ${t} SET created_at = datetime('now', '-' || (abs(random()) % ${SIX_MONTHS_SEC - FLOOR_SEC} + ${FLOOR_SEC}) || ' seconds')`
        )
      );
      db.run(sql.raw(`UPDATE ${t} SET updated_at = created_at`));
      db.run(
        sql.raw(
          `UPDATE ${t} SET updated_at = datetime(created_at, '+' || (abs(random()) % max(1, cast((julianday('now', '-${FLOOR_SEC} seconds') - julianday(created_at)) * 86400 as integer))) || ' seconds') WHERE abs(random()) % 3 = 0`
        )
      );
    }
  } finally {
    db.run(sql.raw(`DELETE FROM _suppress_updated_at`));
  }
}
