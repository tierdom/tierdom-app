/**
 * Standalone seed script — run via `npm run db:seed`.
 *
 * Connects directly to the database (same DATA_PATH as drizzle-kit),
 * wipes existing data, and inserts demo categories and items.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { hashPassword } from '../auth/password';
import * as schema from './schema';
import { CATEGORIES, PAGES } from './seed-data';
import { seedCategories } from './seed-utils';
import { generateSeedImages } from './seed-images';

const { page, user, session, category, tierListItem } = schema;

if (!process.env.DATA_PATH) {
  console.error('DATA_PATH is not set');
  process.exit(1);
}

const client = new Database(join(process.env.DATA_PATH, 'db.sqlite'));
client.pragma('foreign_keys = ON');
const db = drizzle(client, { schema });

// ─── Seed ────────────────────────────────────────────────────────────────────

console.log('Seeding database...');

// Wipe existing data in dependency order
db.delete(session).run();
db.delete(tierListItem).run();
db.delete(category).run();
db.delete(page).run();
db.delete(user).run();

// Insert dev admin user from env vars (defaults: admin / admin)
const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
db.insert(user)
  .values({
    id: randomUUID(),
    username: adminUsername,
    passwordHash: hashPassword(adminPassword)
  })
  .run();
console.log(`Created dev admin user with name ${adminUsername} and password <REDACTED>`);

// Insert pages and seed categories with items
db.insert(page).values(PAGES).run();
const totalItems = seedCategories(db, CATEGORIES);

// ─── Randomize timestamps ────────────────────────────────────────────────────
// Spread created_at over the past 6 months. ~1/3 of rows get a later updated_at.
// Because the triggers use WHEN OLD.updated_at = NEW.updated_at, explicitly
// setting updated_at in these UPDATEs bypasses the trigger automatically.

const SIX_MONTHS_SEC = 6 * 30 * 24 * 60 * 60;

client.exec(`
  -- Suppress updated_at triggers during timestamp randomization
  INSERT INTO _suppress_updated_at VALUES (1);

  -- Assign random created_at in the past 6 months
  UPDATE category       SET created_at = datetime('now', '-' || (abs(random()) % ${SIX_MONTHS_SEC}) || ' seconds');
  UPDATE tier_list_item SET created_at = datetime('now', '-' || (abs(random()) % ${SIX_MONTHS_SEC}) || ' seconds');
  UPDATE page           SET created_at = datetime('now', '-' || (abs(random()) % ${SIX_MONTHS_SEC}) || ' seconds');

  -- Default: updated_at = created_at (never edited)
  UPDATE category       SET updated_at = created_at;
  UPDATE tier_list_item SET updated_at = created_at;
  UPDATE page           SET updated_at = created_at;

  -- ~1/3 of rows: bump updated_at to a random point between created_at and now
  UPDATE category       SET updated_at = datetime(created_at, '+' || (abs(random()) % max(1, cast((julianday('now') - julianday(created_at)) * 86400 as integer))) || ' seconds') WHERE abs(random()) % 3 = 0;
  UPDATE tier_list_item SET updated_at = datetime(created_at, '+' || (abs(random()) % max(1, cast((julianday('now') - julianday(created_at)) * 86400 as integer))) || ' seconds') WHERE abs(random()) % 3 = 0;
  UPDATE page           SET updated_at = datetime(created_at, '+' || (abs(random()) % max(1, cast((julianday('now') - julianday(created_at)) * 86400 as integer))) || ' seconds') WHERE abs(random()) % 3 = 0;

  -- Re-enable triggers
  DELETE FROM _suppress_updated_at;
`);

if (process.env.SEED_IMAGES === '1') {
  console.log('Generating seed images...');
  const imageCount = await generateSeedImages(db, process.env.DATA_PATH!);
  console.log(`Generated ${imageCount} seed images.`);
}

client.close();

console.log(`Seeded ${CATEGORIES.length} categories, ${totalItems} items.`);
