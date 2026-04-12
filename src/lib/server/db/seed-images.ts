/**
 * Batch image generation for seed data.
 *
 * Generates a deterministic placeholder image for every item that lacks one,
 * reusing the shared generateImage() pipeline from generate-image.ts.
 */

import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { tierListItem } from './schema';
import { generateImage } from '../generate-image';
import type * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

/**
 * Generate seed images for all items that lack one.
 *
 * @param db        Drizzle database handle
 * @param dataPath  DATA_PATH root (images written to `{dataPath}/images/`)
 * @returns         Number of images generated
 */
export async function generateSeedImages(db: DB, dataPath: string): Promise<number> {
  const imagesDir = join(dataPath, 'images');

  const items = db
    .select({ id: tierListItem.id, name: tierListItem.name })
    .from(tierListItem)
    .all();

  let count = 0;
  for (const item of items) {
    const { hash, gradient } = await generateImage(item.name, imagesDir);

    db.update(tierListItem)
      .set({ imageHash: hash, placeholder: gradient })
      .where(eq(tierListItem.id, item.id))
      .run();

    count++;
  }

  return count;
}
