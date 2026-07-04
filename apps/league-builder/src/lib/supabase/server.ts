import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  resolveSupabaseAdminKey,
  resolveSupabaseConfig,
  resolveSupabaseUrl,
} from '@hockey-life/database/config';
import type { Database } from '@hockey-life/database/types';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = resolveSupabaseConfig();

  return createServerClient<Database>(
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
            // Server component - cookies will be set on next request
          }
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  const url = resolveSupabaseUrl();
  const adminKey = resolveSupabaseAdminKey();

  if (!url || !adminKey) {
    throw new Error('Missing Supabase admin configuration');
  }

  return createSupabaseClient<Database>(
    url,
    adminKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
