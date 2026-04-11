import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

import { join } from 'node:path';

if (!env.DATA_PATH) throw new Error('DATA_PATH is not set');

const client = new Database(join(env.DATA_PATH, 'db.sqlite'));

// Enable WAL mode for better concurrent read performance
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

export const db = drizzle(client, { schema });
