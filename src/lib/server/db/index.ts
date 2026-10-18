import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { DATA_PATH } from '$app/env/private';

import { join } from 'node:path';

if (!DATA_PATH) throw new Error('DATA_PATH is not set');

const client = new Database(join(DATA_PATH, 'db.sqlite'));

// Enable WAL mode for better concurrent read performance
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

export const db = drizzle(client, { schema });

type DB = BetterSQLite3Database<typeof schema>;

/**
 * Online, consistent SQLite snapshot via `VACUUM INTO`. Output is a clean
 * single file (no WAL/SHM sidecars) safe to copy into a backup archive.
 */
export function backupDatabaseTo(targetPath: string, conn: DB = db): void {
  // SQLite string-literal escape: double any embedded single quotes.
  const escaped = targetPath.replace(/'/g, "''");
  conn.run(sql.raw(`VACUUM INTO '${escaped}'`));
}
