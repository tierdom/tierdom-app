import { db } from '$lib/server/db';
import { category, tierListItem, page, siteSetting } from '$lib/server/db/schema';
import { siteContentBlocks } from '$lib/server/site-content';
import { countStaleTrash, STALE_TRASH_DAYS } from '$lib/server/db/soft-delete';
import { count, eq, asc, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [catCount] = await db.select({ count: count() }).from(category);
  const [itemCount] = await db.select({ count: count() }).from(tierListItem);
  const [pageCount] = await db.select({ count: count() }).from(page);

  const categories = await db
    .select({
      id: category.id,
      name: category.name,
      itemCount: count(tierListItem.id),
      updatedAt: category.updatedAt,
    })
    .from(category)
    .leftJoin(tierListItem, eq(tierListItem.categoryId, category.id))
    .groupBy(category.id)
    .orderBy(asc(category.order));

  const recentItems = await db
    .select({
      id: tierListItem.id,
      name: tierListItem.name,
      score: tierListItem.score,
      categoryId: tierListItem.categoryId,
      categoryName: category.name,
      updatedAt: tierListItem.updatedAt,
    })
    .from(tierListItem)
    .innerJoin(category, eq(category.id, tierListItem.categoryId))
    .orderBy(desc(tierListItem.updatedAt))
    .limit(5);

  const pages = await db
    .select({ slug: page.slug, title: page.title, updatedAt: page.updatedAt })
    .from(page);

  const siteSettings = await db
    .select({ key: siteSetting.key, updatedAt: siteSetting.updatedAt })
    .from(siteSetting);
  const updatedAtByKey = new Map(siteSettings.map((r) => [r.key, r.updatedAt]));
  const siteContent = Object.entries(siteContentBlocks).map(([key, block]) => ({
    key,
    title: block.title,
    updatedAt: updatedAtByKey.get(key) ?? null,
  }));

  return {
    counts: {
      categories: catCount?.count ?? 0,
      items: itemCount?.count ?? 0,
      pages: pageCount?.count ?? 0,
    },
    categories,
    recentItems,
    pages,
    siteContent,
    staleTrash: countStaleTrash(db),
    staleTrashDays: STALE_TRASH_DAYS,
  };
};
