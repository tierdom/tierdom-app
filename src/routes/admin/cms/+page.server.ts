import { db } from '#lib/server/db/index.js';
import { page } from '#lib/server/db/schema.js';
import { siteContentBlocks } from '#lib/server/site-content.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const pages = await db.select().from(page);
  const generalContent = Object.entries(siteContentBlocks).map(([key, block]) => ({
    key,
    title: block.title,
    description: block.description,
  }));
  return { pages, generalContent };
};
