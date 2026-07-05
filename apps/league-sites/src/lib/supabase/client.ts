import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for client-side usage in Platform 2 (League Sites)
 *
 * This client is used for:
 * - Public read-only access to league data
 * - Real-time subscriptions for live game updates
 * - No authentication required (public pages)
 *
 * RLS policies ensure only published/public data is accessible
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
