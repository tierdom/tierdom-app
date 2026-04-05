import { error } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { category, tierListItem, itemTag, tag } from '$lib/server/db/schema';
import { renderMarkdown } from '$lib/server/markdown';

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

const DEFAULT_CUTOFFS: Record<Tier, number> = {
	S: 90,
	A: 75,
	B: 60,
	C: 45,
	D: 30,
	E: 15,
	F: 0
};

function scoreToTier(score: number, cutoffs: Record<Tier, number>): Tier {
	for (const tier of TIERS) {
		if (score >= cutoffs[tier]) return tier;
	}
	return 'F';
}

export const load: PageServerLoad = async ({ params }) => {
	const [cat] = await db.select().from(category).where(eq(category.slug, params.slug)).limit(1);

	if (!cat) error(404, 'Category not found');

	const cutoffs: Record<Tier, number> = {
		S: cat.cutoffS ?? DEFAULT_CUTOFFS.S,
		A: cat.cutoffA ?? DEFAULT_CUTOFFS.A,
		B: cat.cutoffB ?? DEFAULT_CUTOFFS.B,
		C: cat.cutoffC ?? DEFAULT_CUTOFFS.C,
		D: cat.cutoffD ?? DEFAULT_CUTOFFS.D,
		E: cat.cutoffE ?? DEFAULT_CUTOFFS.E,
		F: cat.cutoffF ?? DEFAULT_CUTOFFS.F
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

	const tagsByItemId = new Map<number, { slug: string; label: string }[]>();
	for (const row of tagsPerItem) {
		const existing = tagsByItemId.get(row.itemId) ?? [];
		existing.push({ slug: row.slug, label: row.label });
		tagsByItemId.set(row.itemId, existing);
	}

	const itemsWithTags = items.map((item) => ({
		...item,
		descriptionHtml: renderMarkdown(item.description),
		tags: tagsByItemId.get(item.id) ?? []
	}));

	// Group items by tier, preserving S→F order
	const grouped = new Map<Tier, typeof itemsWithTags>(TIERS.map((t) => [t, []]));
	for (const item of itemsWithTags) {
		const tier = scoreToTier(item.score, cutoffs);
		grouped.get(tier)!.push(item);
	}

	// Only include tiers that have at least one item
	const tiers = TIERS.filter((t) => grouped.get(t)!.length > 0).map((t) => ({
		tier: t,
		items: grouped.get(t)!
	}));

	return {
		category: { ...cat, descriptionHtml: renderMarkdown(cat.description) },
		tiers
	};
};
