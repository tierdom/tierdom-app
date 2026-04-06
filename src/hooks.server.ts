import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import {
	validateSession,
	getSessionToken,
	setSessionCookie,
	deleteSessionCookie
} from '$lib/server/auth/session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;

	// Skip session handling for public asset routes (keeps responses cookie-free for CDN caching)
	const isAssetRoute = event.url.pathname.startsWith('/assets/');

	const token = getSessionToken(event);
	if (token && !isAssetRoute) {
		const result = validateSession(token);
		if (result.session && result.user) {
			event.locals.user = result.user;
			event.locals.session = result.session;
			setSessionCookie(event, token, result.session.expiresAt);
		} else {
			deleteSessionCookie(event);
		}
	}

	if (event.url.pathname.startsWith('/admin') && event.url.pathname !== '/admin/login') {
		if (!event.locals.user) {
			redirect(303, '/admin/login');
		}
	}

	return resolve(event);
};
