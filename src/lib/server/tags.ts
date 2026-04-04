import { db } from '$lib/server/db';
import { tag } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export async function getOrCreateTag(label: string): Promise<{ slug: string; label: string }> {
	const slug = slugify(label);
	const [existing] = await db.select().from(tag).where(eq(tag.slug, slug)).limit(1);
	if (existing) return existing;

	await db.insert(tag).values({ slug, label });
	return { slug, label };
}
