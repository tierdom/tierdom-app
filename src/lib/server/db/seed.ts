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

const { category, tierListItem, tag, itemTag, page, user, session } = schema;

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = new Database(process.env.DATABASE_URL);
client.pragma('foreign_keys = ON');
const db = drizzle(client, { schema });

// ─── Demo data ───────────────────────────────────────────────────────────────

const TAGS = [
	{ slug: 'classic', label: 'Classic' },
	{ slug: 'indie', label: 'Indie' },
	{ slug: 'masterpiece', label: 'Masterpiece' },
	{ slug: 'overrated', label: 'Overrated' },
	{ slug: 'hidden-gem', label: 'Hidden Gem' },
	{ slug: 'nostalgia', label: 'Nostalgia' },
	{ slug: 'sci-fi', label: 'Sci-Fi' },
	{ slug: 'fantasy', label: 'Fantasy' },
	{ slug: 'horror', label: 'Horror' },
	{ slug: 'comedy', label: 'Comedy' }
];

type SeedItem = { name: string; score: number; tags: string[]; description?: string };

const CATEGORIES: {
	slug: string;
	name: string;
	description: string;
	order: number;
	items: SeedItem[];
}[] = [
	{
		slug: 'video-games',
		name: 'Video Games',
		description:
			'Every game I have played ranked from **S-tier masterpieces** down to the ones I wish I could forget.\n\nGenres span RPGs, platformers, roguelikes, and more.',
		order: 0,
		items: [
			{
				name: 'Hollow Knight',
				score: 97,
				tags: ['indie', 'masterpiece', 'fantasy'],
				description:
					'A **masterclass** in metroidvania design. The atmosphere, the music, the challenge — everything clicks.\n\nTeam Cherry created something truly special with a tiny budget.'
			},
			{ name: 'The Witcher 3', score: 94, tags: ['masterpiece', 'fantasy'] },
			{
				name: 'Disco Elysium',
				score: 92,
				tags: ['indie', 'masterpiece'],
				description:
					'An RPG where *every skill is a voice in your head*. The writing is unmatched in games.\n\nNothing else plays like this.'
			},
			{ name: 'Hades', score: 91, tags: ['indie', 'masterpiece'] },
			{ name: 'Dark Souls', score: 88, tags: ['classic', 'masterpiece'] },
			{ name: 'Celeste', score: 86, tags: ['indie', 'hidden-gem'] },
			{ name: 'Red Dead Redemption 2', score: 85, tags: ['masterpiece'] },
			{ name: 'Elden Ring', score: 83, tags: ['fantasy'] },
			{ name: 'Stardew Valley', score: 82, tags: ['indie', 'hidden-gem'] },
			{ name: 'Outer Wilds', score: 80, tags: ['indie', 'hidden-gem', 'sci-fi'] },
			{ name: 'Divinity: Original Sin 2', score: 78, tags: ['fantasy'] },
			{ name: 'Sekiro', score: 76, tags: ['classic'] },
			{ name: 'Inside', score: 74, tags: ['indie', 'horror'] },
			{ name: 'Cuphead', score: 72, tags: ['indie', 'classic'] },
			{ name: 'Monster Hunter: World', score: 70, tags: ['classic'] },
			{ name: 'Dragon Age: Origins', score: 68, tags: ['nostalgia', 'fantasy'] },
			{ name: 'Subnautica', score: 65, tags: ['indie', 'sci-fi'] },
			{ name: 'Fallout: New Vegas', score: 63, tags: ['classic', 'nostalgia'] },
			{ name: 'The Talos Principle', score: 60, tags: ['sci-fi'] },
			{ name: 'A Short Hike', score: 58, tags: ['indie'] },
			{ name: 'Genshin Impact', score: 50, tags: ['overrated'] },
			{ name: "No Man's Sky (launch)", score: 40, tags: ['overrated', 'sci-fi'] },
			{ name: 'Forspoken', score: 32, tags: ['overrated'] },
			{ name: 'Redfall', score: 20, tags: ['overrated'] },
			{ name: 'Anthem', score: 10, tags: ['overrated'] }
		]
	},
	{
		slug: 'books',
		name: 'Books',
		description:
			'Fiction and non-fiction both. Sorted by how much the book actually *stuck with me* long after reading.\n\nHeavy on sci-fi and fantasy, with a few literary outliers.',
		order: 1,
		items: [
			{
				name: 'Blood Meridian',
				score: 96,
				tags: ['masterpiece', 'classic'],
				description:
					'McCarthy at his most **brutal and poetic**. The Judge is one of the greatest villains in all of literature.\n\nNot for the faint of heart.'
			},
			{ name: 'Infinite Jest', score: 93, tags: ['masterpiece', 'classic'] },
			{ name: 'The Road', score: 91, tags: ['masterpiece', 'horror'] },
			{
				name: 'Dune',
				score: 90,
				tags: ['masterpiece', 'sci-fi'],
				description:
					'The **definitive** science fiction epic. World-building that puts most fantasy to shame.\n\nHerbert created an entire universe of politics, religion, and ecology.'
			},
			{ name: 'Piranesi', score: 88, tags: ['hidden-gem', 'fantasy'] },
			{ name: 'The Name of the Wind', score: 85, tags: ['fantasy'] },
			{ name: 'Recursion', score: 83, tags: ['sci-fi'] },
			{ name: 'A Fire Upon the Deep', score: 81, tags: ['sci-fi', 'hidden-gem'] },
			{ name: 'Thinking, Fast and Slow', score: 79, tags: ['classic'] },
			{ name: 'The Lies of Locke Lamora', score: 77, tags: ['fantasy'] },
			{ name: 'All Systems Red', score: 75, tags: ['sci-fi', 'indie'] },
			{ name: 'Flowers for Algernon', score: 73, tags: ['classic', 'sci-fi'] },
			{ name: 'The Left Hand of Darkness', score: 71, tags: ['sci-fi', 'classic'] },
			{ name: 'The Poppy War', score: 68, tags: ['fantasy'] },
			{ name: 'Ready Player One', score: 55, tags: ['sci-fi', 'overrated'] },
			{ name: 'The Martian', score: 65, tags: ['sci-fi'] },
			{ name: 'Dark Matter (Crouch)', score: 62, tags: ['sci-fi'] },
			{ name: 'Six of Crows', score: 60, tags: ['fantasy'] },
			{ name: 'Eragon', score: 48, tags: ['fantasy', 'nostalgia'] },
			{ name: 'Divergent', score: 42, tags: ['overrated'] },
			{ name: 'Twilight', score: 35, tags: ['nostalgia', 'overrated'] },
			{ name: 'The Fault in Our Stars', score: 46, tags: ['overrated'] },
			{ name: 'Halo: The Fall of Reach', score: 50, tags: ['sci-fi', 'nostalgia'] },
			{ name: 'Bobiverse 1', score: 72, tags: ['sci-fi', 'comedy'] },
			{
				name: 'Sword of Truth: Wizards First Rule',
				score: 28,
				tags: ['fantasy', 'overrated']
			}
		]
	},
	{
		slug: 'movies',
		name: 'Movies',
		description:
			'Films ranked by **lasting impression** — not box office, not hype, just how they hold up on reflection.\n\nHeavy on horror and sci-fi; blockbusters need not apply.',
		order: 2,
		items: [
			{
				name: 'Annihilation',
				score: 95,
				tags: ['masterpiece', 'sci-fi', 'horror'],
				description:
					"Garland turned VanderMeer's *weird fiction* into something even stranger on screen. The Shimmer is **unforgettable**.\n\nThe bear scene alone earns it a spot in S-tier."
			},
			{
				name: '2001: A Space Odyssey',
				score: 93,
				tags: ['masterpiece', 'classic', 'sci-fi']
			},
			{ name: 'Stalker (1979)', score: 91, tags: ['masterpiece', 'classic', 'sci-fi'] },
			{
				name: 'The Thing (1982)',
				score: 90,
				tags: ['masterpiece', 'classic', 'horror']
			},
			{
				name: 'Blade Runner 2049',
				score: 88,
				tags: ['masterpiece', 'sci-fi'],
				description:
					"Villeneuve proved a *Blade Runner* sequel could work. Deakins' cinematography is **breathtaking**.\n\nSlow, meditative, and visually perfect."
			},
			{ name: 'Parasite', score: 86, tags: ['masterpiece'] },
			{ name: 'Arrival', score: 84, tags: ['sci-fi', 'masterpiece'] },
			{ name: 'Mad Max: Fury Road', score: 82, tags: ['classic'] },
			{ name: 'The Witch', score: 80, tags: ['horror', 'hidden-gem'] },
			{ name: 'Midsommar', score: 78, tags: ['horror'] },
			{ name: 'Under the Skin', score: 76, tags: ['sci-fi', 'hidden-gem'] },
			{ name: 'Get Out', score: 75, tags: ['horror'] },
			{ name: 'Ex Machina', score: 87, tags: ['sci-fi'] },
			{ name: 'Whiplash', score: 85, tags: ['masterpiece'] },
			{ name: 'The Prestige', score: 83, tags: ['classic'] },
			{ name: "Pan's Labyrinth", score: 81, tags: ['fantasy', 'horror'] },
			{ name: 'Sicario', score: 79, tags: ['classic'] },
			{ name: 'There Will Be Blood', score: 89, tags: ['masterpiece', 'classic'] },
			{ name: 'No Country for Old Men', score: 88, tags: ['masterpiece', 'classic'] },
			{ name: 'The Babadook', score: 77, tags: ['horror', 'indie'] },
			{ name: 'Color Out of Space', score: 76, tags: ['horror', 'sci-fi'] },
			{ name: 'It Follows', score: 75, tags: ['horror', 'indie'] },
			{ name: 'Coherence', score: 75, tags: ['sci-fi', 'indie', 'hidden-gem'] },
			{
				name: 'Everything Everywhere All at Once',
				score: 74,
				tags: ['indie']
			},
			{ name: 'Hereditary', score: 72, tags: ['horror'] },
			{ name: 'The Lighthouse', score: 70, tags: ['horror', 'indie'] },
			{ name: 'Dune: Part One', score: 68, tags: ['sci-fi'] },
			{ name: 'Interstellar', score: 63, tags: ['sci-fi', 'overrated'] },
			{ name: 'The Northman', score: 60, tags: ['indie'] },
			{ name: 'Mandy (2018)', score: 65, tags: ['horror', 'hidden-gem'] },
			{ name: 'The Menu', score: 67, tags: ['comedy', 'horror'] },
			{ name: 'The Banshees of Inisherin', score: 71, tags: ['comedy'] },
			{ name: 'Triangle of Sadness', score: 62, tags: ['comedy'] },
			{ name: 'Nope', score: 58, tags: ['sci-fi', 'horror'] },
			{
				name: 'Transformers: Age of Extinction',
				score: 12,
				tags: ['overrated']
			},
			{ name: 'Avatar (2009)', score: 45, tags: ['overrated', 'sci-fi'] },
			{ name: 'Cats (2019)', score: 5, tags: ['horror'] },
			{ name: 'Morbius', score: 18, tags: ['overrated'] },
			{ name: 'Venom (2018)', score: 38, tags: ['overrated', 'comedy'] },
			{ name: 'The Emoji Movie', score: 3, tags: ['comedy', 'overrated'] },
			{ name: 'Dragonball Evolution', score: 4, tags: ['overrated'] },
			{ name: 'Battlefield Earth', score: 2, tags: ['sci-fi', 'overrated'] },
			{ name: 'Movie 43', score: 6, tags: ['comedy', 'overrated'] },
			{ name: 'Disaster Movie', score: 1, tags: ['comedy', 'overrated'] },
			{ name: 'Epic Movie', score: 7, tags: ['comedy', 'overrated'] },
			{ name: 'The Last Airbender', score: 8, tags: ['fantasy', 'overrated'] },
			{ name: 'Birdemic', score: 3, tags: ['horror', 'comedy'] },
			{ name: 'Son of the Mask', score: 5, tags: ['comedy', 'overrated'] },
			{ name: 'Jaws: The Revenge', score: 9, tags: ['horror', 'overrated'] },
			{ name: 'Alone in the Dark (2005)', score: 6, tags: ['horror', 'overrated'] },
			{ name: 'Catwoman (2004)', score: 10, tags: ['overrated'] },
			{ name: 'Bloodshot', score: 11, tags: ['overrated', 'sci-fi'] },
			{ name: 'Left Behind (2014)', score: 4, tags: ['overrated'] }
		]
	},
	{
		slug: 'board-games',
		name: 'Board Games',
		description:
			'A small but growing collection of **tabletop games** ranked by replayability and fun factor.\n\nOnly the ones that actually hit the table more than once.',
		order: 3,
		items: [
			{ name: 'Gloomhaven', score: 95, tags: ['masterpiece', 'fantasy'] },
			{ name: 'Spirit Island', score: 92, tags: ['indie', 'hidden-gem'] },
			{ name: 'Catan', score: 48, tags: ['classic', 'nostalgia', 'overrated'] },
			{ name: 'Pandemic', score: 42, tags: ['classic'] },
			{ name: 'Exploding Kittens', score: 25, tags: ['comedy', 'overrated'] }
		]
	},
	{
		slug: 'recipes',
		name: 'Recipes',
		description: 'Recipes I have tried, ranked by taste and effort. *Coming soon.*',
		order: 4,
		items: []
	}
];

const PAGES = [
	{
		slug: 'home',
		title: 'Home',
		content: `# Welcome to **tierdom**

A personal, self-hosted collection of tier-ranked lists. No algorithms, no ads — just honest rankings from S to F.`
	},
	{
		slug: 'about',
		title: 'About tierdom',
		content: `**Tierdom** is a personal, self-hosted tier list application. Instead of scattering reviews and ratings across dozens of proprietary platforms, everything lives in one place — owned and controlled by me.

## Why self-host?

Review platforms like IMDB, Goodreads, and BoardGameGeek are great resources, but they each lock your data into their own silo with their own rating scale. Tierdom brings all of that together under a single, consistent system.

| Feature | Self-hosted | Proprietary |
|---|---|---|
| Data ownership | Full | Theirs |
| Minimalist UI | Yes | Varies |
| Uniform rankings | S–F everywhere | Per-platform |
| Ad-free | Always | Rarely |
| Custom categories | Unlimited | Fixed |

## What's in a name?

**Tierdom** blends "tier" (as in tier lists) with "fiefdom" — a small, self-governed domain. It's a nod to the idea of owning your own little corner of the ranking world.

## Who made this?

Tierdom is built and maintained by [Jeroen Heijmans](https://jeroenheijmans.nl). It started as a small side project and grew into the thing you see here.

## Open source

The source code is publicly available on [GitHub](https://github.com/jeroenheijmans/tierdom-pro). Feel free to explore, fork, or draw inspiration for your own tier list project.`
	}
];

// ─── Seed ────────────────────────────────────────────────────────────────────

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

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
console.log(`Created dev admin user: ${adminUsername} / ${adminPassword}`);

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
