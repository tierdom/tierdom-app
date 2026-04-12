import { db } from '$lib/server/db';
import { category } from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { parseCategoryForm } from '$lib/server/forms';
import type { Actions } from './$types';

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const parsed = parseCategoryForm(data);
    if ('error' in parsed) return fail(400, { error: parsed.error });

    const { name, slug, description, propKeys, cutoffs } = parsed;

    const [maxOrder] = await db
      .select({ max: sql<number>`coalesce(max(${category.order}), -1)` })
      .from(category);

    await db.insert(category).values({
      slug,
      name,
      description,
      propKeys,
      order: maxOrder.max + 1,
      ...cutoffs
    });

    redirect(303, '/admin/categories');
  }
};
