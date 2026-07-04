export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function normalizeSupabaseEnvValue(value?: string): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  const withoutEscapedNewlines = trimmed.replace(/\\n/g, '');
  const withoutWrappingQuotes = withoutEscapedNewlines.replace(/^"+|"+$/g, '');
  const normalized = withoutWrappingQuotes.trim();

  return normalized.length > 0 ? normalized : undefined;
}

export function resolveSupabaseUrl(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  return normalizeSupabaseEnvValue(env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL);
}

export function resolveSupabasePublishableKey(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  return normalizeSupabaseEnvValue(
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      env.SUPABASE_PUBLISHABLE_KEY ??
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      env.SUPABASE_ANON_KEY,
  );
}

export function resolveSupabaseAdminKey(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  return normalizeSupabaseEnvValue(
    env.SUPABASE_SECRET_KEY ??
      env.SUPABASE_SERVICE_ROLE_KEY ??
      env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function resolveSupabaseConfig(
  env: Record<string, string | undefined> = process.env
): SupabaseConfig {
  const url = resolveSupabaseUrl(env);
  const anonKey = resolveSupabasePublishableKey(env);

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return { url, anonKey };
}

