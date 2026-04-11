import { db } from '$lib/server/db';
import { category } from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { slugify } from '$lib/server/slugify';
import type { Actions } from './$types';

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString()?.trim();
    if (!name) return fail(400, { error: 'Name is required' });

    const slug = data.get('slug')?.toString()?.trim() || slugify(name);
    const description = data.get('description')?.toString()?.trim() || null;

    const cutoffS = data.get('cutoffS')?.toString()?.trim();
    const cutoffA = data.get('cutoffA')?.toString()?.trim();
    const cutoffB = data.get('cutoffB')?.toString()?.trim();
    const cutoffC = data.get('cutoffC')?.toString()?.trim();
    const cutoffD = data.get('cutoffD')?.toString()?.trim();
    const cutoffE = data.get('cutoffE')?.toString()?.trim();
    const cutoffF = data.get('cutoffF')?.toString()?.trim();

    const [maxOrder] = await db
      .select({ max: sql<number>`coalesce(max(${category.order}), -1)` })
      .from(category);

    await db.insert(category).values({
      slug,
      name,
      description,
      order: maxOrder.max + 1,
      cutoffS: cutoffS ? Number(cutoffS) : null,
      cutoffA: cutoffA ? Number(cutoffA) : null,
      cutoffB: cutoffB ? Number(cutoffB) : null,
      cutoffC: cutoffC ? Number(cutoffC) : null,
      cutoffD: cutoffD ? Number(cutoffD) : null,
      cutoffE: cutoffE ? Number(cutoffE) : null,
      cutoffF: cutoffF ? Number(cutoffF) : null
    });

    redirect(303, '/admin/categories');
  }
};
