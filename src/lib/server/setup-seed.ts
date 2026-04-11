import { db } from '$lib/server/db';
import { category, tierListItem, tag, itemTag, page } from '$lib/server/db/schema';
import { TAGS, CATEGORIES, PAGES } from '$lib/server/db/seed-data';
import { slugify } from '$lib/server/slugify';

function seedPages(pages: { slug: string; title: string; content: string }[]): void {
	db.insert(page).values(pages).run();
}

function seedCategories(categories: typeof CATEGORIES, tags: typeof TAGS | null): void {
	if (tags && tags.length > 0) {
		db.insert(tag).values(tags).run();
	}

	for (const cat of categories) {
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

			if (tags && item.tags.length > 0) {
				db.insert(itemTag)
					.values(item.tags.map((tagSlug) => ({ itemId: insertedItem.id, tagSlug })))
					.run();
			}
		}
	}
}

export function seedPreset(preset: string): void {
	switch (preset) {
		case 'empty':
			seedPages([
				{
					slug: 'home',
					title: 'Home',
					content:
						'# Welcome\n\nThis is your new Tierdom instance. Head to [the admin](/admin) to start building your tier lists.'
				},
				{
					slug: 'about',
					title: 'About',
					content: '# About\n\nThis page can be edited in the admin panel.'
				}
			]);
			break;

		case 'minimal':
			seedPages([
				{
					slug: 'home',
					title: 'Home',
					content:
						'# Welcome to **Tierdom**\n\nA personal, self-hosted collection of tier-ranked lists.'
				},
				{
					slug: 'about',
					title: 'About',
					content:
						'# About\n\n**Tierdom** is a personal, self-hosted tier list application. Edit this page in the admin panel to make it your own.'
				}
			]);
			seedCategories(
				[
					{
						slug: 'tier-list',
						name: 'Tier List',
						description: 'A general-purpose tier list. Rename it, or create new ones in the admin.',
						order: 0,
						items: [
							{
								name: 'Sample Item',
								score: 100,
								tags: [],
								description:
									'This is a **sample item** to show how tier lists work.\n\nEdit or delete it in the admin panel.'
							}
						]
					}
				],
				null
			);
			break;

		case 'demo':
			seedPages(PAGES);
			seedCategories(CATEGORIES, TAGS);
			break;

		default:
			throw new Error(`Unknown preset: ${preset}`);
	}
}
