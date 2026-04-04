import { db } from '$lib/server/db';
import { category, tierListItem } from '$lib/server/db/schema';
import { asc, count, eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const load: PageServerLoad = async () => {
	const cats = await db
		.select({
			id: category.id,
			slug: category.slug,
			name: category.name,
			order: category.order,
			itemCount: count(tierListItem.id)
		})
		.from(category)
		.leftJoin(tierListItem, eq(tierListItem.categoryId, category.id))
		.groupBy(category.id)
		.orderBy(asc(category.order));

	return { categories: cats };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		if (!name) return fail(400, { error: 'Name is required' });

		const slug = data.get('slug')?.toString()?.trim() || slugify(name);
		const description = data.get('description')?.toString()?.trim() || null;

		const [maxOrder] = await db
			.select({ max: sql<number>`coalesce(max(${category.order}), -1)` })
			.from(category);

		await db.insert(category).values({
			slug,
			name,
			description,
			order: maxOrder.max + 1
		});

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id' });

		await db.delete(category).where(eq(category.id, id));
		return { success: true };
	},

	reorder: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const direction = data.get('direction')?.toString();
		if (!id || (direction !== 'up' && direction !== 'down')) {
			return fail(400, { error: 'Invalid reorder request' });
		}

		const cats = await db
			.select({ id: category.id, order: category.order })
			.from(category)
			.orderBy(asc(category.order));

		const idx = cats.findIndex((c) => c.id === id);
		if (idx === -1) return fail(404, { error: 'Category not found' });

		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= cats.length) return { success: true };

		const a = cats[idx];
		const b = cats[swapIdx];

		await db.update(category).set({ order: b.order }).where(eq(category.id, a.id));
		await db.update(category).set({ order: a.order }).where(eq(category.id, b.id));

		return { success: true };
	}
};
