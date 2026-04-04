import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { category, tierListItem, tag, itemTag } from '$lib/server/db/schema';

// ─── Demo data ────────────────────────────────────────────────────────────────

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

const CATEGORIES = [
	{
		slug: 'video-games',
		name: 'Video Games',
		description:
			'Every game I have played ranked from S-tier masterpieces down to the ones I wish I could forget.',
		order: 0,
		items: [
			{ name: 'Hollow Knight', score: 97, tags: ['indie', 'masterpiece', 'fantasy'] },
			{ name: 'The Witcher 3', score: 94, tags: ['masterpiece', 'fantasy'] },
			{ name: 'Disco Elysium', score: 92, tags: ['indie', 'masterpiece'] },
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
			{ name: 'No Man\'s Sky (launch)', score: 40, tags: ['overrated', 'sci-fi'] },
			{ name: 'Forspoken', score: 32, tags: ['overrated'] },
			{ name: 'Redfall', score: 20, tags: ['overrated'] },
			{ name: 'Anthem', score: 10, tags: ['overrated'] }
		]
	},
	{
		slug: 'books',
		name: 'Books',
		description:
			'Fiction and non-fiction both. Sorted by how much the book actually stuck with me long after reading.',
		order: 1,
		items: [
			{ name: 'Blood Meridian', score: 96, tags: ['masterpiece', 'classic'] },
			{ name: 'Infinite Jest', score: 93, tags: ['masterpiece', 'classic'] },
			{ name: 'The Road', score: 91, tags: ['masterpiece', 'horror'] },
			{ name: 'Dune', score: 90, tags: ['masterpiece', 'sci-fi'] },
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
			{ name: 'Sword of Truth: Wizards First Rule', score: 28, tags: ['fantasy', 'overrated'] }
		]
	},
	{
		slug: 'movies',
		name: 'Movies',
		description:
			'Films ranked by lasting impression — not box office, not hype, just how they hold up on reflection.',
		order: 2,
		items: [
			{ name: 'Annihilation', score: 95, tags: ['masterpiece', 'sci-fi', 'horror'] },
			{ name: '2001: A Space Odyssey', score: 93, tags: ['masterpiece', 'classic', 'sci-fi'] },
			{ name: 'Stalker (1979)', score: 91, tags: ['masterpiece', 'classic', 'sci-fi'] },
			{ name: 'The Thing (1982)', score: 90, tags: ['masterpiece', 'classic', 'horror'] },
			{ name: 'Blade Runner 2049', score: 88, tags: ['masterpiece', 'sci-fi'] },
			{ name: 'Parasite', score: 86, tags: ['masterpiece'] },
			{ name: 'Arrival', score: 84, tags: ['sci-fi', 'masterpiece'] },
			{ name: 'Mad Max: Fury Road', score: 82, tags: ['classic'] },
			{ name: 'The Witch', score: 80, tags: ['horror', 'hidden-gem'] },
			{ name: 'Midsommar', score: 78, tags: ['horror'] },
			{ name: 'Under the Skin', score: 76, tags: ['sci-fi', 'hidden-gem'] },
			{ name: 'Everything Everywhere All at Once', score: 74, tags: ['indie'] },
			{ name: 'Hereditary', score: 72, tags: ['horror'] },
			{ name: 'The Lighthouse', score: 70, tags: ['horror', 'indie'] },
			{ name: 'Dune: Part One', score: 68, tags: ['sci-fi'] },
			{ name: 'Get Out', score: 75, tags: ['horror'] },
			{ name: 'Interstellar', score: 63, tags: ['sci-fi', 'overrated'] },
			{ name: 'The Northman', score: 60, tags: ['indie'] },
			{ name: 'Mandy (2018)', score: 65, tags: ['horror', 'hidden-gem'] },
			{ name: 'Nope', score: 58, tags: ['sci-fi', 'horror'] },
			{ name: 'Transformers: Age of Extinction', score: 12, tags: ['overrated'] },
			{ name: 'Avatar (2009)', score: 45, tags: ['overrated', 'sci-fi'] },
			{ name: 'Cats (2019)', score: 5, tags: ['horror'] },
			{ name: 'Morbius', score: 18, tags: ['overrated'] },
			{ name: 'Venom (2018)', score: 38, tags: ['overrated', 'comedy'] }
		]
	}
];

// ─── Endpoint ─────────────────────────────────────────────────────────────────

export async function POST() {
	// Wipe existing data in dependency order
	await db.delete(itemTag);
	await db.delete(tierListItem);
	await db.delete(tag);
	await db.delete(category);

	// Insert tags
	await db.insert(tag).values(TAGS);

	// Insert categories and their items
	let totalItems = 0;

	for (const cat of CATEGORIES) {
		const [inserted] = await db
			.insert(category)
			.values({
				slug: cat.slug,
				name: cat.name,
				description: cat.description,
				order: cat.order
			})
			.returning({ id: category.id });

		const categoryId = inserted.id;

		// Insert items
		for (let i = 0; i < cat.items.length; i++) {
			const item = cat.items[i];
			const slug = item.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');

			const [insertedItem] = await db
				.insert(tierListItem)
				.values({
					categoryId,
					slug,
					name: item.name,
					score: item.score,
					order: i
				})
				.returning({ id: tierListItem.id });

			// Insert item → tag relations
			if (item.tags.length > 0) {
				await db.insert(itemTag).values(
					item.tags.map((tagSlug) => ({ itemId: insertedItem.id, tagSlug }))
				);
			}

			totalItems++;
		}
	}

	return json({
		ok: true,
		seeded: {
			categories: CATEGORIES.length,
			tags: TAGS.length,
			items: totalItems
		}
	});
}
