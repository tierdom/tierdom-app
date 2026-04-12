import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { page } from '$lib/server/db/schema';
import { CATEGORIES, PAGES } from '$lib/server/db/seed-data';
import { seedCategories } from '$lib/server/db/seed-utils';
import { generateSeedImages } from '$lib/server/db/seed-images';

function seedPages(pages: { slug: string; title: string; content: string }[]): void {
  db.insert(page).values(pages).run();
}

export async function seedPreset(preset: string, images = false): Promise<void> {
  switch (preset) {
    case 'empty':
      seedPages([
        {
          slug: 'home',
          title: 'Home',
          content:
            '# Welcome\n\nThis is your new Tierdom instance. Head to [the admin](/admin) to start building your tier lists.'
        },
        {
          slug: 'about',
          title: 'About',
          content: '# About\n\nThis page can be edited in the admin panel.'
        }
      ]);
      break;

    case 'minimal':
      seedPages([
        {
          slug: 'home',
          title: 'Home',
          content:
            '# Welcome to **Tierdom**\n\nA personal, self-hosted collection of tier-ranked lists.'
        },
        {
          slug: 'about',
          title: 'About',
          content:
            '# About\n\n**Tierdom** is a personal, self-hosted tier list application. Edit this page in the admin panel to make it your own.'
        }
      ]);
      seedCategories(db, [
        {
          slug: 'tier-list',
          name: 'Tier List',
          description: 'A general-purpose tier list. Rename it, or create new ones in the admin.',
          order: 0,
          items: [
            {
              name: 'Sample Item',
              score: 100,
              description:
                'This is a **sample item** to show how tier lists work.\n\nEdit or delete it in the admin panel.'
            }
          ]
        }
      ]);
      break;

    case 'demo':
      seedPages(PAGES);
      seedCategories(db, CATEGORIES);
      break;

    default:
      throw new Error(`Unknown preset: ${preset}`);
  }

  if (images) {
    await generateSeedImages(db, env.DATA_PATH!);
  }
}
