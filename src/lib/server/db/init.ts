import { db } from '$lib/server/db';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '$env/dynamic/private';
import { bootstrapAdminUser } from '$lib/server/auth/bootstrap';
import { isSetupComplete } from '$lib/server/setup';
import { ensureImageDir } from '$lib/server/images';
import { sweepImportTemp } from '$lib/server/import/temp-storage';

let initialized = false;

export function initializeApp(): void {
  if (initialized) return;
  initialized = true;

  migrate(db, { migrationsFolder: 'drizzle' });

  // Only auto-create the admin from env vars if the setup wizard has
  // already run. When setup is pending the wizard creates the user
  // with the credentials chosen in the form.
  if (isSetupComplete(db) && env.ADMIN_PASSWORD) {
    bootstrapAdminUser(db, env.ADMIN_PASSWORD, env.ADMIN_USERNAME);
  }

  ensureImageDir();
  sweepImportTemp();
}
