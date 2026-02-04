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
  TickerGame,
  ScheduleGame,
  GamePreview,
  SeasonSeriesGame,
  TeamSeasonStats,
  PlayerStat,
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
 * Fetch all seasons for a league
 */
export async function getSeasons(leagueId: string): Promise<Season[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as Season[];
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
 * Fetch games for score ticker (mix of recent and upcoming)
 */
export async function getTickerGames(
  leagueId: string,
  limit = 10
): Promise<TickerGame[]> {
  const supabase = await createClient();

  // Get completed games and upcoming games
  const { data, error } = await supabase
    .from('games')
    .select(`
      id,
      scheduled_at,
      venue,
      home_score,
      away_score,
      status,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo, colors, division_id, divisions(name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo, colors, division_id, divisions(name))
    `)
    .eq('league_id', leagueId)
    .in('status', ['final', 'in_progress', 'scheduled'])
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  // Transform Supabase array results to single objects
  return data.map((game) => {
    const homeTeam = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
    const awayTeam = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team;

    return {
      ...game,
      home_team: homeTeam
        ? {
            ...homeTeam,
            divisions: Array.isArray(homeTeam.divisions)
              ? homeTeam.divisions[0] ?? null
              : homeTeam.divisions,
          }
        : null,
      away_team: awayTeam
        ? {
            ...awayTeam,
            divisions: Array.isArray(awayTeam.divisions)
              ? awayTeam.divisions[0] ?? null
              : awayTeam.divisions,
          }
        : null,
    };
  }) as TickerGame[];
}

/**
 * Fetch games for a specific week with optional filters
 */
export async function getWeekGames(
  leagueId: string,
  weekStart: Date,
  filters?: {
    day?: string;
    seasonId?: string;
    divisionId?: string;
    type?: string;
  }
): Promise<ScheduleGame[]> {
  const supabase = await createClient();

  // Calculate week end (7 days from start)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let query = supabase
    .from('games')
    .select(`
      id,
      league_id,
      season_id,
      scheduled_at,
      venue,
      home_score,
      away_score,
      status,
      game_type,
      division_id,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo, colors),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo, colors),
      division:divisions(id, name)
    `)
    .eq('league_id', leagueId)
    .gte('scheduled_at', weekStart.toISOString())
    .lt('scheduled_at', weekEnd.toISOString())
    .order('scheduled_at', { ascending: true });

  // Apply optional filters
  if (filters?.day) {
    const dayStart = new Date(filters.day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(filters.day);
    dayEnd.setHours(23, 59, 59, 999);
    query = query.gte('scheduled_at', dayStart.toISOString()).lte('scheduled_at', dayEnd.toISOString());
  }

  if (filters?.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }

  if (filters?.divisionId) {
    query = query.eq('division_id', filters.divisionId);
  }

  if (filters?.type) {
    query = query.eq('game_type', filters.type);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  // Transform Supabase array results to single objects
  return data.map((game) => ({
    ...game,
    home_team: Array.isArray(game.home_team) ? game.home_team[0] ?? null : game.home_team,
    away_team: Array.isArray(game.away_team) ? game.away_team[0] ?? null : game.away_team,
    division: Array.isArray(game.division) ? game.division[0] ?? null : game.division,
  })) as ScheduleGame[];
}

/**
 * Get game counts per day for a week (for the week picker badges)
 */
export async function getWeekGameCounts(
  leagueId: string,
  weekStart: Date
): Promise<Record<string, number>> {
  const supabase = await createClient();

  // Calculate week end (7 days from start)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data, error } = await supabase
    .from('games')
    .select('scheduled_at')
    .eq('league_id', leagueId)
    .gte('scheduled_at', weekStart.toISOString())
    .lt('scheduled_at', weekEnd.toISOString());

  if (error || !data) {
    return {};
  }

  // Count games per day
  const counts: Record<string, number> = {};
  data.forEach((game: { scheduled_at: string }) => {
    const dateStr = game.scheduled_at.split('T')[0];
    counts[dateStr] = (counts[dateStr] || 0) + 1;
  });

  return counts;
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
    .then(({ data, error }: { data: { slug: string }[] | null; error: unknown }) => {
      if (error || !data) {
        return [];
      }
      return data.map((team) => team.slug);
    });
}

/**
 * Fetch game details for preview page
 */
export async function getGamePreview(gameId: string): Promise<GamePreview | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(
        id, name, slug, logo, colors,
        division:divisions(id, name)
      ),
      away_team:teams!games_away_team_id_fkey(
        id, name, slug, logo, colors,
        division:divisions(id, name)
      )
    `)
    .eq('id', gameId)
    .single();

  if (error || !data) return null;
  return data as GamePreview;
}

/**
 * Fetch season series between two teams
 */
export async function getSeasonSeries(
  teamAId: string,
  teamBId: string,
  seasonId: string
): Promise<SeasonSeriesGame[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      id,
      scheduled_at,
      home_score,
      away_score,
      status,
      home_team_id,
      away_team_id
    `)
    .eq('season_id', seasonId)
    .eq('status', 'final')
    .or(`and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`)
    .order('scheduled_at', { ascending: false });

  if (error || !data) return [];
  return data as SeasonSeriesGame[];
}

/**
 * Fetch team season stats
 */
export async function getTeamSeasonStats(
  teamId: string,
  seasonId: string
): Promise<TeamSeasonStats | null> {
  const supabase = await createClient();

  // Try RPC first for calculated stats
  const { data, error } = await supabase.rpc('get_team_season_stats', {
    p_team_id: teamId,
    p_season_id: seasonId,
  });

  if (!error && data) return data as TeamSeasonStats;

  // Fallback: return null (stats not available)
  return null;
}

/**
 * Fetch player stat leaders for a team
 */
export async function getPlayerLeaders(
  teamId: string,
  seasonId: string,
  statType: 'points' | 'goals' | 'assists'
): Promise<PlayerStat[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_team_player_leaders', {
    p_team_id: teamId,
    p_season_id: seasonId,
    p_stat_type: statType,
    p_limit: 3,
  });

  if (!error && data) return data as PlayerStat[];
  return [];
}
