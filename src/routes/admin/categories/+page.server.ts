import { db } from '$lib/server/db';
import { category, categoryTable, tierListItem } from '$lib/server/db/schema';
import { asc, count, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { applyOrder } from '$lib/server/reorder';
import { softDeleteCategory } from '$lib/server/db/soft-delete';
import type { PageServerLoad, Actions } from './$types';

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
  delete: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id')?.toString();
    if (!id) return fail(400, { error: 'Invalid id' });

    softDeleteCategory(db, id);
    return { success: true };
  },

  reorder: async ({ request }) => {
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

    await applyOrder(categoryTable, categoryTable.id, categoryTable.order, orderedIds);
    return { success: true };
  }
};
