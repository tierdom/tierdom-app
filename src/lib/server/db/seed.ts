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
import { randomizeSeedTimestamps } from './seed-timestamps';

const { page, user, session, categoryTable, tierListItemTable, siteSetting } = schema;

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
db.delete(tierListItemTable).run();
db.delete(categoryTable).run();
db.delete(page).run();
db.delete(siteSetting).run();
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

if (process.env.SEED_IMAGES === '1') {
  console.log('Generating seed images...');
  const imageCount = await generateSeedImages(db, process.env.DATA_PATH!);
  console.log(`Generated ${imageCount} seed images.`);
}

// Must run AFTER generateSeedImages — that pass UPDATEs every tier_list_item
// to set imageHash/placeholder, which would otherwise re-fire the updated_at
// trigger and stamp every row with "now".
randomizeSeedTimestamps(db);

client.close();

console.log(`Seeded ${CATEGORIES.length} categories, ${totalItems} items.`);
