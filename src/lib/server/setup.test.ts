import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './db/schema';
import { page } from './db/schema';
import { isSetupComplete } from './setup';

type DB = BetterSQLite3Database<typeof schema>;

function makeDb(): DB {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

describe('isSetupComplete', () => {
  let db: DB;
  beforeEach(() => {
    db = makeDb();
  });

  it('returns false on a fresh database', () => {
    expect(isSetupComplete(db)).toBe(false);
  });

  it('returns true once the home page exists', () => {
    db.insert(page).values({ slug: 'home', title: 'Home', content: '' }).run();
    expect(isSetupComplete(db)).toBe(true);
  });

  it('returns false when only non-home pages exist', () => {
    db.insert(page).values({ slug: 'about', title: 'About', content: '' }).run();
    expect(isSetupComplete(db)).toBe(false);
  });
});
