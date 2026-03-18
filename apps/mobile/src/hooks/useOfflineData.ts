import React from 'react';

import { getCachedData, setCachedData, type CacheCategory } from '../lib/offline/cache';

type UseOfflineDataResult<T> = {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Custom hook that wraps async data fetching with a cache-first strategy.
 * 1. Returns cached data immediately (if available)
 * 2. Fetches fresh data in the background
 * 3. Updates when fresh data arrives
 */
export function useOfflineData<T>(
  category: CacheCategory,
  cacheKey: string,
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): UseOfflineDataResult<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isStale, setIsStale] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAndCache = React.useCallback(async () => {
    try {
      setError(null);
      const freshData = await fetcher();
      setData(freshData);
      setIsStale(false);
      await setCachedData(category, cacheKey, freshData);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch data');
      // Keep showing cached data if available
    } finally {
      setIsLoading(false);
    }
  }, [category, cacheKey, fetcher]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      // Step 1: Load from cache first
      const cached = await getCachedData<T>(category, cacheKey);
      if (cached.data && !cancelled) {
        setData(cached.data);
        setIsStale(cached.isStale);
        setIsLoading(false);
      }

      // Step 2: Fetch fresh data (always, to keep cache warm)
      if (!cancelled) {
        await fetchAndCache();
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, cacheKey, ...deps]);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    await fetchAndCache();
  }, [fetchAndCache]);

  return { data, isLoading, isStale, error, refresh };
}
