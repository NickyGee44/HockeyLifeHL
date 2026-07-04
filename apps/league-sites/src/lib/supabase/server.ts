import { createServerClient } from '@supabase/ssr';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  normalizeSupabaseEnvValue,
  resolveSupabaseAdminKey,
  resolveSupabaseConfig,
  resolveSupabasePublishableKey,
  resolveSupabaseUrl,
} from '@hockey-life/database/config';

/**
 * Next.js-safe fetch that always bypasses the data cache.
 * @supabase/ssr's createServerClient ignores the `global.fetch` option
 * for PostgREST calls in Next.js 16, so we use @supabase/supabase-js
 * directly with a custom fetch for public data reads.
 */
const noStoreFetch: typeof globalThis.fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

function createEmptyQueryBuilder(single = false): any {
  const listResult = Promise.resolve({ data: [], error: null, count: 0 });
  const singleResult = Promise.resolve({ data: null, error: null, count: 0 });

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          const promise = single ? singleResult : listResult;
          return promise.then.bind(promise);
        }

        if (prop === 'catch') {
          const promise = single ? singleResult : listResult;
          return promise.catch.bind(promise);
        }

        if (prop === 'finally') {
          const promise = single ? singleResult : listResult;
          return promise.finally.bind(promise);
        }

        if (prop === 'single' || prop === 'maybeSingle') {
          return () => singleResult;
        }

        return () => createEmptyQueryBuilder(single);
      },
    }
  );
}

function createEmptyServiceClient() {
  return {
    from() {
      return createEmptyQueryBuilder(false);
    },
    rpc() {
      return Promise.resolve({ data: null, error: null });
    },
  } as ReturnType<typeof createServerClient>;
}

/**
 * Create a Supabase client for server-side usage in Platform 2 (League Sites)
 *
 * Uses @supabase/supabase-js with a custom fetch that forces
 * `cache: 'no-store'` so Next.js never caches PostgREST responses.
 *
 * RLS policies ensure only published/public data is accessible.
 */
export async function createClient() {
  const { url, anonKey } = resolveSupabaseConfig();

  return createBrowserClient(
    url,
    anonKey,
    {
      global: { fetch: noStoreFetch },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

/**
 * Create a Supabase SSR client that reads auth cookies.
 * Use this only for routes requiring authentication (player profile, captain, etc.)
 */
export async function createAuthClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = resolveSupabaseConfig();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This is fine for public pages where we don't need to set cookies.
          }
        },
      },
    },
  );
}

/**
 * Create a Supabase service role client for server-side admin operations
 *
 * SECURITY: Only use for operations that need to bypass RLS
 * - Fetching all leagues for generateStaticParams
 * - Admin operations (if any)
 *
 * WARNING: This client bypasses RLS - use with caution
 */
export function createServiceRoleClient() {
  const adminKey = resolveSupabaseAdminKey();
  const supabaseUrl = resolveSupabaseUrl();
  const anonKey = normalizeSupabaseEnvValue(resolveSupabasePublishableKey());

  if (!adminKey || !supabaseUrl) {
    if (supabaseUrl && anonKey) {
      return createBrowserClient(supabaseUrl, anonKey, {
        global: { fetch: noStoreFetch },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }) as ReturnType<typeof createServerClient>;
    }

    return createEmptyServiceClient();
  }

  return createServerClient(
    supabaseUrl,
    adminKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Service role doesn't need cookies
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
