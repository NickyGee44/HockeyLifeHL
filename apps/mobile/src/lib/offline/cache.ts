import * as SecureStore from 'expo-secure-store';

// TTLs in milliseconds
const TTL = {
  schedule: 5 * 60 * 1000,       // 5 minutes
  roster: 60 * 60 * 1000,        // 1 hour
  profile: 24 * 60 * 60 * 1000,  // 24 hours
  stats: 15 * 60 * 1000,         // 15 minutes
  leagues: 30 * 60 * 1000,       // 30 minutes
} as const;

export type CacheCategory = keyof typeof TTL;

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  category: CacheCategory;
};

function getCacheKey(category: CacheCategory, key: string): string {
  return `blh_cache_${category}_${key}`;
}

export async function getCachedData<T>(
  category: CacheCategory,
  key: string,
): Promise<{ data: T | null; isStale: boolean }> {
  try {
    const cacheKey = getCacheKey(category, key);
    const raw = await SecureStore.getItemAsync(cacheKey);
    if (!raw) return { data: null, isStale: true };

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    const isStale = age > TTL[category];

    return { data: entry.data, isStale };
  } catch {
    return { data: null, isStale: true };
  }
}

export async function setCachedData<T>(
  category: CacheCategory,
  key: string,
  data: T,
): Promise<void> {
  try {
    const cacheKey = getCacheKey(category, key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      category,
    };
    const serialized = JSON.stringify(entry);
    // SecureStore has a 2048 byte limit per key, so for large data
    // we truncate gracefully - only cache what fits
    if (serialized.length > 1800) {
      // Skip caching items that are too large for SecureStore
      // A proper implementation would use FileSystem, but SecureStore
      // works for smaller cached items like profile, single roster, etc.
      return;
    }
    await SecureStore.setItemAsync(cacheKey, serialized);
  } catch {
    // Silently fail - cache is best-effort
  }
}

export async function clearCache(category?: CacheCategory): Promise<void> {
  // SecureStore doesn't support listing keys, so we can't clear by category
  // This is a no-op for now - items will expire via TTL
}

export function isCacheStale(timestamp: number, category: CacheCategory): boolean {
  return Date.now() - timestamp > TTL[category];
}
