import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword / verifyPassword', () => {
  it('verifies a correct password', () => {
    expect.assertions(1);
    const hash = hashPassword('test-password');
    expect(verifyPassword('test-password', hash)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    expect.assertions(1);
    const hash = hashPassword('test-password');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces salt$hash hex format', () => {
    expect.assertions(1);
    const hash = hashPassword('test');
    // 16-byte salt = 32 hex chars, 64-byte key = 128 hex chars
    expect(hash).toMatch(/^[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it('produces different hashes for the same password (random salt)', () => {
    expect.assertions(1);
    const a = hashPassword('same');
    const b = hashPassword('same');
    expect(a).not.toBe(b);
  });

  it('throws on malformed stored hash', () => {
    expect.assertions(2);
    expect(() => verifyPassword('pass', 'not-a-hash')).toThrow();
    expect(() => verifyPassword('pass', '')).toThrow();
  });
});
