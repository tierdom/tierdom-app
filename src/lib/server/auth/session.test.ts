import { describe, expect, it, vi } from 'vitest';

// Stub the DB import so module evaluation doesn't try to open SQLite
vi.mock('$lib/server/db', () => ({ db: {} }));
vi.mock('$lib/server/db/schema', () => ({ session: {}, user: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

import { hashToken } from './session';

describe('hashToken', () => {
  it('returns the SHA-256 hex digest', () => {
    expect.assertions(1);
    // Known SHA-256 of "test"
    expect(hashToken('test')).toBe(
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    );
  });

  it('is deterministic', () => {
    expect.assertions(1);
    expect(hashToken('hello')).toBe(hashToken('hello'));
  });
});
