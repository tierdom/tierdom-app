import { db } from '$lib/server/db';
import { category, tag, tierListItem, itemTag } from '$lib/server/db/schema';
import { asc, eq, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { getOrCreateTag } from '$lib/server/tags';
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

	const allTags = await db.select().from(tag).orderBy(asc(tag.label));

	return { category: cat, allTags };
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

		const [inserted] = await db
			.insert(tierListItem)
			.values({
				categoryId,
				slug,
				name,
				description,
				score,
				order: maxOrder.max + 1
			})
			.returning({ id: tierListItem.id });

		// Insert tags
		const tagSlugs = data.getAll('tags').map((s) => s.toString());
		if (tagSlugs.length > 0) {
			await db
				.insert(itemTag)
				.values(tagSlugs.map((tagSlug) => ({ itemId: inserted.id, tagSlug })));
		}

		redirect(303, `/admin/categories/${categoryId}`);
	},

	createTag: async ({ request }) => {
		const data = await request.formData();
		const label = data.get('label')?.toString()?.trim();
		if (!label) return fail(400, { error: 'Label is required' });

		const newTag = await getOrCreateTag(label);
		return { tag: newTag };
	}
};
