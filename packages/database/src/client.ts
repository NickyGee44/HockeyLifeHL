import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { resolveSupabaseConfig } from './config';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseConfig();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export { createClient };
export type { Database };
