import { db } from '$lib/server/db';
import { tierListItem, category } from '$lib/server/db/schema';
import { count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [items] = await db.select({ count: count() }).from(tierListItem);
	return { itemCount: items.count };
};
