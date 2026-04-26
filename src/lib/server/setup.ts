import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { page } from '$lib/server/db/schema';
import type * as schema from '$lib/server/db/schema';

type DB = BetterSQLite3Database<typeof schema>;

export function isSetupComplete(db: DB): boolean {
  const home = db.select({ slug: page.slug }).from(page).where(eq(page.slug, 'home')).get();
  return !!home;
}
