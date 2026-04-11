import { db } from '$lib/server/db';
import { category, tierListItem, itemTag, tag } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { applyOrder, sortCategoryByScore } from '$lib/server/reorder';
import { deleteImage } from '$lib/server/images';
import { parseCategoryForm } from '$lib/server/forms';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const id = params.id;
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

  const tagsByItemId = new Map<string, { slug: string; label: string }[]>();
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
    const id = params.id;
    const data = await request.formData();
    const parsed = parseCategoryForm(data);
    if ('error' in parsed) return fail(400, { error: parsed.error });

    const { name, slug, description, cutoffs } = parsed;

    await db
      .update(category)
      .set({ name, slug, description, ...cutoffs })
      .where(eq(category.id, id));

    redirect(303, '/admin/categories');
  },

  delete: async ({ params }) => {
    const id = params.id;

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

    let orderedIds: string[];
    try {
      orderedIds = JSON.parse(orderJson);
    } catch {
      return fail(400, { error: 'Invalid order format' });
    }

    if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === 'string')) {
      return fail(400, { error: 'Invalid order data' });
    }

    await applyOrder(tierListItem, tierListItem.id, tierListItem.order, orderedIds);
    return { success: true };
  },

  sortByScore: async ({ params }) => {
    const id = params.id;
    sortCategoryByScore(id);
    return { success: true };
  },

  deleteItem: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id')?.toString();
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
