import { unstable_noStore as noStore } from 'next/cache';
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
  SpecialTeamsLeader,
  Suspension,
  NewsArticle,
  LeagueEvent,
  GalleryAlbum,
  GalleryPhoto,
  StaffMember,
  LeagueSponsor,
  LeagueAward,
  ThemePreset,
} from './types';

// Default brand colors from BRAND-KIT.md
const DEFAULT_PRIMARY = '#D4AF37';
const DEFAULT_SECONDARY = '#1a1a1a';
const DEFAULT_ACCENT = '#D4AF37';
const DEFAULT_FONT_FAMILY = '"Rajdhani", "Sora", "Inter", system-ui, -apple-system, sans-serif';

function getThemePreset(league: League): ThemePreset {
  const preset = (league.settings?.website as { themePreset?: string } | undefined)?.themePreset;

  if (preset === 'light' || preset === 'custom') {
    return preset;
  }

  return 'dark';
}

/**
 * Helper to transform team data from DB columns to expected format
 * Maps: logo_url -> logo, primary_color+secondary_color -> colors
 */
function transformTeamData(team: any): any {
  if (!team) return null;
  const rawTeam = Array.isArray(team) ? team[0] : team;
  if (!rawTeam) return null;

  // Map logo_url to logo, combine colors
  const colors = [rawTeam.primary_color, rawTeam.secondary_color].filter(Boolean).join(',') || null;
  return {
    id: rawTeam.id,
    name: rawTeam.name,
    slug: rawTeam.slug,
    logo: rawTeam.logo_url || null,
    colors,
    division_id: rawTeam.division_id,
    division: rawTeam.division || (Array.isArray(rawTeam.divisions) ? rawTeam.divisions[0] : rawTeam.divisions) || null,
  };
}

function matchesDivisionFilter(
  game: {
    division_id?: string | null;
    division?: { id?: string | null } | null;
    home_team?: any;
    away_team?: any;
  },
  divisionId: string,
): boolean {
  const candidates = [
    game.division_id,
    game.division?.id ?? null,
    game.home_team?.division_id ?? null,
    game.home_team?.division?.id ?? null,
    game.away_team?.division_id ?? null,
    game.away_team?.division?.id ?? null,
  ];

  return candidates.some((id) => id === divisionId);
}

/**
 * Fetch league by slug for public display
 */
export async function getLeagueBySlug(slug: string): Promise<League | null> {
  noStore();
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

type RosterStatsAccumulator = {
  skater_games_played: number;
  goalie_games_played: number;
  goals: number;
  assists: number;
  penalty_minutes: number;
  wins: number;
  losses: number;
  saves: number;
  shots_against: number;
  goals_against: number;
  shutouts: number;
  is_goalie: boolean;
};

export type TeamRosterStatsByPlayer = Record<string, {
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  wins: number;
  losses: number;
  save_percentage: number | null;
  goals_against_average: number | null;
  shutouts: number;
  is_goalie: boolean;
}>;

/**
 * Fetch aggregated roster stats for a team.
 * Combines skater stats and goalie stats for the provided season.
 */
export async function getTeamRosterStats(
  teamId: string,
  seasonId?: string,
): Promise<TeamRosterStatsByPlayer> {
  const supabase = await createClient();

  let skaterQuery = supabase
    .from('player_stats')
    .select('player_id, goals, assists, penalty_minutes')
    .eq('team_id', teamId);

  let goalieQuery = supabase
    .from('goalie_stats')
    .select('player_id, saves, shots_against, goals_against, shutout, game_result')
    .eq('team_id', teamId);

  if (seasonId) {
    skaterQuery = skaterQuery.eq('season_id', seasonId);
    goalieQuery = goalieQuery.eq('season_id', seasonId);
  }

  const [{ data: skaterRows }, { data: goalieRows }] = await Promise.all([
    skaterQuery,
    goalieQuery,
  ]);

  const accumulator: Record<string, RosterStatsAccumulator> = {};

  const ensure = (playerId: string): RosterStatsAccumulator => {
    if (!accumulator[playerId]) {
      accumulator[playerId] = {
        skater_games_played: 0,
        goalie_games_played: 0,
        goals: 0,
        assists: 0,
        penalty_minutes: 0,
        wins: 0,
        losses: 0,
        saves: 0,
        shots_against: 0,
        goals_against: 0,
        shutouts: 0,
        is_goalie: false,
      };
    }
    return accumulator[playerId];
  };

  for (const row of skaterRows || []) {
    const entry = ensure(row.player_id);
    entry.skater_games_played += 1;
    entry.goals += row.goals || 0;
    entry.assists += row.assists || 0;
    entry.penalty_minutes += row.penalty_minutes || 0;
  }

  for (const row of goalieRows || []) {
    const entry = ensure(row.player_id);
    entry.goalie_games_played += 1;
    entry.is_goalie = true;
    entry.saves += row.saves || 0;
    entry.shots_against += row.shots_against || 0;
    entry.goals_against += row.goals_against || 0;
    if (row.shutout) entry.shutouts += 1;

    const result = (row.game_result || '').toUpperCase();
    if (result === 'W' || result === 'WIN') {
      entry.wins += 1;
    } else if (result === 'L' || result === 'LOSS' || result === 'OTL' || result === 'SOL') {
      entry.losses += 1;
    }
  }

  const output: TeamRosterStatsByPlayer = {};
  for (const [playerId, entry] of Object.entries(accumulator)) {
    const gamesPlayed = Math.max(entry.skater_games_played, entry.goalie_games_played);
    const savePct = entry.shots_against > 0 ? entry.saves / entry.shots_against : null;
    const gaa = entry.goalie_games_played > 0 ? entry.goals_against / entry.goalie_games_played : null;

    output[playerId] = {
      games_played: gamesPlayed,
      goals: entry.goals,
      assists: entry.assists,
      points: entry.goals + entry.assists,
      penalty_minutes: entry.penalty_minutes,
      wins: entry.wins,
      losses: entry.losses,
      save_percentage: savePct,
      goals_against_average: gaa,
      shutouts: entry.shutouts,
      is_goalie: entry.is_goalie,
    };
  }

  return output;
}

/**
 * Fetch team with captain info
 */
export async function getTeamWithCaptain(
  leagueId: string,
  teamSlug: string
): Promise<(Team & { captain?: { id: string; full_name: string; avatar_url: string | null; email?: string } }) | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      division:divisions(*),
      captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url)
    `)
    .eq('league_id', leagueId)
    .eq('slug', teamSlug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as any;
}

/**
 * Fetch team stats from standings
 */
export async function getTeamStats(teamId: string, leagueId: string): Promise<TeamStanding | null> {
  const standings = await getStandings(leagueId);
  return standings.find(s => s.team_id === teamId) || null;
}

/**
 * Fetch team schedule (upcoming and recent games)
 */
export async function getTeamSchedule(teamId: string, limit = 10): Promise<ScheduleGame[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      id,
      scheduled_at,
      status,
      location,
      home_score,
      away_score,
      division_id,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color),
      division:divisions(id, name)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((game: any) => ({
    id: game.id,
    scheduled_at: game.scheduled_at,
    status: game.status,
    home_score: game.home_score,
    away_score: game.away_score,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
    venue: game.location || null,
    division: Array.isArray(game.division) ? game.division[0] ?? null : game.division,
  })) as ScheduleGame[];
}

/**
 * Fetch team rivals (teams they've played with head-to-head record)
 */
export async function getTeamRivals(teamId: string, limit = 3): Promise<{
  team: { id: string; name: string; slug: string; logo: string | null };
  wins: number;
  losses: number;
  ties: number;
  games_played: number;
}[]> {
  const supabase = await createClient();

  // Get all completed games for this team
  const { data: games, error } = await supabase
    .from('games')
    .select(`
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'completed');

  if (error || !games || games.length === 0) {
    return [];
  }

  // Calculate record against each opponent
  const opponents = new Map<string, {
    team: { id: string; name: string; slug: string; logo: string | null };
    wins: number;
    losses: number;
    ties: number;
  }>();

  for (const game of games) {
    const isHome = game.home_team_id === teamId;
    const opponentData = isHome ? game.away_team : game.home_team;
    const opponent = Array.isArray(opponentData) ? opponentData[0] : opponentData;
    if (!opponent) continue;

    const opponentId = opponent.id;
    const myScore = isHome ? game.home_score : game.away_score;
    const theirScore = isHome ? game.away_score : game.home_score;

    if (!opponents.has(opponentId)) {
      opponents.set(opponentId, {
        team: { id: opponent.id, name: opponent.name, slug: opponent.slug, logo: opponent.logo_url },
        wins: 0,
        losses: 0,
        ties: 0,
      });
    }

    const record = opponents.get(opponentId)!;
    if (myScore > theirScore) record.wins++;
    else if (myScore < theirScore) record.losses++;
    else record.ties++;
  }

  // Sort by most games played and return top rivals
  return Array.from(opponents.values())
    .map(r => ({ ...r, games_played: r.wins + r.losses + r.ties }))
    .sort((a, b) => b.games_played - a.games_played)
    .slice(0, limit);
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

  // Get teams with names, logos, and divisions for enrichment
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, logo_url, division_id, divisions(id, name)')
    .eq('league_id', leagueId);

  const teamInfoMap = new Map(
    teams?.map((t) => {
      const div = Array.isArray(t.divisions) ? t.divisions[0] : t.divisions;
      return [t.id, {
        name: t.name,
        logo_url: t.logo_url,
        division_id: div?.id || t.division_id,
        division_name: div?.name,
      }];
    }) || []
  );

  // Try to use standings RPC if available (actual function name: get_team_standings)
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_team_standings',
    {
      check_league_id: leagueId,
      check_season_id: seasonId || null,
    }
  );

  if (!rpcError && rpcData && Array.isArray(rpcData)) {
    // Enrich RPC data with team names and logos
    return rpcData.map((s: any) => {
      const teamInfo = teamInfoMap.get(s.team_id);
      return {
        team_id: s.team_id,
        team_name: teamInfo?.name || 'Unknown Team',
        team_logo: teamInfo?.logo_url || null,
        division_id: teamInfo?.division_id || null,
        division_name: teamInfo?.division_name || null,
        games_played: Number(s.games_played) || 0,
        wins: Number(s.wins) || 0,
        losses: Number(s.losses) || 0,
        ties: Number(s.ties) || 0,
        overtime_losses: 0,
        points: Number(s.points) || 0,
        goals_for: Number(s.goals_for) || 0,
        goals_against: Number(s.goals_against) || 0,
        goal_differential: Number(s.goal_differential) || 0,
        streak: null,
        last_10: null,
      };
    }) as TeamStanding[];
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

  return standings.map((s) => {
    const teamInfo = teamInfoMap.get(s.team_id);
    return {
      team_id: s.team_id,
      team_name: teamInfo?.name || s.name || 'Unknown Team',
      team_logo: teamInfo?.logo_url || s.logo_url || null,
      division_id: teamInfo?.division_id || null,
      division_name: teamInfo?.division_name || null,
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
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color)
    `)
    .eq('league_id', leagueId)
    .in('status', ['scheduled', 'in_progress'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  // Transform team data from DB columns to expected format
  return data.map((game) => ({
    ...game,
    venue: (game as any).location || null,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as UpcomingGame[];
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
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color)
    `)
    .eq('league_id', leagueId)
    .in('status', ['completed'])
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  // Transform team data from DB columns to expected format
  return data.map((game) => ({
    ...game,
    venue: (game as any).location || null,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as RecentGame[];
}

/**
 * Fetch games for score ticker (mix of recent and upcoming)
 */
export async function getTickerGames(
  leagueId: string,
  limit = 10
): Promise<TickerGame[]> {
  const supabase = await createClient();

  // Get today's games and upcoming games only (no past games)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('games')
    .select(`
      id,
      scheduled_at,
      location,
      home_score,
      away_score,
      status,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(name))
    `)
    .eq('league_id', leagueId)
    .in('status', ['completed', 'in_progress', 'scheduled'])
    .gte('scheduled_at', todayStart.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  // Transform team data from DB columns to expected format
  return data.map((game) => ({
    ...game,
    venue: (game as any).location || null,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as TickerGame[];
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
      location,
      home_score,
      away_score,
      status,
      game_type,
      division_id,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(id, name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(id, name)),
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

  if (filters?.type) {
    query = query.eq('game_type', filters.type);
  }

  if (filters?.venue) {
    query = query.eq('location', filters.venue);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  // Transform team data from DB columns to expected format
  const normalizedGames = data.map((game) => ({
    ...game,
    venue: (game as any).location || null,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
    division: Array.isArray(game.division) ? game.division[0] ?? null : game.division,
  })) as ScheduleGame[];

  if (filters?.divisionId) {
    return normalizedGames.filter((game) => matchesDivisionFilter(game, filters.divisionId!));
  }

  return normalizedGames;
}

/**
 * Get game counts per day for a week (for the week picker badges)
 */
export async function getWeekGameCounts(
  leagueId: string,
  weekStart: Date,
  filters?: {
    seasonId?: string;
    divisionId?: string;
    type?: string;
    venue?: string;
    status?: string;
  },
): Promise<Record<string, number>> {
  const supabase = await createClient();

  // Calculate week end (7 days from start)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data, error } = await supabase
    .from('games')
    .select(`
      scheduled_at,
      season_id,
      game_type,
      location,
      status,
      division_id,
      division:divisions(id, name),
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(id, name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(id, name))
    `)
    .eq('league_id', leagueId)
    .gte('scheduled_at', weekStart.toISOString())
    .lt('scheduled_at', weekEnd.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error || !data) {
    return {};
  }

  const filteredGames = data
    .filter((game: any) => !filters?.seasonId || game.season_id === filters.seasonId)
    .filter((game: any) => !filters?.type || game.game_type === filters.type)
    .filter((game: any) => !filters?.venue || game.location === filters.venue)
    .filter((game: any) => !filters?.status || game.status === filters.status)
    .filter((game: any) => {
      if (!filters?.divisionId) return true;

      const normalizedGame = {
        division_id: game.division_id ?? null,
        division: Array.isArray(game.division) ? game.division[0] ?? null : game.division,
        home_team: transformTeamData(game.home_team),
        away_team: transformTeamData(game.away_team),
      };

      return matchesDivisionFilter(normalizedGame, filters.divisionId);
    });

  // Count games per day
  const counts: Record<string, number> = {};
  filteredGames.forEach((game: { scheduled_at: string }) => {
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
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(id, name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(id, name))
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

  // Transform team data from DB columns to expected format
  return data.map((game) => ({
    ...game,
    venue: (game as any).location || null,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as Game[];
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
    .in('status', ['completed']);

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
        id, name, slug, logo_url, primary_color, secondary_color,
        division:divisions(id, name)
      ),
      away_team:teams!games_away_team_id_fkey(
        id, name, slug, logo_url, primary_color, secondary_color,
        division:divisions(id, name)
      )
    `)
    .eq('id', gameId)
    .single();

  if (error || !data) return null;

  // Transform team data to expected format
  const transformTeam = (team: any) => {
    if (!team) return null;
    const rawTeam = Array.isArray(team) ? team[0] : team;
    if (!rawTeam) return null;
    const colors = [rawTeam.primary_color, rawTeam.secondary_color].filter(Boolean).join(',') || null;
    return {
      id: rawTeam.id,
      name: rawTeam.name,
      slug: rawTeam.slug,
      logo: rawTeam.logo_url || null,
      colors,
      division: Array.isArray(rawTeam.division) ? rawTeam.division[0] : rawTeam.division,
    };
  };

  return {
    ...data,
    venue: (data as any).location || null,
    home_team: transformTeam(data.home_team),
    away_team: transformTeam(data.away_team),
  } as GamePreview;
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
    .in('status', ['completed'])
    .or(`and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`)
    .order('scheduled_at', { ascending: false });

  if (error || !data) return [];
  return data as SeasonSeriesGame[];
}

/**
 * Fetch future scheduled games between two teams
 */
export async function getFutureMatchups(
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
    .eq('status', 'scheduled')
    .or(`and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`)
    .order('scheduled_at', { ascending: true });

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
 * Fetch goalie stats for a specific team in a season
 * Queries goalie_stats table directly with team_id filter
 */
export async function getTeamGoalies(
  teamId: string,
  seasonId: string
): Promise<GoalieStats[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('goalie_stats')
    .select(`
      player_id,
      team_id,
      goals_against,
      saves,
      shutout,
      game_result,
      player:profiles!goalie_stats_player_id_fkey(full_name, avatar_url, jersey_number)
    `)
    .eq('team_id', teamId)
    .eq('season_id', seasonId);

  if (error || !data) return [];

  // Aggregate per-game stats into season totals per goalie
  const goalieMap = new Map<string, {
    player_id: string;
    player_name: string;
    jersey_number: string | null;
    avatar_url: string | null;
    team_id: string;
    games_played: number;
    wins: number;
    losses: number;
    saves: number;
    goals_against: number;
    shutouts: number;
  }>();

  for (const row of data as any[]) {
    const pid = row.player_id;
    const existing = goalieMap.get(pid);

    const playerData = row.player || {};
    const isWin = row.game_result === 'W';
    const isShutout = row.shutout === true;

    if (existing) {
      existing.games_played += 1;
      existing.wins += isWin ? 1 : 0;
      existing.losses += row.game_result === 'L' ? 1 : 0;
      existing.saves += row.saves || 0;
      existing.goals_against += row.goals_against || 0;
      existing.shutouts += isShutout ? 1 : 0;
    } else {
      goalieMap.set(pid, {
        player_id: pid,
        player_name: playerData.full_name || 'Unknown',
        jersey_number: playerData.jersey_number?.toString() || null,
        avatar_url: playerData.avatar_url || null,
        team_id: teamId,
        games_played: 1,
        wins: isWin ? 1 : 0,
        losses: row.game_result === 'L' ? 1 : 0,
        saves: row.saves || 0,
        goals_against: row.goals_against || 0,
        shutouts: isShutout ? 1 : 0,
      });
    }
  }

  return Array.from(goalieMap.values())
    .map((g) => ({
      player_id: g.player_id,
      player_name: g.player_name,
      jersey_number: g.jersey_number,
      avatar_url: g.avatar_url,
      team_id: g.team_id,
      games_played: g.games_played,
      wins: g.wins,
      losses: g.losses,
      save_percentage: g.saves + g.goals_against > 0
        ? Math.round((g.saves / (g.saves + g.goals_against)) * 1000) / 10
        : 0,
      goals_against_average: g.games_played > 0
        ? Math.round((g.goals_against / g.games_played) * 100) / 100
        : 0,
      shutouts: g.shutouts,
      saves: g.saves,
      goals_against: g.goals_against,
    }))
    .sort((a, b) => b.games_played - a.games_played) as GoalieStats[];
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
    status?: 'completed' | 'in_progress' | 'all';
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
      division:divisions(id, name),
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(id, name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(id, name))
    `)
    .eq('league_id', leagueId)
    .gte('scheduled_at', cutoffDate.toISOString())
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: false });

  // Apply status filter
  if (options?.status === 'completed') {
    query = query.eq('status', 'completed');
  } else if (options?.status === 'in_progress') {
    query = query.eq('status', 'in_progress');
  } else if (options?.status === 'all') {
    query = query.in('status', ['completed', 'in_progress']);
  } else {
    // Default: show completed games
    query = query.eq('status', 'completed');
  }

  if (options?.seasonId) {
    query = query.eq('season_id', options.seasonId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  // Transform team data from DB columns to expected format
  const normalizedGames = data.map((game) => ({
    ...game,
    venue: (game as any).location || null,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as RecentGame[];

  if (options?.divisionId) {
    return normalizedGames.filter((game) => matchesDivisionFilter(game, options.divisionId!));
  }

  return normalizedGames;
}

/**
 * Fetch venues for a league (for venue filter)
 */
export async function getVenues(leagueId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select('location')
    .eq('league_id', leagueId)
    .not('location', 'is', null);

  if (error || !data) {
    return [];
  }

  // Get unique venues
  const venues = [...new Set(data.map((g: { location: string | null }) => g.location).filter(Boolean))] as string[];
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
      team:teams(id, name, slug, logo_url, primary_color, secondary_color, league_id)
    `)
    .eq('id', playerId)
    .single();

  if (error || !data) {
    return null;
  }

  // Transform the data to map logo_url to logo and colors
  const rawTeam = Array.isArray(data.team) ? data.team[0] : data.team;
  const transformedData = {
    ...data,
    profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
    team: rawTeam ? {
      ...rawTeam,
      logo: rawTeam.logo_url || null,
      colors: rawTeam.primary_color && rawTeam.secondary_color
        ? `${rawTeam.primary_color},${rawTeam.secondary_color}`
        : rawTeam.primary_color || null,
    } : null,
  };

  return transformedData as Player;
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
      result: game?.status === 'completed' ? 'W' : '-',
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
  const results = (data as any[]).map((row) => ({
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

// ========== NEWS ==========
export async function getNewsArticles(leagueId: string, limit = 20): Promise<NewsArticle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('articles')
    .select('*, author:profiles!articles_author_id_fkey(full_name, avatar_url)')
    .eq('league_id', leagueId)
    .eq('type', 'news')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as NewsArticle[];
}

export async function getNewsArticleBySlug(leagueId: string, slug: string): Promise<NewsArticle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('articles')
    .select('*, author:profiles!articles_author_id_fkey(full_name, avatar_url)')
    .eq('league_id', leagueId)
    .eq('slug', slug)
    .eq('published', true)
    .single();
  if (error || !data) return null;
  return data as unknown as NewsArticle;
}

// ========== EVENTS ==========
export async function getLeagueEvents(leagueId: string): Promise<LeagueEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('league_events')
    .select('*')
    .eq('league_id', leagueId)
    .eq('is_published', true)
    .order('start_time', { ascending: true });
  if (error || !data) return [];
  return data as LeagueEvent[];
}

// ========== GALLERY ==========
export async function getGalleryAlbums(leagueId: string): Promise<GalleryAlbum[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('league_gallery')
    .select('*, gallery_photos(count)')
    .eq('league_id', leagueId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((album: any) => ({
    ...album,
    photo_count: album.gallery_photos?.[0]?.count || 0,
  })) as GalleryAlbum[];
}

export async function getAlbumWithPhotos(albumId: string): Promise<{ album: GalleryAlbum; photos: GalleryPhoto[] } | null> {
  const supabase = await createClient();
  const { data: album, error: albumError } = await supabase
    .from('league_gallery')
    .select('*')
    .eq('id', albumId)
    .eq('is_published', true)
    .single();
  if (albumError || !album) return null;

  const { data: photos } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('gallery_id', albumId)
    .order('display_order', { ascending: true });

  return { album: album as GalleryAlbum, photos: (photos || []) as GalleryPhoto[] };
}

// ========== STAFF ==========
export async function getLeagueStaff(leagueId: string): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('league_staff')
    .select('*')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error || !data) return [];
  return data as StaffMember[];
}

// ========== SPONSORS ==========
export async function getLeagueSponsors(leagueId: string): Promise<LeagueSponsor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('league_sponsors')
    .select('*')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error || !data) return [];
  return data as LeagueSponsor[];
}

// ========== AWARDS ==========
export async function getLeagueAwards(leagueId: string, seasonId?: string): Promise<LeagueAward[]> {
  const supabase = await createClient();
  let query = supabase
    .from('league_awards')
    .select('*, player:profiles(full_name, avatar_url), team:teams(name, logo_url), season:seasons(name)')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });
  if (seasonId) query = query.eq('season_id', seasonId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as LeagueAward[];
}

// ========== SPECIAL TEAMS STATS ==========
export async function getSpecialTeamsLeaders(leagueId: string, seasonId?: string): Promise<SpecialTeamsLeader[]> {
  const supabase = await createClient();
  let query = supabase
    .from('special_teams_leaders')
    .select('*')
    .eq('league_id', leagueId);
  if (seasonId) query = query.eq('season_id', seasonId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as SpecialTeamsLeader[];
}

// ========== SUSPENSIONS ==========
export async function getSuspensions(leagueId: string, seasonId?: string): Promise<Suspension[]> {
  const supabase = await createClient();
  let query = supabase
    .from('suspensions')
    .select('*, player:profiles(full_name, avatar_url), team:teams(name, logo_url)')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });
  if (seasonId) query = query.eq('season_id', seasonId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as Suspension[];
}
