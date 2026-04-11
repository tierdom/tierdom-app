import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { category, tierListItem, tag, itemTag } from './schema';
import type { SeedCategory } from './seed-data';
import { slugify } from '../slugify';
import type * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

export function seedCategories(
	db: DB,
	categories: SeedCategory[],
	tags: { slug: string; label: string }[] | null
): number {
	if (tags && tags.length > 0) {
		db.insert(tag).values(tags).run();
	}

	let totalItems = 0;

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

			totalItems++;
		}
	}

	return totalItems;
}
