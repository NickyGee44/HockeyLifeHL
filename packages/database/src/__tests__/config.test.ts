import {
  normalizeSupabaseEnvValue,
  resolveSupabaseAdminKey,
  resolveSupabaseConfig,
  resolveSupabasePublishableKey,
} from '../config';

describe('@hockey-life/database config', () => {
  it('returns URL + publishable key when env vars are provided', () => {
    const config = resolveSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    });

    expect(config).toEqual({
      url: 'https://test.supabase.co',
      anonKey: 'publishable-key',
    });
  });

  it('falls back to legacy anon key when publishable key is missing', () => {
    expect(
      resolveSupabasePublishableKey({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon-key',
      })
    ).toBe('legacy-anon-key');
  });

  it('prefers secret key over legacy service role key', () => {
    expect(
      resolveSupabaseAdminKey({
        SUPABASE_SECRET_KEY: 'secret-key',
        SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role',
      })
    ).toBe('secret-key');
  });

  it('normalizes weird quoted env values from env pulls', () => {
    expect(normalizeSupabaseEnvValue('""sb_secret_test"\\n"')).toBe('sb_secret_test');
  });

  it('throws when required env vars are missing', () => {
    expect(() => resolveSupabaseConfig({})).toThrow(
      'Missing Supabase environment variables'
    );
  });
});

