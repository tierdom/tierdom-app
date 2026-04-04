import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { category, tierListItem } from '$lib/server/db/schema';
import { asc, count, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const categories = await db
		.select({
			id: category.id,
			slug: category.slug,
			name: category.name,
			description: category.description,
			itemCount: count(tierListItem.id)
		})
		.from(category)
		.leftJoin(tierListItem, eq(tierListItem.categoryId, category.id))
		.groupBy(category.id)
		.orderBy(asc(category.order));

	return { categoriesWithCounts: categories };
};
