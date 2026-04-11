import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { category, tierListItem, page } from '$lib/server/db/schema';
import { asc, count, eq } from 'drizzle-orm';
import { renderMarkdown } from '$lib/server/markdown';

export const load: PageServerLoad = async () => {
  const categories = await db
    .select({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      itemCount: count(tierListItem.id)
    })
    .from(category)
    .leftJoin(tierListItem, eq(tierListItem.categoryId, category.id))
    .groupBy(category.id)
    .orderBy(asc(category.order));

  const categoriesWithHtml = categories.map((cat) => ({
    ...cat,
    descriptionHtml: renderMarkdown(cat.description)
  }));

  const [homePage] = await db.select().from(page).where(eq(page.slug, 'home')).limit(1);

  return {
    categoriesWithCounts: categoriesWithHtml,
    page: homePage ? { ...homePage, contentHtml: renderMarkdown(homePage.content) } : null
  };
};
