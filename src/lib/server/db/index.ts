import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);

// Enable WAL mode for better concurrent read performance
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

export const db = drizzle(client, { schema });

// Run migrations on startup — idempotent, safe to call every boot
migrate(db, { migrationsFolder: 'drizzle' });

// Bootstrap admin user from env vars on first run (no-op if users exist)
import { bootstrapAdminUser } from '$lib/server/auth/bootstrap';
if (env.ADMIN_PASSWORD) {
	bootstrapAdminUser(env.ADMIN_PASSWORD, env.ADMIN_USERNAME);
}
