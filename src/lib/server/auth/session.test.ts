import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { session, user } from '../db/schema';
import { createSession, hashToken, invalidateSession, validateSession } from './session';

type DB = BetterSQLite3Database<typeof schema>;

const DAY = 24 * 60 * 60 * 1000;

function makeDb(): DB {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

function seedUser(db: DB, id = 'u1', username = 'admin'): void {
  db.insert(user).values({ id, username, passwordHash: 'x' }).run();
}

describe('hashToken', () => {
  it('returns the SHA-256 hex digest', () => {
    expect(hashToken('test')).toBe(
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    );
  });

  it('is deterministic', () => {
    expect(hashToken('hello')).toBe(hashToken('hello'));
  });

  it('produces different digests for different inputs', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

describe('createSession', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
    seedUser(db);
  });

  it('returns a 64-char hex token and a 30-day expiry', () => {
    const before = Date.now();
    const { token, expiresAt } = createSession(db, 'u1');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(expiresAt).toBeGreaterThanOrEqual(before + 30 * DAY - 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 30 * DAY + 1000);
  });

  it('persists the session keyed by hashed token, not the raw token', () => {
    const { token } = createSession(db, 'u1');
    const rows = db.select().from(session).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(hashToken(token));
    expect(rows[0]!.id).not.toBe(token);
    expect(rows[0]!.userId).toBe('u1');
  });
});

describe('validateSession', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
    seedUser(db);
  });

  it('returns null session and null user for an unknown token', () => {
    const result = validateSession(db, 'nope');
    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
  });

  it('returns the user and session for a valid token', () => {
    const { token } = createSession(db, 'u1');
    const result = validateSession(db, token);
    expect(result.user?.id).toBe('u1');
    expect(result.user?.username).toBe('admin');
    expect(result.session).not.toBeNull();
  });

  it('deletes the row and returns null when the session is expired', () => {
    const { token } = createSession(db, 'u1');
    db.update(session)
      .set({ expiresAt: Date.now() - 1000 })
      .where(eq(session.id, hashToken(token)))
      .run();

    const result = validateSession(db, token);
    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
    expect(db.select().from(session).all()).toHaveLength(0);
  });

  it('does NOT extend the expiry while more than half the duration remains', () => {
    const { token, expiresAt } = createSession(db, 'u1');
    const result = validateSession(db, token);
    expect(result.session?.expiresAt).toBe(expiresAt);
  });

  it('extends the expiry (sliding window) when less than half the duration remains', () => {
    const { token } = createSession(db, 'u1');
    // Push expiry to "10 days from now" — under the 15-day refresh threshold.
    const nearExpiry = Date.now() + 10 * DAY;
    db.update(session)
      .set({ expiresAt: nearExpiry })
      .where(eq(session.id, hashToken(token)))
      .run();

    const result = validateSession(db, token);
    expect(result.session?.expiresAt).toBeGreaterThan(nearExpiry);
    // Refreshed expiry should be ~30 days out again.
    expect(result.session?.expiresAt).toBeGreaterThanOrEqual(Date.now() + 29 * DAY);
  });
});

describe('invalidateSession', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
    seedUser(db);
  });

  it('removes the row matching the token hash', () => {
    const { token } = createSession(db, 'u1');
    expect(db.select().from(session).all()).toHaveLength(1);

    invalidateSession(db, token);
    expect(db.select().from(session).all()).toHaveLength(0);
  });

  it('is a no-op for an unknown token', () => {
    createSession(db, 'u1');
    invalidateSession(db, 'unknown');
    expect(db.select().from(session).all()).toHaveLength(1);
  });
});
