import { db } from '$lib/server/db';
import { page } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const [record] = await db.select().from(page).where(eq(page.slug, params.slug)).limit(1);
  if (!record) error(404, 'Page not found');
  return { page: record };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    const data = await request.formData();
    const title = data.get('title')?.toString()?.trim();
    if (!title) return fail(400, { error: 'Title is required' });

    const content = data.get('content')?.toString() ?? '';

    await db.update(page).set({ title, content }).where(eq(page.slug, params.slug));

    redirect(303, '/admin/cms');
  }
};
