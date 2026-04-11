import { db } from '$lib/server/db';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '$env/dynamic/private';
import { bootstrapAdminUser } from '$lib/server/auth/bootstrap';
import { ensureImageDir } from '$lib/server/images';

let initialized = false;

export function initializeApp(): void {
  if (initialized) return;
  initialized = true;

  migrate(db, { migrationsFolder: 'drizzle' });

  if (env.ADMIN_PASSWORD) {
    bootstrapAdminUser(env.ADMIN_PASSWORD, env.ADMIN_USERNAME);
  }

  ensureImageDir();
}
