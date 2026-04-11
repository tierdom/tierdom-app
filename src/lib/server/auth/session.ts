import { createHash, randomBytes } from 'node:crypto';
import { db } from '$lib/server/db';
import { session, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export { setSessionCookie, deleteSessionCookie, getSessionToken } from './cookies';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_MS = 15 * 24 * 60 * 60 * 1000;

export type SessionUser = { id: string; username: string };

export type SessionValidationResult =
	| { session: { id: string; expiresAt: number }; user: SessionUser }
	| { session: null; user: null };

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function createSession(userId: string): { token: string; expiresAt: number } {
	const token = randomBytes(32).toString('hex');
	const id = hashToken(token);
	const expiresAt = Date.now() + SESSION_DURATION_MS;

	db.insert(session).values({ id, userId, expiresAt }).run();

	return { token, expiresAt };
}

export function validateSession(token: string): SessionValidationResult {
	const id = hashToken(token);

	const rows = db
		.select({
			sessionId: session.id,
			expiresAt: session.expiresAt,
			userId: user.id,
			username: user.username
		})
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, id))
		.limit(1)
		.all();

	if (rows.length === 0) {
		return { session: null, user: null };
	}

	const row = rows[0];

	if (row.expiresAt < Date.now()) {
		db.delete(session).where(eq(session.id, id)).run();
		return { session: null, user: null };
	}

	// Sliding window: extend when less than half the duration remains
	if (row.expiresAt - Date.now() < SESSION_REFRESH_MS) {
		const newExpiry = Date.now() + SESSION_DURATION_MS;
		db.update(session).set({ expiresAt: newExpiry }).where(eq(session.id, id)).run();
		row.expiresAt = newExpiry;
	}

	return {
		session: { id: row.sessionId, expiresAt: row.expiresAt },
		user: { id: row.userId, username: row.username }
	};
}

export function invalidateSession(token: string): void {
	const id = hashToken(token);
	db.delete(session).where(eq(session.id, id)).run();
}
