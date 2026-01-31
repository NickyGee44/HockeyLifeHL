import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for server-side usage in Platform 2 (League Sites)
 *
 * This client is used for:
 * - Server Components fetching league data
 * - API routes serving public data
 * - Static generation (generateStaticParams)
 *
 * RLS policies ensure only published/public data is accessible
 * No authentication cookies are used for public league sites
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    }
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    // Return a mock client for build time when env vars aren't available
    // This is safe because generateStaticParams will return empty array
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    } as any;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
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
