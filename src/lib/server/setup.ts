import { db } from '$lib/server/db';
import { page } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export function isSetupComplete(): boolean {
  const home = db.select({ slug: page.slug }).from(page).where(eq(page.slug, 'home')).get();
  return !!home;
}
