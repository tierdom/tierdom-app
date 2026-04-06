import { db } from '$lib/server/db';
import { page } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

let setupComplete: boolean | null = null;

export function isSetupComplete(): boolean {
	if (setupComplete === null) {
		const home = db.select({ slug: page.slug }).from(page).where(eq(page.slug, 'home')).get();
		setupComplete = !!home;
	}
	return setupComplete;
}

export function markSetupComplete(): void {
	setupComplete = true;
}
