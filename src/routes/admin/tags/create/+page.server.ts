import { db } from '$lib/server/db';
import { tag } from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const label = data.get('label')?.toString()?.trim();
		if (!label) return fail(400, { error: 'Label is required' });

		const slug = data.get('slug')?.toString()?.trim() || slugify(label);
		if (!slug) return fail(400, { error: 'Slug is required' });

		await db.insert(tag).values({ slug, label });

		redirect(303, '/admin/tags');
	}
};
