import { createClient, createServiceRoleClient } from './supabase/server';
import type {
  League,
  LeagueTheme,
  Season,
  Division,
  Team,
  TeamStanding,
  Game,
  Player,
  PlayerStats,
  LeagueStats,
  UpcomingGame,
  RecentGame,
} from './types';

// Default brand colors from BRAND-KIT.md
const DEFAULT_PRIMARY = '#D4AF37';
const DEFAULT_SECONDARY = '#1a1a1a';
const DEFAULT_ACCENT = '#D4AF37';

/**
 * Fetch league by slug for public display
 */
export async function getLeagueBySlug(slug: string): Promise<League | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data as League;
}

/**
 * Get league theme (colors, logo, banner)
 */
export function getLeagueTheme(league: League): LeagueTheme {
  return {
    primaryColor: league.primary_color || DEFAULT_PRIMARY,
    secondaryColor: league.secondary_color || DEFAULT_SECONDARY,
    accentColor: league.accent_color || league.primary_color || DEFAULT_ACCENT,
    logoUrl: league.logo_url,
    bannerUrl: league.banner_url,
  };
}

/**
 * Fetch current season for a league
 */
export async function getCurrentSeason(leagueId: string): Promise<Season | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Season;
}

/**
 * Fetch all divisions for a season
 */
export async function getDivisions(seasonId: string): Promise<Division[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('season_id', seasonId)
    .order('sort_order', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Division[];
}

/**
 * Fetch all teams for a league
 */
export async function getTeams(leagueId: string): Promise<Team[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      division:divisions(*)
    `)
    .eq('league_id', leagueId)
    .order('name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Team[];
}

/**
 * Fetch team by slug
 */
export async function getTeamBySlug(
  leagueId: string,
  teamSlug: string
): Promise<Team | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      division:divisions(*)
    `)
    .eq('league_id', leagueId)
    .eq('slug', teamSlug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Team;
}

/**
 * Fetch team roster
 */
export async function getTeamRoster(teamId: string): Promise<Player[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('team_rosters')
    .select(`
      *,
      profile:profiles(first_name, last_name, avatar_url)
    `)
    .eq('team_id', teamId)
    .order('jersey_number', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Player[];
}

/**
 * Fetch standings for a league/season
 * Uses RPC function for calculated standings or builds from games
 */
export async function getStandings(
  leagueId: string,
  seasonId?: string
): Promise<TeamStanding[]> {
  const supabase = await createClient();

  // Try to use standings RPC if available
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_league_standings',
    {
      p_league_id: leagueId,
      p_season_id: seasonId || null,
    }
  );

  if (!rpcError && rpcData) {
    return rpcData as TeamStanding[];
  }

  // Fallback: Build standings from teams (basic version)
  const { data: teams, error } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      logo,
      division_id,
      divisions(id, name)
    `)
    .eq('league_id', leagueId);

  if (error || !teams) {
    return [];
  }

  // Return basic team list as standings (no game data)
  return teams.map((team) => {
    // Handle the divisions relation which can be array or object
    const division = Array.isArray(team.divisions)
      ? team.divisions[0]
      : team.divisions;
    return {
      team_id: team.id,
      team_name: team.name,
      team_logo: team.logo,
      division_id: division?.id || team.division_id || null,
      division_name: division?.name || null,
      games_played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      overtime_losses: 0,
      points: 0,
      goals_for: 0,
      goals_against: 0,
      goal_differential: 0,
      streak: null,
      last_10: null,
    };
  }) as TeamStanding[];
}

/**
 * Fetch upcoming games for a league
 */
export async function getUpcomingGames(
  leagueId: string,
  limit = 10
): Promise<UpcomingGame[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo, colors),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo, colors)
    `)
    .eq('league_id', leagueId)
    .in('status', ['scheduled', 'in_progress'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as UpcomingGame[];
}

/**
 * Fetch recent games (completed)
 */
export async function getRecentGames(
  leagueId: string,
  limit = 10
): Promise<RecentGame[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo, colors),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo, colors)
    `)
    .eq('league_id', leagueId)
    .eq('status', 'final')
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as RecentGame[];
}

/**
 * Fetch all games for schedule page
 */
export async function getSchedule(
  leagueId: string,
  seasonId?: string
): Promise<Game[]> {
  const supabase = await createClient();

  let query = supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo, colors),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo, colors)
    `)
    .eq('league_id', leagueId)
    .order('scheduled_at', { ascending: true });

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data as Game[];
}

/**
 * Fetch stats leaders
 */
export async function getStatsLeaders(
  leagueId: string,
  statType: 'points' | 'goals' | 'assists' | 'saves' = 'points',
  limit = 10
): Promise<PlayerStats[]> {
  const supabase = await createClient();

  // Try to use stats RPC if available
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_stats_leaders',
    {
      p_league_id: leagueId,
      p_stat_type: statType,
      p_limit: limit,
    }
  );

  if (!rpcError && rpcData) {
    return rpcData as PlayerStats[];
  }

  // Fallback: Return empty (stats not implemented yet)
  return [];
}

/**
 * Fetch league stats summary
 */
export async function getLeagueStats(leagueId: string): Promise<LeagueStats> {
  const supabase = await createClient();

  // Count teams
  const { count: teamCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId);

  // Count players via team rosters
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId);

  let playerCount = 0;
  if (teams && teams.length > 0) {
    const teamIds = teams.map((t) => t.id);
    const { count } = await supabase
      .from('team_rosters')
      .select('*', { count: 'exact', head: true })
      .in('team_id', teamIds);
    playerCount = count || 0;
  }

  // Count games
  const { count: totalGames } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId);

  const { count: gamesPlayed } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .eq('status', 'final');

  const { count: upcomingGames } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .in('status', ['scheduled', 'in_progress']);

  return {
    totalTeams: teamCount || 0,
    totalPlayers: playerCount,
    totalGames: totalGames || 0,
    gamesPlayed: gamesPlayed || 0,
    upcomingGames: upcomingGames || 0,
  };
}

/**
 * Fetch all active league slugs for static generation
 * Used by generateStaticParams
 */
export async function getAllLeagueSlugs(): Promise<string[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('leagues')
    .select('slug')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100); // Top 100 leagues for static generation

  if (error || !data) {
    return [];
  }

  return data.map((league: { slug: string }) => league.slug);
}

/**
 * Fetch all team slugs for a league (for static generation)
 * Uses service role client to avoid cookies() call during build
 */
export function getTeamSlugs(leagueId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();

  return supabase
    .from('teams')
    .select('slug')
    .eq('league_id', leagueId)
    .then(({ data, error }: { data: { slug: string }[] | null; error: any }) => {
      if (error || !data) {
        return [];
      }
      return data.map((team) => team.slug);
    });
}
