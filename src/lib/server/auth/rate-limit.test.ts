import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { createRateLimiter as CreateRateLimiter } from './rate-limit';

// Install fake timers before the module is imported so the module-level
// setInterval (from the default limiter) uses a fake timer.
let createRateLimiter: typeof CreateRateLimiter;

beforeAll(async () => {
  vi.useFakeTimers();
  const mod = await import('./rate-limit');
  createRateLimiter = mod.createRateLimiter;
});

afterAll(() => {
  vi.useRealTimers();
});

describe('createRateLimiter', () => {
  it('is not limited with no recorded attempts', () => {
    expect.assertions(1);
    const limiter = createRateLimiter();
    expect(limiter.isRateLimited('1.2.3.4')).toBe(false);
  });

  it('limits after maxAttempts failures', () => {
    expect.assertions(1);
    const limiter = createRateLimiter({ maxAttempts: 3 });
    limiter.recordFailedAttempt('1.2.3.4');
    limiter.recordFailedAttempt('1.2.3.4');
    limiter.recordFailedAttempt('1.2.3.4');
    expect(limiter.isRateLimited('1.2.3.4')).toBe(true);
  });

  it('does not limit before maxAttempts is reached', () => {
    expect.assertions(2);
    const limiter = createRateLimiter({ maxAttempts: 3 });
    limiter.recordFailedAttempt('1.2.3.4');
    limiter.recordFailedAttempt('1.2.3.4');
    expect(limiter.isRateLimited('1.2.3.4')).toBe(false);
    // One more tips it over the edge
    limiter.recordFailedAttempt('1.2.3.4');
    expect(limiter.isRateLimited('1.2.3.4')).toBe(true);
  });

  it('resets after clearAttempts', () => {
    expect.assertions(2);
    const limiter = createRateLimiter({ maxAttempts: 2 });
    limiter.recordFailedAttempt('1.2.3.4');
    limiter.recordFailedAttempt('1.2.3.4');
    expect(limiter.isRateLimited('1.2.3.4')).toBe(true);
    limiter.clearAttempts('1.2.3.4');
    expect(limiter.isRateLimited('1.2.3.4')).toBe(false);
  });

  it('resets after the time window expires', () => {
    expect.assertions(2);
    const limiter = createRateLimiter({ maxAttempts: 2, windowMs: 5000 });
    limiter.recordFailedAttempt('1.2.3.4');
    limiter.recordFailedAttempt('1.2.3.4');
    expect(limiter.isRateLimited('1.2.3.4')).toBe(true);
    vi.advanceTimersByTime(5001);
    expect(limiter.isRateLimited('1.2.3.4')).toBe(false);
  });

  it('restarts the counter after window expiry', () => {
    expect.assertions(1);
    const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 5000 });
    limiter.recordFailedAttempt('1.2.3.4');
    limiter.recordFailedAttempt('1.2.3.4');
    vi.advanceTimersByTime(5001);
    // Window expired — this starts a fresh window
    limiter.recordFailedAttempt('1.2.3.4');
    expect(limiter.isRateLimited('1.2.3.4')).toBe(false);
  });

  it('tracks IPs independently', () => {
    expect.assertions(2);
    const limiter = createRateLimiter({ maxAttempts: 1 });
    limiter.recordFailedAttempt('1.1.1.1');
    expect(limiter.isRateLimited('1.1.1.1')).toBe(true);
    expect(limiter.isRateLimited('2.2.2.2')).toBe(false);
  });

  it('cleanup timer purges stale entries', () => {
    expect.assertions(2);
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 1000 });
    limiter.recordFailedAttempt('1.2.3.4');
    expect(limiter.isRateLimited('1.2.3.4')).toBe(true);
    // Advance past window + trigger the cleanup interval
    vi.advanceTimersByTime(1001);
    expect(limiter.isRateLimited('1.2.3.4')).toBe(false);
  });
});
