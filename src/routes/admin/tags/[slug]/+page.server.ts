import { db } from '$lib/server/db';
import { tag } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const [found] = await db.select().from(tag).where(eq(tag.slug, params.slug)).limit(1);
  if (!found) error(404, 'Tag not found');

  return { tag: found };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    const data = await request.formData();
    const label = data.get('label')?.toString()?.trim();
    if (!label) return fail(400, { error: 'Label is required' });

    const newSlug = data.get('slug')?.toString()?.trim();
    if (!newSlug) return fail(400, { error: 'Slug is required' });

    await db.update(tag).set({ slug: newSlug, label }).where(eq(tag.slug, params.slug));

    redirect(303, '/admin/tags');
  },

  delete: async ({ params }) => {
    await db.delete(tag).where(eq(tag.slug, params.slug));
    redirect(303, '/admin/tags');
  }
};
