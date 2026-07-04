import { createBrowserClient } from '@supabase/ssr';
import { resolveSupabaseConfig } from '@hockey-life/database/config';

export function createClient() {
  const { url, anonKey } = resolveSupabaseConfig();

  return createBrowserClient(url, anonKey);
}
