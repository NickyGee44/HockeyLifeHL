import { resolveSupabaseConfig } from '../config';

describe('@hockey-life/database config', () => {
  it('returns URL + anon key when env vars are provided', () => {
    const config = resolveSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });

    expect(config).toEqual({
      url: 'https://test.supabase.co',
      anonKey: 'anon-key',
    });
  });

  it('throws when required env vars are missing', () => {
    expect(() => resolveSupabaseConfig({})).toThrow(
      'Missing Supabase environment variables'
    );
  });
});

