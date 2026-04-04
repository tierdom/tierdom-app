import { db } from '$lib/server/db';
import { category, tierListItem } from '$lib/server/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const [cat] = await db.select().from(category).where(eq(category.id, id)).limit(1);
	if (!cat) error(404, 'Category not found');

	const items = await db
		.select()
		.from(tierListItem)
		.where(eq(tierListItem.categoryId, id))
		.orderBy(asc(tierListItem.order));

	return { category: cat, items };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const id = Number(params.id);
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		if (!name) return fail(400, { error: 'Name is required' });

		const slug = data.get('slug')?.toString()?.trim() || slugify(name);
		const description = data.get('description')?.toString()?.trim() || null;
		const order = Number(data.get('order')) || 0;

		const cutoffS = data.get('cutoffS')?.toString()?.trim();
		const cutoffA = data.get('cutoffA')?.toString()?.trim();
		const cutoffB = data.get('cutoffB')?.toString()?.trim();
		const cutoffC = data.get('cutoffC')?.toString()?.trim();
		const cutoffD = data.get('cutoffD')?.toString()?.trim();
		const cutoffE = data.get('cutoffE')?.toString()?.trim();
		const cutoffF = data.get('cutoffF')?.toString()?.trim();

		await db
			.update(category)
			.set({
				name,
				slug,
				description,
				order,
				cutoffS: cutoffS ? Number(cutoffS) : null,
				cutoffA: cutoffA ? Number(cutoffA) : null,
				cutoffB: cutoffB ? Number(cutoffB) : null,
				cutoffC: cutoffC ? Number(cutoffC) : null,
				cutoffD: cutoffD ? Number(cutoffD) : null,
				cutoffE: cutoffE ? Number(cutoffE) : null,
				cutoffF: cutoffF ? Number(cutoffF) : null
			})
			.where(eq(category.id, id));

		redirect(303, '/admin/categories');
	},

	delete: async ({ params }) => {
		const id = Number(params.id);
		await db.delete(category).where(eq(category.id, id));
		redirect(303, '/admin/categories');
	},

	createItem: async ({ request, params }) => {
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

		return { success: true };
	},

	deleteItem: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id' });

		await db.delete(tierListItem).where(eq(tierListItem.id, id));
		return { success: true };
	}
};
