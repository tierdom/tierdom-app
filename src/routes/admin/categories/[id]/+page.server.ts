import { db } from '$lib/server/db';
import { category, categoryTable, tierListItem, tierListItemTable } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { applyOrder, sortCategoryByScore } from '$lib/server/reorder';
import { softDeleteCategory, softDeleteItem } from '$lib/server/db/soft-delete';
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

  return { category: cat, items };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    const id = params.id;
    const data = await request.formData();
    const parsed = parseCategoryForm(data);
    if ('error' in parsed) return fail(400, { error: parsed.error });

    const { name, slug, description, propKeys, cutoffs } = parsed;

    await db
      .update(categoryTable)
      .set({ name, slug, description, propKeys, ...cutoffs })
      .where(eq(categoryTable.id, id));

    redirect(303, '/admin/categories');
  },

  delete: async ({ params }) => {
    softDeleteCategory(db, params.id);
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

    await applyOrder(tierListItemTable, tierListItemTable.id, tierListItemTable.order, orderedIds);
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

    softDeleteItem(db, id);
    return { success: true };
  }
};
