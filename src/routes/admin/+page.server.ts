import { db } from '$lib/server/db';
import { category, tierListItem, tag } from '$lib/server/db/schema';
import { count } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const [cats] = await db.select({ count: count() }).from(category);
	const [items] = await db.select({ count: count() }).from(tierListItem);
	const [tags] = await db.select({ count: count() }).from(tag);

	return {
		counts: {
			categories: cats.count,
			items: items.count,
			tags: tags.count
		}
	};
};

export const actions: Actions = {
	seed: async ({ fetch }) => {
		const res = await fetch('/api/admin/seed', { method: 'POST' });
		return await res.json();
	}
};
