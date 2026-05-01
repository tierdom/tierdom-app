import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { isSetupComplete } from '$lib/server/setup';
import { seedPreset } from '$lib/server/setup-seed';
import { bootstrapAdminUser } from '$lib/server/auth/bootstrap';
import { createSession, setSessionCookie } from '$lib/server/auth/session';
import type { PageServerLoad, Actions } from './$types';

const VALID_PRESETS = new Set(['empty', 'minimal', 'demo']);

export const load: PageServerLoad = async () => {
  if (isSetupComplete(db)) {
    redirect(303, '/');
  }
};

export const actions: Actions = {
  default: async (event) => {
    if (isSetupComplete(db)) {
      redirect(303, '/');
    }

    const data = await event.request.formData();
    const preset = data.get('preset');

    if (typeof preset !== 'string' || !VALID_PRESETS.has(preset)) {
      return fail(400, { error: 'Please select a setup option.' });
    }

    const username = data.get('username')?.toString().trim();
    if (!username) {
      return fail(400, { error: 'Username is required.' });
    }

    const password = data.get('password')?.toString() || 'admin';

    const images = data.get('images') === '1';
    await seedPreset(db, preset, images);
    const userId = bootstrapAdminUser(db, password, username);

    if (userId) {
      const { token, expiresAt } = createSession(db, userId);
      setSessionCookie(event, token, expiresAt);
    }

    redirect(303, '/admin');
  },
};
