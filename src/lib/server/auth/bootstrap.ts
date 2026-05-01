import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { count } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { user } from '$lib/server/db/schema';
import type * as schema from '$lib/server/db/schema';
import { hashPassword } from './password';

type DB = BetterSQLite3Database<typeof schema>;

export function bootstrapAdminUser(db: DB, password: string, username?: string): string | null {
  username = username || 'admin';
  const [result] = db.select({ count: count() }).from(user).all();
  /* v8 ignore start */
  if (!result) throw new Error('count query unexpectedly returned no row');
  /* v8 ignore stop */
  if (result.count > 0) return null;

  const id = randomUUID();
  db.insert(user)
    .values({
      id,
      username: username.toLowerCase(),
      passwordHash: hashPassword(password),
    })
    .run();

  console.log(`Created initial admin user "${username}"`);
  return id;
}
