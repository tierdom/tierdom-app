import { db } from '$lib/server/db';
import { siteSetting } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const KNOWN_KEYS: Record<string, { title: string }> = {
  footer: { title: 'Footer' }
};

export const load: PageServerLoad = async ({ params }) => {
  const meta = KNOWN_KEYS[params.key];
  if (!meta) error(404, 'Unknown content key');

  const [record] = await db
    .select()
    .from(siteSetting)
    .where(eq(siteSetting.key, params.key))
    .limit(1);

  return {
    key: params.key,
    title: meta.title,
    value: record?.value ?? '',
    createdAt: record?.createdAt ?? null,
    updatedAt: record?.updatedAt ?? null
  };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    if (!KNOWN_KEYS[params.key]) error(404, 'Unknown content key');

    const data = await request.formData();
    const value = data.get('content')?.toString() ?? '';
    if (!value.trim()) return fail(400, { error: 'Content is required' });

    await db
      .insert(siteSetting)
      .values({ key: params.key, value })
      .onConflictDoUpdate({ target: siteSetting.key, set: { value } });

    redirect(303, '/admin/cms');
  }
};
