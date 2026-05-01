import { error, fail, redirect } from '@sveltejs/kit';
import {
  MAX_SITE_CONTENT_BYTES,
  SiteContentTooLargeError,
  clearSiteContent,
  getSiteContentRecord,
  isSiteContentKey,
  setSiteContent,
  siteContentBlocks,
} from '$lib/server/site-content';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  if (!isSiteContentKey(params.key)) error(404, 'Unknown content key');

  const record = await getSiteContentRecord(params.key);
  const block = siteContentBlocks[params.key];

  return {
    key: params.key,
    title: block.title,
    description: block.description,
    fallback: block.fallback,
    value: record.value ?? '',
    usingFallback: !record.value?.trim(),
    maxBytes: MAX_SITE_CONTENT_BYTES,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    if (!isSiteContentKey(params.key)) error(404, 'Unknown content key');

    const data = await request.formData();
    const value = data.get('content')?.toString() ?? '';
    if (!value.trim()) return fail(400, { error: 'Content is required', value });

    try {
      await setSiteContent(params.key, value);
    } catch (err) {
      if (err instanceof SiteContentTooLargeError) {
        return fail(400, {
          error: `Content is ${err.byteLength.toLocaleString()} bytes, exceeds the ${err.maxBytes.toLocaleString()} byte limit.`,
          value,
        });
      }
      throw err;
    }

    redirect(303, '/admin/cms');
  },

  reset: async ({ params }) => {
    if (!isSiteContentKey(params.key)) error(404, 'Unknown content key');

    await clearSiteContent(params.key);

    redirect(303, '/admin/cms');
  },
};
