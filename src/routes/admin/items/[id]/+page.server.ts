import { db } from '$lib/server/db';
import { tag, tierListItem, itemTag } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
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
	const id = Number(params.id);
	const [item] = await db.select().from(tierListItem).where(eq(tierListItem.id, id)).limit(1);
	if (!item) error(404, 'Item not found');

	const allTags = await db.select().from(tag).orderBy(asc(tag.label));
	const currentTags = await db
		.select({ slug: itemTag.tagSlug })
		.from(itemTag)
		.where(eq(itemTag.itemId, id));

	return { item, allTags, itemTags: currentTags.map((t) => t.slug) };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const id = Number(params.id);
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		if (!name) return fail(400, { error: 'Name is required' });

		const slug = data.get('slug')?.toString()?.trim() || slugify(name);
		const score = Math.round(Number(data.get('score')));
		if (isNaN(score) || score < 0 || score > 100) {
			return fail(400, { error: 'Score must be an integer 0-100' });
		}

		const description = data.get('description')?.toString()?.trim() || null;

		const [item] = await db
			.select({ categoryId: tierListItem.categoryId })
			.from(tierListItem)
			.where(eq(tierListItem.id, id))
			.limit(1);

		await db
			.update(tierListItem)
			.set({ name, slug, score, description })
			.where(eq(tierListItem.id, id));

		// Sync tags
		const tagSlugs = data.getAll('tags').map((s) => s.toString());
		await db.delete(itemTag).where(eq(itemTag.itemId, id));
		if (tagSlugs.length > 0) {
			await db
				.insert(itemTag)
				.values(tagSlugs.map((tagSlug) => ({ itemId: id, tagSlug })));
		}

		redirect(303, `/admin/categories/${item.categoryId}`);
	},

	createTag: async ({ request }) => {
		const data = await request.formData();
		const label = data.get('label')?.toString()?.trim();
		if (!label) return fail(400, { error: 'Label is required' });

		const newTag = await getOrCreateTag(label);
		return { tag: newTag };
	},

	delete: async ({ params }) => {
		const id = Number(params.id);
		const [item] = await db
			.select({ categoryId: tierListItem.categoryId })
			.from(tierListItem)
			.where(eq(tierListItem.id, id))
			.limit(1);

		await db.delete(tierListItem).where(eq(tierListItem.id, id));
		redirect(303, `/admin/categories/${item?.categoryId ?? ''}`);
	}
};
