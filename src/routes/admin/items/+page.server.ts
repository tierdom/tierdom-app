import { db } from '$lib/server/db';
import { tierListItem, tierListItemTable, category } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { deleteImage } from '$lib/server/images';
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
      props: tierListItem.props
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

    const [item] = await db
      .select({ imageHash: tierListItem.imageHash })
      .from(tierListItem)
      .where(eq(tierListItem.id, id))
      .limit(1);
    if (item?.imageHash) deleteImage(item.imageHash);

    await db.delete(tierListItemTable).where(eq(tierListItemTable.id, id));
    return { success: true };
  }
};
