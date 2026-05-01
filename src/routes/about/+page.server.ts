import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { page } from '$lib/server/db/schema';
import { renderMarkdown } from '$lib/server/markdown';

export const load: PageServerLoad = async () => {
  const [aboutPage] = await db.select().from(page).where(eq(page.slug, 'about')).limit(1);

  if (!aboutPage) error(404, 'Page not found');

  return {
    page: { ...aboutPage, contentHtml: renderMarkdown(aboutPage.content) },
  };
};
