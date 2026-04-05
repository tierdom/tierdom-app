import { db } from '$lib/server/db';
import { category, tag, tierListItem, itemTag } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { getOrCreateTag } from '$lib/server/tags';
import { slugify } from '$lib/server/slugify';
import { insertByScore } from '$lib/server/reorder';
import type { PageServerLoad, Actions } from './$types';

type ReturnTarget = 'categories' | 'items';

function resolveReturnUrl(target: ReturnTarget, categoryId: number): string {
	return target === 'categories' ? `/admin/categories/${categoryId}` : '/admin/items';
}

export const load: PageServerLoad = async ({ params, url }) => {
	const isNew = params.id === 'new-item';
	const returnTarget: ReturnTarget =
		url.searchParams.get('returnTo') === 'categories' ? 'categories' : 'items';
	const categories = await db
		.select({ id: category.id, name: category.name })
		.from(category)
		.orderBy(asc(category.order));
	const allTags = await db.select().from(tag).orderBy(asc(tag.label));

	if (isNew) {
		const prefillCategoryId = url.searchParams.has('category')
			? Number(url.searchParams.get('category'))
			: null;
		return {
			mode: 'create' as const,
			categories,
			allTags,
			prefillCategoryId,
			returnTarget,
			backUrl: prefillCategoryId
				? resolveReturnUrl(returnTarget, prefillCategoryId)
				: '/admin/items'
		};
	}

	const id = Number(params.id);
	const [item] = await db.select().from(tierListItem).where(eq(tierListItem.id, id)).limit(1);
	if (!item) error(404, 'Item not found');

	const currentTags = await db
		.select({ slug: itemTag.tagSlug })
		.from(itemTag)
		.where(eq(itemTag.itemId, id));

	return {
		mode: 'edit' as const,
		item,
		categories,
		allTags,
		itemTags: currentTags.map((t) => t.slug),
		returnTarget,
		backUrl: resolveReturnUrl(returnTarget, item.categoryId)
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		if (!name) return fail(400, { error: 'Name is required' });

		const slug = data.get('slug')?.toString()?.trim() || slugify(name);
		const score = Math.round(Number(data.get('score')));
		if (isNaN(score) || score < 0 || score > 100) {
			return fail(400, { error: 'Score must be an integer 0-100' });
		}

		const categoryId = Number(data.get('categoryId'));
		if (isNaN(categoryId) || categoryId <= 0) {
			return fail(400, { error: 'Category is required' });
		}

		const description = data.get('description')?.toString()?.trim() || null;
		const tagSlugs = data.getAll('tags').map((s) => s.toString());
		const returnTarget: ReturnTarget =
			data.get('_returnTarget')?.toString() === 'categories' ? 'categories' : 'items';

		if (params.id === 'new-item') {
			// Create — insert with a temporary order, then fix it by score
			const [inserted] = await db
				.insert(tierListItem)
				.values({ categoryId, slug, name, description, score, order: 0 })
				.returning({ id: tierListItem.id });

			const order = insertByScore(categoryId, score, name, inserted.id);
			await db.update(tierListItem).set({ order }).where(eq(tierListItem.id, inserted.id));

			if (tagSlugs.length > 0) {
				await db
					.insert(itemTag)
					.values(tagSlugs.map((tagSlug) => ({ itemId: inserted.id, tagSlug })));
			}

			redirect(303, resolveReturnUrl(returnTarget, categoryId));
		}

		// Update
		const id = Number(params.id);
		const [item] = await db
			.select({ categoryId: tierListItem.categoryId })
			.from(tierListItem)
			.where(eq(tierListItem.id, id))
			.limit(1);

		const categoryChanged = categoryId !== item.categoryId;

		await db
			.update(tierListItem)
			.set({ name, slug, score, description, categoryId })
			.where(eq(tierListItem.id, id));

		if (categoryChanged) {
			const newOrder = insertByScore(categoryId, score, name, id);
			await db.update(tierListItem).set({ order: newOrder }).where(eq(tierListItem.id, id));
		}

		// Sync tags
		await db.delete(itemTag).where(eq(itemTag.itemId, id));
		if (tagSlugs.length > 0) {
			await db.insert(itemTag).values(tagSlugs.map((tagSlug) => ({ itemId: id, tagSlug })));
		}

		redirect(303, resolveReturnUrl(returnTarget, categoryId));
	},

	createTag: async ({ request }) => {
		const data = await request.formData();
		const label = data.get('label')?.toString()?.trim();
		if (!label) return fail(400, { error: 'Label is required' });

		const newTag = await getOrCreateTag(label);
		return { tag: newTag };
	},

	delete: async ({ request, params }) => {
		if (params.id === 'new-item') return fail(400, { error: 'Cannot delete a new item' });

		const id = Number(params.id);
		const data = await request.formData();
		const returnTarget: ReturnTarget =
			data.get('_returnTarget')?.toString() === 'categories' ? 'categories' : 'items';

		const [item] = await db
			.select({ categoryId: tierListItem.categoryId })
			.from(tierListItem)
			.where(eq(tierListItem.id, id))
			.limit(1);

		await db.delete(tierListItem).where(eq(tierListItem.id, id));
		redirect(303, resolveReturnUrl(returnTarget, item?.categoryId ?? 0));
	}
};
