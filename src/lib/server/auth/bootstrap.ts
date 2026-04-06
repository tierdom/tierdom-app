import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { hashPassword } from './password';
import { count } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export function bootstrapAdminUser(password: string, username?: string): void {
	username = username || 'admin';
	const [result] = db.select({ count: count() }).from(user).all();
	if (result.count > 0) return;

	db.insert(user)
		.values({
			id: randomUUID(),
			username: username.toLowerCase(),
			passwordHash: hashPassword(password)
		})
		.run();

	console.log(`Created initial admin user "${username}"`);
}
