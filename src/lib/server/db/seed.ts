/**
 * Standalone seed script — run via `npm run db:seed`.
 *
 * Connects directly to the database (same DATABASE_URL as drizzle-kit),
 * wipes existing data, and inserts demo categories, tags, and items.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../auth/password';
import * as schema from './schema';
import { TAGS, CATEGORIES, PAGES, slugify } from './seed-data';

const { category, tierListItem, tag, itemTag, page, user, session } = schema;

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = new Database(process.env.DATABASE_URL);
client.pragma('foreign_keys = ON');
const db = drizzle(client, { schema });

// ─── Seed ────────────────────────────────────────────────────────────────────

console.log('Seeding database...');

// Wipe existing data in dependency order
db.delete(session).run();
db.delete(itemTag).run();
db.delete(tierListItem).run();
db.delete(tag).run();
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

// Insert tags and pages
db.insert(tag).values(TAGS).run();
db.insert(page).values(PAGES).run();

// Insert categories and their items
let totalItems = 0;

for (const cat of CATEGORIES) {
	const inserted = db
		.insert(category)
		.values({
			slug: cat.slug,
			name: cat.name,
			description: cat.description,
			order: cat.order
		})
		.returning({ id: category.id })
		.get();

	for (let i = 0; i < cat.items.length; i++) {
		const item = cat.items[i];
		const insertedItem = db
			.insert(tierListItem)
			.values({
				categoryId: inserted.id,
				slug: slugify(item.name),
				name: item.name,
				description: item.description ?? null,
				score: item.score,
				order: i
			})
			.returning({ id: tierListItem.id })
			.get();

		if (item.tags.length > 0) {
			db.insert(itemTag)
				.values(item.tags.map((tagSlug) => ({ itemId: insertedItem.id, tagSlug })))
				.run();
		}

		totalItems++;
	}
}

// ─── Randomize timestamps ────────────────────────────────────────────────────
// Spread created_at over the past 6 months. ~1/3 of rows get a later updated_at.
// Because the triggers use WHEN OLD.updated_at = NEW.updated_at, explicitly
// setting updated_at in these UPDATEs bypasses the trigger automatically.

const SIX_MONTHS_SEC = 6 * 30 * 24 * 60 * 60;

client.exec(`
	-- Assign random created_at in the past 6 months
	UPDATE category       SET created_at = datetime('now', '-' || (abs(random()) % ${SIX_MONTHS_SEC}) || ' seconds');
	UPDATE tier_list_item SET created_at = datetime('now', '-' || (abs(random()) % ${SIX_MONTHS_SEC}) || ' seconds');
	UPDATE tag            SET created_at = datetime('now', '-' || (abs(random()) % ${SIX_MONTHS_SEC}) || ' seconds');
	UPDATE page           SET created_at = datetime('now', '-' || (abs(random()) % ${SIX_MONTHS_SEC}) || ' seconds');

	-- Default: updated_at = created_at (never edited)
	UPDATE category       SET updated_at = created_at;
	UPDATE tier_list_item SET updated_at = created_at;
	UPDATE tag            SET updated_at = created_at;
	UPDATE page           SET updated_at = created_at;

	-- ~1/3 of rows: bump updated_at to a random point between created_at and now
	UPDATE category       SET updated_at = datetime(created_at, '+' || (abs(random()) % max(1, cast((julianday('now') - julianday(created_at)) * 86400 as integer))) || ' seconds') WHERE abs(random()) % 3 = 0;
	UPDATE tier_list_item SET updated_at = datetime(created_at, '+' || (abs(random()) % max(1, cast((julianday('now') - julianday(created_at)) * 86400 as integer))) || ' seconds') WHERE abs(random()) % 3 = 0;
	UPDATE tag            SET updated_at = datetime(created_at, '+' || (abs(random()) % max(1, cast((julianday('now') - julianday(created_at)) * 86400 as integer))) || ' seconds') WHERE abs(random()) % 3 = 0;
	UPDATE page           SET updated_at = datetime(created_at, '+' || (abs(random()) % max(1, cast((julianday('now') - julianday(created_at)) * 86400 as integer))) || ' seconds') WHERE abs(random()) % 3 = 0;
`);

client.close();

console.log(`Seeded ${CATEGORIES.length} categories, ${TAGS.length} tags, ${totalItems} items.`);
