import type { RequestEvent } from '@sveltejs/kit';

const SESSION_COOKIE = 'tierdom_session';

export function setSessionCookie(event: RequestEvent, token: string, expiresAt: number): void {
	event.cookies.set(SESSION_COOKIE, token, {
		sameSite: 'lax',
		path: '/',
		expires: new Date(expiresAt)
	});
}

export function deleteSessionCookie(event: RequestEvent): void {
	event.cookies.set(SESSION_COOKIE, '', {
		sameSite: 'lax',
		path: '/',
		maxAge: 0
	});
}

export function getSessionToken(event: RequestEvent): string | undefined {
	return event.cookies.get(SESSION_COOKIE);
}
