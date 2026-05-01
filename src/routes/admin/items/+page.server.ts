import { db } from '$lib/server/db';
import { tierListItem, category } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { softDeleteItem } from '$lib/server/db/soft-delete';
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
      updatedAt: tierListItem.updatedAt,
      props: tierListItem.props,
    })
    .from(tierListItem)
    .innerJoin(category, eq(category.id, tierListItem.categoryId))
    .orderBy(desc(tierListItem.updatedAt));

  return { items };
};

export const actions: Actions = {
  delete: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id')?.toString();
    if (!id) return fail(400, { error: 'Invalid id' });

    softDeleteItem(db, id);
    return { success: true };
  },
};
