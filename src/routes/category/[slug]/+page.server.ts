import { error } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { category, tierListItem } from '$lib/server/db/schema';
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
    F: cat.cutoffF,
  };

  const items = await db
    .select()
    .from(tierListItem)
    .where(eq(tierListItem.categoryId, cat.id))
    .orderBy(asc(tierListItem.order));

  const cardKeys = (cat.propKeys ?? []).filter((pk) => pk.showOnCard);

  const enrichedItems = items.map((item) => ({
    ...item,
    image: item.imageHash ? `/assets/images/${item.imageHash}.webp` : null,
    placeholder: item.placeholder,
    descriptionHtml: renderMarkdown(item.description),
    cardProps: cardKeys
      .map((pk) => item.props.find((p) => p.key === pk.key)?.value?.trim())
      .filter((v): v is string => Boolean(v)),
  }));

  // Group items by tier, preserving S→F order
  const grouped = new Map<Tier, typeof enrichedItems>(TIERS.map((t) => [t, []]));
  for (const item of enrichedItems) {
    const tier = scoreToTier(item.score, cutoffs as Partial<Record<Tier, number | null>>);
    grouped.get(tier)!.push(item);
  }

  const tiers = TIERS.map((t) => ({
    tier: t,
    items: grouped.get(t)!,
  }));

  return {
    category: { ...cat, descriptionHtml: renderMarkdown(cat.description) },
    tiers,
  };
};
