import { db } from '$lib/server/db';
import { category, tierListItem, tag, page } from '$lib/server/db/schema';
import { count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [cats] = await db.select({ count: count() }).from(category);
	const [items] = await db.select({ count: count() }).from(tierListItem);
	const [tags] = await db.select({ count: count() }).from(tag);
	const [pages] = await db.select({ count: count() }).from(page);

	return {
		counts: {
			categories: cats.count,
			items: items.count,
			tags: tags.count,
			pages: pages.count
		}
	};
};
