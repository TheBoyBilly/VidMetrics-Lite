type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheRecord<unknown>>();

export function getCache<T>(key: string): T | null {
  const record = cache.get(key);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    cache.delete(key);
    return null;
  }
  return record.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheKey(parts: Array<string | number>) {
  return parts.join(":");
}
