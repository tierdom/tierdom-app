import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { category } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { isSetupComplete } from '$lib/server/setup';
import { getSiteContentHtml } from '$lib/server/site-content';

export const load: LayoutServerLoad = async ({ locals }) => {
  const categories = await db
    .select({ id: category.id, slug: category.slug, name: category.name })
    .from(category)
    .orderBy(asc(category.order));

  const footerHtml = await getSiteContentHtml('footer');

  return {
    categories,
    user: locals.user,
    setupComplete: isSetupComplete(db),
    footerHtml,
  };
};
