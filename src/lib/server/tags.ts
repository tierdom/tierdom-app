import { db } from '$lib/server/db';
import { tag } from '$lib/server/db/schema';
import { slugify } from '$lib/server/slugify';
import { eq } from 'drizzle-orm';

export async function getOrCreateTag(label: string): Promise<{ slug: string; label: string }> {
	const slug = slugify(label);
	const [existing] = await db.select().from(tag).where(eq(tag.slug, slug)).limit(1);
	if (existing) return existing;

	await db.insert(tag).values({ slug, label });
	return { slug, label };
}
