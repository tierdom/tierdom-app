import { db } from '#lib/server/db/index.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '$app/env/private';
import { bootstrapAdminUser } from '#lib/server/auth/bootstrap.js';
import { isSetupComplete } from '#lib/server/setup.js';
import { ensureImageDir } from '#lib/server/images.js';
import { sweepImportTemp } from '#lib/server/import/temp-storage.js';

let initialized = false;

export function initializeApp(): void {
  if (initialized) return;
  initialized = true;

  migrate(db, { migrationsFolder: 'drizzle' });

  // Only auto-create the admin from env vars if the setup wizard has
  // already run. When setup is pending the wizard creates the user
  // with the credentials chosen in the form.
  if (isSetupComplete(db) && ADMIN_PASSWORD) {
    bootstrapAdminUser(db, ADMIN_PASSWORD, ADMIN_USERNAME);
  }

  ensureImageDir();
  sweepImportTemp();
}
