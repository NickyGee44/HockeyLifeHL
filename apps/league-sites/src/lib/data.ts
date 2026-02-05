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
  GoalieStats,
  PlayerGameLogEntry,
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
 * Fetch all divisions for a league
 */
export async function getDivisions(leagueId: string): Promise<Division[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('league_id', leagueId)
    .order('name', { ascending: true });

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
      profile:profiles(full_name, avatar_url)
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

  // Try to use standings RPC if available (actual function name: get_team_standings)
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_team_standings',
    {
      check_league_id: leagueId,
      check_season_id: seasonId || null,
    }
  );

  if (!rpcError && rpcData) {
    return rpcData as TeamStanding[];
  }

  // Fallback: Query team_standings table directly
  let standingsQuery = supabase
    .from('team_standings')
    .select('*')
    .order('points', { ascending: false });

  if (seasonId) {
    standingsQuery = standingsQuery.eq('season_id', seasonId);
  }

  const { data: standings, error } = await standingsQuery;

  if (error || !standings) {
    return [];
  }

  // Get teams with divisions
  const { data: teams } = await supabase
    .from('teams')
    .select('id, division_id, divisions(id, name)')
    .eq('league_id', leagueId);

  const teamDivisionMap = new Map(
    teams?.map((t) => {
      const div = Array.isArray(t.divisions) ? t.divisions[0] : t.divisions;
      return [t.id, { division_id: div?.id || t.division_id, division_name: div?.name }];
    }) || []
  );

  return standings.map((s) => {
    const divInfo = teamDivisionMap.get(s.team_id);
    return {
      team_id: s.team_id,
      team_name: s.name,
      team_logo: s.logo_url,
      division_id: divInfo?.division_id || null,
      division_name: divInfo?.division_name || null,
      games_played: Number(s.games_played) || 0,
      wins: Number(s.wins) || 0,
      losses: Number(s.losses) || 0,
      ties: Number(s.ties) || 0,
      overtime_losses: 0,
      points: Number(s.points) || 0,
      goals_for: Number(s.goals_for) || 0,
      goals_against: Number(s.goals_against) || 0,
      goal_differential: (Number(s.goals_for) || 0) - (Number(s.goals_against) || 0),
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
    .in('status', ['final', 'completed'])
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
    .in('status', ['final', 'completed', 'in_progress', 'scheduled'])
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
    venue?: string;
    status?: string;
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

  if (filters?.venue) {
    query = query.eq('venue', filters.venue);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
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

  // Fallback: Query player_season_stats view
  const season = await getCurrentSeason(leagueId);
  if (!season) return [];

  const orderColumn = statType === 'saves' ? 'games_played' : statType;

  const { data: stats, error } = await supabase
    .from('player_season_stats')
    .select('*')
    .eq('season_id', season.id)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (error || !stats) {
    return [];
  }

  return stats.map((s) => ({
    player_id: s.player_id,
    player_name: s.full_name || 'Unknown',
    team_name: s.team_name || 'Unknown',
    team_id: '',
    position: s.position || null,
    games_played: Number(s.games_played) || 0,
    goals: Number(s.goals) || 0,
    assists: Number(s.assists) || 0,
    points: Number(s.points) || 0,
    penalty_minutes: 0,
    plus_minus: 0,
  })) as PlayerStats[];
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
    .in('status', ['final', 'completed']);

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
    .in('status', ['final', 'completed'])
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

/**
 * Fetch recent scores for the Scores page
 * Gets completed games from the last N days, grouped by date
 */
export async function getScores(
  leagueId: string,
  options?: {
    daysBack?: number;
    seasonId?: string;
    divisionId?: string;
    status?: 'final' | 'in_progress' | 'all';
  }
): Promise<RecentGame[]> {
  const supabase = await createClient();

  const daysBack = options?.daysBack || 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  let query = supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo, colors),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo, colors)
    `)
    .eq('league_id', leagueId)
    .gte('scheduled_at', cutoffDate.toISOString())
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: false });

  // Apply status filter (include 'completed' as alias for 'final')
  if (options?.status === 'final') {
    query = query.in('status', ['final', 'completed']);
  } else if (options?.status === 'in_progress') {
    query = query.eq('status', 'in_progress');
  } else if (options?.status === 'all') {
    query = query.in('status', ['final', 'completed', 'in_progress']);
  } else {
    // Default: show completed games
    query = query.in('status', ['final', 'completed']);
  }

  if (options?.seasonId) {
    query = query.eq('season_id', options.seasonId);
  }

  if (options?.divisionId) {
    query = query.eq('division_id', options.divisionId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data as RecentGame[];
}

/**
 * Fetch venues for a league (for venue filter)
 */
export async function getVenues(leagueId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select('venue')
    .eq('league_id', leagueId)
    .not('venue', 'is', null);

  if (error || !data) {
    return [];
  }

  // Get unique venues
  const venues = [...new Set(data.map((g: { venue: string | null }) => g.venue).filter(Boolean))] as string[];
  return venues.sort();
}

/**
 * Fetch player profile for player detail page
 */
export async function getPlayerProfile(playerId: string): Promise<Player | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('team_rosters')
    .select(`
      *,
      profile:profiles(id, full_name, avatar_url),
      team:teams(id, name, slug, logo, colors, league_id)
    `)
    .eq('id', playerId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Player;
}

/**
 * Fetch player career stats
 * Uses player_stats table which has per-game stats with proper columns
 */
export async function getPlayerCareerStats(
  playerId: string,
  seasonId?: string
): Promise<PlayerStats | null> {
  const supabase = await createClient();

  // Query player_stats table for player-specific stats
  let query = supabase
    .from('player_stats')
    .select('goals, assists, penalty_minutes')
    .eq('player_id', playerId);

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return null;

  // Aggregate stats across all games
  const totals = data.reduce(
    (acc, stat) => ({
      goals: acc.goals + (stat.goals || 0),
      assists: acc.assists + (stat.assists || 0),
      penalty_minutes: acc.penalty_minutes + (stat.penalty_minutes || 0),
    }),
    { goals: 0, assists: 0, penalty_minutes: 0 }
  );

  return {
    player_id: playerId,
    player_name: '',
    team_name: '',
    team_id: '',
    position: null,
    games_played: data.length,
    goals: totals.goals,
    assists: totals.assists,
    points: totals.goals + totals.assists,
    penalty_minutes: totals.penalty_minutes,
    plus_minus: 0,
  } as PlayerStats;
}

/**
 * Fetch player game log
 * Queries player_stats table with game details
 */
export async function getPlayerGameLog(
  playerId: string,
  seasonId?: string,
  limit = 20
): Promise<PlayerGameLogEntry[]> {
  const supabase = await createClient();

  // Build query for player stats with game details
  let query = supabase
    .from('player_stats')
    .select(`
      id,
      goals,
      assists,
      penalty_minutes,
      game_id,
      game:games(
        id,
        scheduled_at,
        home_score,
        away_score,
        status,
        home_team:teams!games_home_team_id_fkey(id, name, slug),
        away_team:teams!games_away_team_id_fkey(id, name, slug)
      )
    `)
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  // Transform to expected format
  return data.map((stat: any) => {
    const game = Array.isArray(stat.game) ? stat.game[0] : stat.game;
    return {
      game_id: game?.id || stat.game_id || '',
      date: game?.scheduled_at || '',
      opponent: '',
      result: game?.status === 'final' || game?.status === 'completed' ? 'W' : '-',
      goals: stat.goals || 0,
      assists: stat.assists || 0,
      points: (stat.goals || 0) + (stat.assists || 0),
      plus_minus: 0,
      pim: stat.penalty_minutes || 0,
    };
  }) as PlayerGameLogEntry[];
}

/**
 * Fetch goalie stats leaders
 * Uses get_goalie_season_stats RPC with correct parameter names
 */
export async function getGoalieLeaders(
  leagueId: string,
  seasonId?: string,
  sortBy: 'wins' | 'save_percentage' | 'goals_against_average' | 'shutouts' = 'wins',
  limit = 20
): Promise<GoalieStats[]> {
  const supabase = await createClient();

  // Use the actual RPC function name with correct parameters
  const { data, error } = await supabase.rpc('get_goalie_season_stats', {
    check_league_id: leagueId,
    check_season_id: seasonId || null,
  });

  if (error || !data) return [];

  // Transform RPC response to expected format and apply client-side sorting/limiting
  let results = (data as any[]).map((row) => ({
    player_id: row.player_id,
    player_name: row.full_name || 'Unknown',
    team_id: row.team_id || '',
    team_name: row.team_name || '',
    games_played: row.games_played || 0,
    wins: row.wins || 0,
    losses: row.losses || 0,
    save_percentage: row.save_percentage || 0,
    goals_against_average: row.goals_against_average || 0,
    shutouts: row.shutouts || 0,
    saves: row.total_saves || 0,
    goals_against: row.total_goals_against || 0,
  }));

  // Sort by requested stat
  results.sort((a, b) => {
    switch (sortBy) {
      case 'save_percentage':
        return b.save_percentage - a.save_percentage;
      case 'goals_against_average':
        return a.goals_against_average - b.goals_against_average; // Lower is better
      case 'shutouts':
        return b.shutouts - a.shutouts;
      case 'wins':
      default:
        return b.wins - a.wins;
    }
  });

  return results.slice(0, limit) as GoalieStats[];
}
