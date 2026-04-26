import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../db/schema';
import { user } from '../db/schema';
import { bootstrapAdminUser } from './bootstrap';
import { verifyPassword } from './password';

type DB = BetterSQLite3Database<typeof schema>;

function makeDb(): DB {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

describe('bootstrapAdminUser', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('creates an admin user with a hashed password', () => {
    const id = bootstrapAdminUser(db, 'secret', 'alice');
    expect(id).not.toBeNull();
    const [row] = db.select().from(user).all();
    expect(row.id).toBe(id);
    expect(row.username).toBe('alice');
    expect(row.passwordHash).not.toBe('secret');
    expect(verifyPassword('secret', row.passwordHash)).toBe(true);
  });

  it('defaults the username to "admin" when omitted', () => {
    bootstrapAdminUser(db, 'secret');
    const [row] = db.select().from(user).all();
    expect(row.username).toBe('admin');
  });

  it('lowercases the stored username', () => {
    bootstrapAdminUser(db, 'secret', 'AdminUser');
    const [row] = db.select().from(user).all();
    expect(row.username).toBe('adminuser');
  });

  it('returns null and skips creation when a user already exists', () => {
    bootstrapAdminUser(db, 'secret', 'first');
    const second = bootstrapAdminUser(db, 'other', 'second');
    expect(second).toBeNull();
    const rows = db.select().from(user).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].username).toBe('first');
  });
});
