import { db } from '$lib/server/db';
import { category, tierListItem, itemTag, tag } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { applyOrder, sortCategoryByScore } from '$lib/server/reorder';
import { deleteImage } from '$lib/server/images';
import { slugify } from '$lib/server/slugify';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const [cat] = await db.select().from(category).where(eq(category.id, id)).limit(1);
	if (!cat) error(404, 'Category not found');

	const items = await db
		.select()
		.from(tierListItem)
		.where(eq(tierListItem.categoryId, id))
		.orderBy(asc(tierListItem.order));

	const itemIds = items.map((i) => i.id);
	const tagsPerItem =
		itemIds.length > 0
			? await db
					.select({ itemId: itemTag.itemId, slug: tag.slug, label: tag.label })
					.from(itemTag)
					.innerJoin(tag, eq(tag.slug, itemTag.tagSlug))
					.innerJoin(tierListItem, eq(tierListItem.id, itemTag.itemId))
					.where(eq(tierListItem.categoryId, id))
			: [];

	const tagsByItemId = new Map<number, { slug: string; label: string }[]>();
	for (const row of tagsPerItem) {
		const existing = tagsByItemId.get(row.itemId) ?? [];
		existing.push({ slug: row.slug, label: row.label });
		tagsByItemId.set(row.itemId, existing);
	}

	const itemsWithTags = items.map((item) => ({
		...item,
		tags: tagsByItemId.get(item.id) ?? []
	}));

	return { category: cat, items: itemsWithTags };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const id = Number(params.id);
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		if (!name) return fail(400, { error: 'Name is required' });

		const slug = data.get('slug')?.toString()?.trim() || slugify(name);
		const description = data.get('description')?.toString()?.trim() || null;

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

		// Clean up image files before cascade delete removes the rows
		const items = await db
			.select({ imageHash: tierListItem.imageHash })
			.from(tierListItem)
			.where(eq(tierListItem.categoryId, id));
		for (const item of items) {
			if (item.imageHash) deleteImage(item.imageHash);
		}

		await db.delete(category).where(eq(category.id, id));
		redirect(303, '/admin/categories');
	},

	reorderItems: async ({ request }) => {
		const data = await request.formData();
		const orderJson = data.get('order')?.toString();
		if (!orderJson) return fail(400, { error: 'Missing order' });

		let orderedIds: number[];
		try {
			orderedIds = JSON.parse(orderJson);
		} catch {
			return fail(400, { error: 'Invalid order format' });
		}

		if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === 'number')) {
			return fail(400, { error: 'Invalid order data' });
		}

		await applyOrder(tierListItem, tierListItem.id, tierListItem.order, orderedIds);
		return { success: true };
	},

	sortByScore: async ({ params }) => {
		const id = Number(params.id);
		sortCategoryByScore(id);
		return { success: true };
	},

	deleteItem: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id' });

		const [item] = await db
			.select({ imageHash: tierListItem.imageHash })
			.from(tierListItem)
			.where(eq(tierListItem.id, id))
			.limit(1);
		if (item?.imageHash) deleteImage(item.imageHash);

		await db.delete(tierListItem).where(eq(tierListItem.id, id));
		return { success: true };
	}
};
