import { db } from '$lib/server/db';
import { category, tierListItem, tag, page } from '$lib/server/db/schema';
import { count, eq, asc, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [cats] = await db.select({ count: count() }).from(category);
  const [items] = await db.select({ count: count() }).from(tierListItem);
  const [tags] = await db.select({ count: count() }).from(tag);
  const [pgs] = await db.select({ count: count() }).from(page);

  const categories = await db
    .select({
      id: category.id,
      name: category.name,
      itemCount: count(tierListItem.id),
      updatedAt: category.updatedAt
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
      updatedAt: tierListItem.updatedAt
    })
    .from(tierListItem)
    .innerJoin(category, eq(category.id, tierListItem.categoryId))
    .orderBy(desc(tierListItem.updatedAt))
    .limit(5);

  const pages = await db
    .select({ slug: page.slug, title: page.title, updatedAt: page.updatedAt })
    .from(page);

  return {
    counts: {
      categories: cats.count,
      items: items.count,
      tags: tags.count,
      pages: pgs.count
    },
    categories,
    recentItems,
    pages
  };
};
