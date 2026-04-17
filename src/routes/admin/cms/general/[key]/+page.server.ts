import { error, fail, redirect } from '@sveltejs/kit';
import {
  getSiteContentRecord,
  isSiteContentKey,
  setSiteContent,
  siteContentBlocks
} from '$lib/server/site-content';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  if (!isSiteContentKey(params.key)) error(404, 'Unknown content key');

  const record = await getSiteContentRecord(params.key);

  return {
    key: params.key,
    title: siteContentBlocks[params.key].title,
    value: record.value ?? '',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    if (!isSiteContentKey(params.key)) error(404, 'Unknown content key');

    const data = await request.formData();
    const value = data.get('content')?.toString() ?? '';
    if (!value.trim()) return fail(400, { error: 'Content is required' });

    await setSiteContent(params.key, value);

    redirect(303, '/admin/cms');
  }
};
