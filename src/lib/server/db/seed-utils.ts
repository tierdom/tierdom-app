import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { category, tierListItem } from './schema';
import type { SeedCategory } from './seed-data';
import { slugify } from '../slugify';
import type * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

export function seedCategories(db: DB, categories: SeedCategory[]): number {
  let totalItems = 0;

  for (const cat of categories) {
    const inserted = db
      .insert(category)
      .values({
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        order: cat.order
      })
      .returning({ id: category.id })
      .get();

    for (let i = 0; i < cat.items.length; i++) {
      const item = cat.items[i];
      db.insert(tierListItem)
        .values({
          categoryId: inserted.id,
          slug: slugify(item.name),
          name: item.name,
          description: item.description ?? null,
          score: item.score,
          order: i,
          props: item.props
        })
        .run();

      totalItems++;
    }
  }

  return totalItems;
}
