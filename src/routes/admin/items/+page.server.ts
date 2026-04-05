import { db } from '$lib/server/db';
import { tierListItem, category, itemTag, tag } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const items = await db
		.select({
			id: tierListItem.id,
			slug: tierListItem.slug,
			name: tierListItem.name,
			score: tierListItem.score,
			categoryId: tierListItem.categoryId,
			categoryName: category.name,
			cutoffS: category.cutoffS,
			cutoffA: category.cutoffA,
			cutoffB: category.cutoffB,
			cutoffC: category.cutoffC,
			cutoffD: category.cutoffD,
			cutoffE: category.cutoffE,
			cutoffF: category.cutoffF,
			updatedAt: tierListItem.updatedAt
		})
		.from(tierListItem)
		.innerJoin(category, eq(category.id, tierListItem.categoryId))
		.orderBy(desc(tierListItem.updatedAt));

	const allTags = await db
		.select({ itemId: itemTag.itemId, slug: tag.slug, label: tag.label })
		.from(itemTag)
		.innerJoin(tag, eq(tag.slug, itemTag.tagSlug));

	const tagsByItemId = new Map<number, { slug: string; label: string }[]>();
	for (const row of allTags) {
		const existing = tagsByItemId.get(row.itemId) ?? [];
		existing.push({ slug: row.slug, label: row.label });
		tagsByItemId.set(row.itemId, existing);
	}

	const itemsWithTags = items.map((item) => ({
		...item,
		tags: tagsByItemId.get(item.id) ?? []
	}));

	return { items: itemsWithTags };
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id' });

		await db.delete(tierListItem).where(eq(tierListItem.id, id));
		return { success: true };
	}
};
