
/**
 * Simple in-memory TTL cache for stable data.
 * Prevents redundant Supabase reads for transporters, branches, settings.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data as T;
  },

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  },

  invalidate(key: string): void {
    store.delete(key);
  },

  /** Invalidate all keys that start with a given prefix */
  invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  },

  clear(): void {
    store.clear();
  },
};

// Cache key constants
export const CACHE_KEYS = {
  TRANSPORTERS: 'transporters_all',
  BRANCHES: 'branches_all',
  SETTINGS: 'settings',
} as const;

// Default TTLs
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,   // 5 minutes – transporters, branches
  LONG: 10 * 60 * 1000,   // 10 minutes – settings
} as const;
