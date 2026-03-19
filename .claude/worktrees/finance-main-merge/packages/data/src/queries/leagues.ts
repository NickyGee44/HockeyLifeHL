import type { SupabaseClientArg, League, LeagueTheme, Season, Division, LeagueStats, ThemePreset } from '../types';

const DEFAULT_PRIMARY = '#D4AF37';
const DEFAULT_SECONDARY = '#1a1a1a';
const DEFAULT_ACCENT = '#D4AF37';
const DEFAULT_FONT_FAMILY = '"Rajdhani", "Sora", "Inter", system-ui, -apple-system, sans-serif';

function getThemePreset(league: League): ThemePreset {
  const preset = (league.settings?.website as { themePreset?: string } | undefined)?.themePreset;
  if (preset === 'light' || preset === 'custom') return preset;
  return 'dark';
}

export async function getLeagueBySlug(supabase: SupabaseClientArg, slug: string): Promise<League | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;
  return data as League;
}

export async function getLeagueById(supabase: SupabaseClientArg, leagueId: string): Promise<League | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (error || !data) return null;
  return data as League;
}

export function getLeagueTheme(league: League): LeagueTheme {
  const templateVariant = getThemePreset(league);
  return {
    primaryColor: league.primary_color || DEFAULT_PRIMARY,
    secondaryColor: league.secondary_color || DEFAULT_SECONDARY,
    accentColor: league.accent_color || league.primary_color || DEFAULT_ACCENT,
    logoUrl: league.logo_url,
    bannerUrl: league.banner_url,
    fontFamily: league.settings?.website?.themePreset === 'light'
      ? '"Sora", "Inter", system-ui, -apple-system, sans-serif'
      : league.font_family || DEFAULT_FONT_FAMILY,
    templateVariant,
  };
}

export async function getCurrentSeason(supabase: SupabaseClientArg, leagueId: string): Promise<Season | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as Season;
}

export async function getSeasons(supabase: SupabaseClientArg, leagueId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  if (error || !data) return [];
  return data as Season[];
}

export async function getDivisions(supabase: SupabaseClientArg, leagueId: string): Promise<Division[]> {
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('league_id', leagueId)
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data as Division[];
}

export async function getLeagueStats(supabase: SupabaseClientArg, leagueId: string): Promise<LeagueStats> {
  const [teamsResult, playersResult, gamesResult] = await Promise.all([
    supabase.from('teams').select('id', { count: 'exact', head: true }).eq('league_id', leagueId),
    supabase.from('team_rosters').select('id', { count: 'exact', head: true }).eq('league_id', leagueId),
    supabase.from('games').select('id, status', { count: 'exact' }).eq('league_id', leagueId),
  ]);

  const totalGames = gamesResult.count ?? 0;
  const gameRows = (gamesResult.data ?? []) as Array<{ status: string | null }>;
  const gamesPlayed = gameRows.filter(
    (g) => g.status === 'completed' || g.status === 'pending_verification',
  ).length;

  return {
    totalTeams: teamsResult.count ?? 0,
    totalPlayers: playersResult.count ?? 0,
    totalGames,
    gamesPlayed,
    upcomingGames: totalGames - gamesPlayed,
  };
}

/**
 * Get all leagues a player belongs to (via team_rosters → teams)
 */
export async function getPlayerLeagues(supabase: SupabaseClientArg, userId: string): Promise<League[]> {
  // Get team IDs the player is on
  const { data: rosters } = await supabase
    .from('team_rosters')
    .select('team_id')
    .eq('player_id', userId);

  if (!rosters || rosters.length === 0) return [];

  const rosterRows = rosters as Array<{ team_id: string | null }>;
  const teamIds = [...new Set(rosterRows.map((r) => r.team_id).filter((id): id is string => !!id))];

  // Get league IDs from those teams
  const { data: teams } = await supabase
    .from('teams')
    .select('league_id')
    .in('id', teamIds);

  if (!teams || teams.length === 0) return [];

  const teamRows = (teams ?? []) as Array<{ league_id: string | null }>;
  const leagueIds = [...new Set(teamRows.map((t) => t.league_id).filter((id): id is string => !!id))];
  if (leagueIds.length === 0) return [];

  // Get the leagues
  const { data: leagues } = await supabase
    .from('leagues')
    .select('*')
    .in('id', leagueIds)
    .eq('status', 'active')
    .order('name');

  return (leagues || []) as League[];
}
