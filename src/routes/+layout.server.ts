import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { category } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	const categories = await db
		.select({ id: category.id, slug: category.slug, name: category.name })
		.from(category)
		.orderBy(asc(category.order));

	return { categories, user: locals.user };
};
