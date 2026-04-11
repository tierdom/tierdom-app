import { db } from '$lib/server/db';
import { tag, itemTag, tierListItem, category } from '$lib/server/db/schema';
import { asc, count, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // All tags with total usage count
  const tags = await db
    .select({
      slug: tag.slug,
      label: tag.label,
      usageCount: count(itemTag.itemId)
    })
    .from(tag)
    .leftJoin(itemTag, eq(itemTag.tagSlug, tag.slug))
    .groupBy(tag.slug)
    .orderBy(asc(tag.label));

  // Per-tag breakdown: how many items in each category
  const breakdown = await db
    .select({
      tagSlug: itemTag.tagSlug,
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      itemCount: count(itemTag.itemId)
    })
    .from(itemTag)
    .innerJoin(tierListItem, eq(tierListItem.id, itemTag.itemId))
    .innerJoin(category, eq(category.id, tierListItem.categoryId))
    .groupBy(itemTag.tagSlug, category.id)
    .orderBy(asc(category.name));

  // Group breakdown by tag slug
  const breakdownByTag = new Map<
    string,
    { categoryId: number; categoryName: string; categorySlug: string; itemCount: number }[]
  >();
  for (const row of breakdown) {
    const existing = breakdownByTag.get(row.tagSlug) ?? [];
    existing.push({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      itemCount: row.itemCount
    });
    breakdownByTag.set(row.tagSlug, existing);
  }

  return {
    tags: tags.map((t) => ({
      ...t,
      categories: breakdownByTag.get(t.slug) ?? []
    }))
  };
};
