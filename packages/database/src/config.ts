export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function resolveSupabaseConfig(
  env: Record<string, string | undefined> = process.env
): SupabaseConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return { url, anonKey };
}

