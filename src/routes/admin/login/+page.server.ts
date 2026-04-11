import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession, setSessionCookie } from '$lib/server/auth/session';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '$lib/server/auth/rate-limit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(303, '/admin');
	}
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const ip = event.getClientAddress();

		if (isRateLimited(ip)) {
			return fail(429, { error: 'Too many login attempts. Try again in a minute.', username: '' });
		}

		const data = await event.request.formData();
		const username = data.get('username')?.toString()?.trim();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required', username: username ?? '' });
		}

		const [found] = db
			.select()
			.from(user)
			.where(eq(user.username, username.toLowerCase()))
			.limit(1)
			.all();

		if (!found || !verifyPassword(password, found.passwordHash)) {
			recordFailedAttempt(ip);
			return fail(401, { error: 'Invalid username or password', username });
		}

		clearAttempts(ip);

		const { token, expiresAt } = createSession(found.id);
		setSessionCookie(event, token, expiresAt);

		redirect(303, '/admin');
	}
};
