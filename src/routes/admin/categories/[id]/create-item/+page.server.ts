import { db } from '$lib/server/db';
import { category, tierListItem } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const load: PageServerLoad = async ({ params }) => {
	const categoryId = Number(params.id);
	const [cat] = await db
		.select({ id: category.id, name: category.name })
		.from(category)
		.where(eq(category.id, categoryId))
		.limit(1);
	if (!cat) error(404, 'Category not found');

	return { category: cat };
};

export const actions: Actions = {
	create: async ({ request, params }) => {
		const categoryId = Number(params.id);
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		if (!name) return fail(400, { error: 'Item name is required' });

		const slug = data.get('slug')?.toString()?.trim() || slugify(name);
		const score = Math.round(Number(data.get('score')));
		if (isNaN(score) || score < 0 || score > 100) {
			return fail(400, { error: 'Score must be an integer 0-100' });
		}

		const description = data.get('description')?.toString()?.trim() || null;

		const [maxOrder] = await db
			.select({ max: sql<number>`coalesce(max(${tierListItem.order}), -1)` })
			.from(tierListItem)
			.where(eq(tierListItem.categoryId, categoryId));

		await db.insert(tierListItem).values({
			categoryId,
			slug,
			name,
			description,
			score,
			order: maxOrder.max + 1
		});

		redirect(303, `/admin/categories/${categoryId}`);
	}
};
