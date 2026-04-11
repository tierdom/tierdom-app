import { error } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { category, tierListItem, itemTag, tag } from '$lib/server/db/schema';
import { renderMarkdown } from '$lib/server/markdown';
import { type Tier, scoreToTier } from '$lib/tier';

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

export const load: PageServerLoad = async ({ params }) => {
  const [cat] = await db.select().from(category).where(eq(category.slug, params.slug)).limit(1);

  if (!cat) error(404, 'Category not found');

  const cutoffs = {
    S: cat.cutoffS,
    A: cat.cutoffA,
    B: cat.cutoffB,
    C: cat.cutoffC,
    D: cat.cutoffD,
    E: cat.cutoffE,
    F: cat.cutoffF
  };

  const items = await db
    .select()
    .from(tierListItem)
    .where(eq(tierListItem.categoryId, cat.id))
    .orderBy(asc(tierListItem.order));

  const tagsPerItem = await db
    .select({ itemId: itemTag.itemId, slug: tag.slug, label: tag.label })
    .from(itemTag)
    .innerJoin(tag, eq(tag.slug, itemTag.tagSlug))
    .innerJoin(tierListItem, eq(tierListItem.id, itemTag.itemId))
    .where(eq(tierListItem.categoryId, cat.id));

  const tagsByItemId = new Map<string, { slug: string; label: string }[]>();
  for (const row of tagsPerItem) {
    const existing = tagsByItemId.get(row.itemId) ?? [];
    existing.push({ slug: row.slug, label: row.label });
    tagsByItemId.set(row.itemId, existing);
  }

  const itemsWithTags = items.map((item) => ({
    ...item,
    image: item.imageHash ? `/assets/images/${item.imageHash}.webp` : null,
    placeholder: item.placeholder,
    descriptionHtml: renderMarkdown(item.description),
    tags: tagsByItemId.get(item.id) ?? []
  }));

  // Group items by tier, preserving S→F order
  const grouped = new Map<Tier, typeof itemsWithTags>(TIERS.map((t) => [t, []]));
  for (const item of itemsWithTags) {
    const tier = scoreToTier(item.score, cutoffs as Partial<Record<Tier, number | null>>);
    grouped.get(tier)!.push(item);
  }

  const tiers = TIERS.map((t) => ({
    tier: t,
    items: grouped.get(t)!
  }));

  return {
    category: { ...cat, descriptionHtml: renderMarkdown(cat.description) },
    tiers
  };
};
