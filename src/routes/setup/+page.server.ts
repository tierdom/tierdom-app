import { redirect, fail } from '@sveltejs/kit';
import { isSetupComplete, markSetupComplete } from '$lib/server/setup';
import { seedPreset } from '$lib/server/setup-seed';
import type { PageServerLoad, Actions } from './$types';

const VALID_PRESETS = new Set(['empty', 'minimal', 'demo']);

export const load: PageServerLoad = async () => {
	if (isSetupComplete()) {
		redirect(303, '/');
	}
};

export const actions: Actions = {
	default: async ({ request }) => {
		if (isSetupComplete()) {
			redirect(303, '/');
		}

		const data = await request.formData();
		const preset = data.get('preset');

		if (typeof preset !== 'string' || !VALID_PRESETS.has(preset)) {
			return fail(400, { error: 'Please select a setup option.' });
		}

		seedPreset(preset);
		markSetupComplete();

		redirect(303, '/admin/login');
	}
};
