import { redirect } from '@sveltejs/kit';
import { invalidateSession, getSessionToken, deleteSessionCookie } from '$lib/server/auth/session';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    const token = getSessionToken(event);
    if (token) {
      invalidateSession(token);
    }
    deleteSessionCookie(event);
    redirect(303, '/admin/login');
  }
};
