'use server';

import { createClient } from '@/lib/supabase/server';

/** Sanitize input for use in PostgREST filter strings to prevent filter injection */
function sanitizeFilterInput(input: string): string {
  return input.replace(/[,.()"\\]/g, '');
}

// ============================================================================
// Types
// ============================================================================

export interface DiscoverableLeague {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  city: string | null;
  state: string | null;
  teams_count: number;
  has_open_registration: boolean;
  next_season_name: string | null;
  next_season_start: string | null;
  registration_fee_cents: number | null;
}

export interface DiscoverFilters {
  search?: string;
  city?: string;
  registrationOpen?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Public Discovery (no auth required)
// ============================================================================

export async function discoverLeagues(
  filters: DiscoverFilters = {}
): Promise<{ leagues: DiscoverableLeague[]; total: number }> {
  const supabase = await createClient();
  const { search, city, registrationOpen, limit = 20, offset = 0 } = filters;

  // Get leagues with team counts
  let query = supabase
    .from('leagues')
    .select(
      `
      id,
      name,
      slug,
      description,
      logo_url,
      banner_url,
      primary_color,
      city,
      state,
      teams (id)
    `,
      { count: 'exact' }
    )
    .eq('status', 'active')
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    const safeSearch = sanitizeFilterInput(search);
    query = query.or(`name.ilike.%${safeSearch}%,city.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
  }

  if (city) {
    const safeCity = sanitizeFilterInput(city);
    query = query.ilike('city', `%${safeCity}%`);
  }

  const { data: leagues, error, count } = await query;

  if (error || !leagues) {
    console.error('Discover leagues error:', error);
    return { leagues: [], total: 0 };
  }

  // Get season/registration info for each league
  const now = new Date().toISOString();
  const leagueIds = leagues.map((l) => l.id);

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, league_id, name, start_date, registration_opens_at, registration_closes_at, status')
    .in('league_id', leagueIds.length > 0 ? leagueIds : ['__none__'])
    .in('status', ['upcoming', 'active'])
    .order('start_date', { ascending: true });

  // Get registration fees for seasons with open registration
  const seasonIds = (seasons || []).map((s) => s.id);
  const { data: fees } = await supabase
    .from('season_fees')
    .select('season_id, amount_cents')
    .in('season_id', seasonIds.length > 0 ? seasonIds : ['__none__'])
    .eq('is_active', true);

  const feeBySeasonId = new Map(
    (fees || []).map((f) => [f.season_id, f.amount_cents])
  );

  // Build season info map
  const seasonByLeagueId = new Map<
    string,
    {
      name: string;
      start_date: string;
      hasOpenRegistration: boolean;
      fee_cents: number | null;
    }
  >();

  for (const season of seasons || []) {
    const hasOpen =
      season.registration_opens_at &&
      season.registration_closes_at &&
      now >= season.registration_opens_at &&
      now <= season.registration_closes_at;

    if (!seasonByLeagueId.has(season.league_id) || hasOpen) {
      seasonByLeagueId.set(season.league_id, {
        name: season.name,
        start_date: season.start_date,
        hasOpenRegistration: !!hasOpen,
        fee_cents: feeBySeasonId.get(season.id) ?? null,
      });
    }
  }

  // Build result
  let result: DiscoverableLeague[] = leagues.map((league) => {
    const seasonInfo = seasonByLeagueId.get(league.id);
    return {
      id: league.id,
      name: league.name,
      slug: league.slug,
      description: league.description,
      logo_url: league.logo_url,
      banner_url: league.banner_url,
      primary_color: league.primary_color,
      city: league.city,
      state: league.state,
      teams_count: Array.isArray(league.teams) ? league.teams.length : 0,
      has_open_registration: seasonInfo?.hasOpenRegistration ?? false,
      next_season_name: seasonInfo?.name ?? null,
      next_season_start: seasonInfo?.start_date ?? null,
      registration_fee_cents: seasonInfo?.fee_cents ?? null,
    };
  });

  // Client-side filter for registration status (can't do this in SQL easily)
  if (registrationOpen !== undefined) {
    result = result.filter((l) => l.has_open_registration === registrationOpen);
  }

  return {
    leagues: result,
    total: registrationOpen !== undefined ? result.length : (count || 0),
  };
}

export async function getDiscoverCities(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('leagues')
    .select('city')
    .eq('status', 'active')
    .not('city', 'is', null);

  if (!data) return [];

  const cities = [...new Set(data.map((l) => l.city).filter(Boolean))] as string[];
  return cities.sort();
}
