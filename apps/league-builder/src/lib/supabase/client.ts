import { createBrowserClient } from '@supabase/ssr';
import { resolveSupabaseConfig } from '@hockey-life/database/config';
import type { Database } from '@hockey-life/database/types';

export function createClient() {
  const { url, anonKey } = resolveSupabaseConfig();

  return createBrowserClient<Database>(url, anonKey);
}
