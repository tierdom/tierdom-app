import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import {
  invalidateSession,
  getSessionToken,
  deleteSessionCookie,
} from '#lib/server/auth/session.js';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    const token = getSessionToken(event);
    if (token) {
      invalidateSession(db, token);
    }
    deleteSessionCookie(event);
    redirect(303, '/admin/login');
  },
};
