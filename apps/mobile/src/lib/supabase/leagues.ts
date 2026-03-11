import { supabase } from './client';

export type LeagueRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  short_name: string | null;
  city: string | null;
};

// Fetch leagues the current user is a member of
export async function getUserLeagues(): Promise<LeagueRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log('[getUserLeagues] No user — skipping fetch');
    return [];
  }

  console.log('[getUserLeagues] Fetching leagues for user:', user.id);

  const { data, error } = await supabase
    .from('league_memberships')
    .select('league:leagues(id, name, slug, logo_url, primary_color, secondary_color, short_name, city)')
    .eq('user_id', user.id);

  console.log('[getUserLeagues] raw data:', JSON.stringify(data));
  console.log('[getUserLeagues] error:', error);

  if (error || !data) return [];
  return data.map((m: any) => m.league).filter(Boolean);
}

// Fetch all public leagues (for discovery)
export async function getPublicLeagues(): Promise<LeagueRow[]> {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, slug, logo_url, primary_color, secondary_color, short_name, city')
    .eq('is_public', true)
    .limit(20);
  return error ? [] : (data ?? []);
}
