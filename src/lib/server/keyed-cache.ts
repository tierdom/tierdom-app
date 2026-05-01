/**
 * Generic lazy keyed async cache.
 *
 * - `get(key)` returns the loader result for a key, calling the loader
 *   at most once per key per process. Concurrent misses for the same
 *   key dedupe onto the same in-flight promise.
 * - `invalidate(key)` forgets one entry so the next `get` re-runs the
 *   loader.
 * - `clear()` forgets every entry.
 *
 * Rejected loads are evicted so a later caller retries instead of
 * being served a cached error forever.
 */
export type KeyedCache<K, V> = {
  get(key: K): Promise<V>;
  invalidate(key: K): void;
  clear(): void;
};

export function createKeyedCache<K, V>(loader: (key: K) => Promise<V>): KeyedCache<K, V> {
  const map = new Map<K, Promise<V>>();

  return {
    get(key) {
      const existing = map.get(key);
      if (existing) return existing;

      const promise = loader(key).catch((err) => {
        // Only evict if this promise is still the one stored — guards
        // against a later write replacing it mid-flight.
        if (map.get(key) === promise) map.delete(key);
        throw err;
      });
      map.set(key, promise);
      return promise;
    },

    invalidate(key) {
      map.delete(key);
    },

    clear() {
      map.clear();
    },
  };
}
