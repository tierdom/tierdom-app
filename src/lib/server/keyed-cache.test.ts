import { describe, expect, it } from 'vitest';
import { createKeyedCache } from './keyed-cache';

describe('createKeyedCache', () => {
  it('calls the loader once per key on repeated reads', async () => {
    expect.assertions(3);
    let calls = 0;
    const cache = createKeyedCache<string, number>(async () => ++calls);

    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('a')).toBe(1);
    expect(calls).toBe(1);
  });

  it('treats different keys independently', async () => {
    expect.assertions(3);
    let calls = 0;
    const cache = createKeyedCache<string, string>(async (k) => {
      calls++;
      return k.toUpperCase();
    });

    expect(await cache.get('a')).toBe('A');
    expect(await cache.get('b')).toBe('B');
    expect(calls).toBe(2);
  });

  it('invalidate forces a reload for the key', async () => {
    expect.assertions(3);
    let calls = 0;
    const cache = createKeyedCache<string, number>(async () => ++calls);

    expect(await cache.get('a')).toBe(1);
    cache.invalidate('a');
    expect(await cache.get('a')).toBe(2);
    expect(calls).toBe(2);
  });

  it('invalidate leaves other keys intact', async () => {
    expect.assertions(2);
    let calls = 0;
    const cache = createKeyedCache<string, number>(async () => ++calls);

    await cache.get('a');
    await cache.get('b');
    cache.invalidate('a');
    await cache.get('a');
    await cache.get('b');
    // 'a' reloaded once, 'b' still cached
    expect(calls).toBe(3);
    expect(await cache.get('b')).toBe(2);
  });

  it('clear forces a reload for every key', async () => {
    expect.assertions(1);
    let calls = 0;
    const cache = createKeyedCache<string, number>(async () => ++calls);

    await cache.get('a');
    await cache.get('b');
    cache.clear();
    await cache.get('a');
    await cache.get('b');
    expect(calls).toBe(4);
  });

  it('dedupes concurrent misses for the same key', async () => {
    expect.assertions(3);
    let calls = 0;
    let resolve!: (v: number) => void;
    const cache = createKeyedCache<string, number>(
      () =>
        new Promise<number>((r) => {
          calls++;
          resolve = r;
        }),
    );

    const p1 = cache.get('a');
    const p2 = cache.get('a');
    expect(calls).toBe(1);
    resolve(42);
    expect(await p1).toBe(42);
    expect(await p2).toBe(42);
  });

  it('evicts rejected loads so a later read retries', async () => {
    expect.assertions(3);
    let calls = 0;
    const cache = createKeyedCache<string, number>(async () => {
      calls++;
      if (calls === 1) throw new Error('boom');
      return 7;
    });

    await expect(cache.get('a')).rejects.toThrow('boom');
    expect(await cache.get('a')).toBe(7);
    expect(calls).toBe(2);
  });

  it('supports non-string keys', async () => {
    expect.assertions(2);
    const cache = createKeyedCache<number, number>(async (n) => n * 2);
    expect(await cache.get(21)).toBe(42);
    expect(await cache.get(21)).toBe(42);
  });
});
