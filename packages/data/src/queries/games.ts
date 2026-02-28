import type { SupabaseClientArg, UpcomingGame, RecentGame, ScheduleGame, GamePreview, Game } from '../types';

function transformTeamData(team: any): any {
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
    division_id: rawTeam.division_id,
    division: rawTeam.division || (Array.isArray(rawTeam.divisions) ? rawTeam.divisions[0] : rawTeam.divisions) || null,
  };
}

export async function getUpcomingGames(
  supabase: SupabaseClientArg,
  leagueId: string,
  limit = 5,
): Promise<UpcomingGame[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(name))
    `)
    .eq('league_id', leagueId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((game: any) => ({
    ...game,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as UpcomingGame[];
}

export async function getRecentGames(
  supabase: SupabaseClientArg,
  leagueId: string,
  limit = 10,
): Promise<RecentGame[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(name))
    `)
    .eq('league_id', leagueId)
    .in('status', ['completed', 'pending_verification'])
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((game: any) => ({
    ...game,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as RecentGame[];
}

export async function getGamePreview(
  supabase: SupabaseClientArg,
  gameId: string,
): Promise<GamePreview | null> {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(name)),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id, divisions(name))
    `)
    .eq('id', gameId)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    home_team: transformTeamData(data.home_team),
    away_team: transformTeamData(data.away_team),
  } as GamePreview;
}

export async function getSchedule(
  supabase: SupabaseClientArg,
  leagueId: string,
  seasonId?: string,
  options?: { divisionId?: string; limit?: number },
): Promise<ScheduleGame[]> {
  let query = supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color),
      division:divisions(id, name)
    `)
    .eq('league_id', leagueId)
    .order('scheduled_at', { ascending: true });

  if (seasonId) query = query.eq('season_id', seasonId);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error || !data) return [];

  let games = data.map((game: any) => ({
    ...game,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as ScheduleGame[];

  if (options?.divisionId) {
    games = games.filter(
      (g) =>
        g.division_id === options.divisionId ||
        g.division?.id === options.divisionId,
    );
  }

  return games;
}

/**
 * Get upcoming games for a specific player (across all their teams/leagues)
 */
export async function getPlayerUpcomingGames(
  supabase: SupabaseClientArg,
  userId: string,
  limit = 20,
): Promise<UpcomingGame[]> {
  // Get player's team IDs
  const { data: rosters } = await supabase
    .from('team_rosters')
    .select('team_id')
    .eq('player_id', userId);

  if (!rosters || rosters.length === 0) return [];

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const teamIds = [...new Set(rosters.map((r: any) => r.team_id))].filter((id) => UUID_REGEX.test(String(id)));

  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id)
    `)
    .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) console.error('[getPlayerUpcomingGames]', error.message);
  if (error || !data) return [];

  return data.map((game: any) => ({
    ...game,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as UpcomingGame[];
}

/**
 * Get recent results for a specific player (across all their teams)
 */
export async function getPlayerRecentGames(
  supabase: SupabaseClientArg,
  userId: string,
  limit = 20,
): Promise<RecentGame[]> {
  const { data: rosters } = await supabase
    .from('team_rosters')
    .select('team_id')
    .eq('player_id', userId);

  if (!rosters || rosters.length === 0) return [];

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const teamIds = [...new Set(rosters.map((r: any) => r.team_id))].filter((id) => UUID_REGEX.test(String(id)));

  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color, division_id)
    `)
    .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
    .in('status', ['completed', 'pending_verification'])
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error) console.error('[getPlayerRecentGames]', error.message);
  if (error || !data) return [];

  return data.map((game: any) => ({
    ...game,
    home_team: transformTeamData(game.home_team),
    away_team: transformTeamData(game.away_team),
  })) as RecentGame[];
}
