import { createBrowserClient } from '@supabase/ssr';
import { resolveSupabaseConfig } from '@hockey-life/database/config';

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
  const { url, anonKey } = resolveSupabaseConfig();

  return createBrowserClient(url, anonKey);
}
