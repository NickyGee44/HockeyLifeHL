import type { SupabaseClientArg, PlayerStats, PlayerStatsWithAvatar, GoalieStats, PlayerGameLogEntry, PlayerBadge } from '../types';

export async function getStatsLeaders(
  supabase: SupabaseClientArg,
  leagueId: string,
  seasonId?: string,
  options?: { limit?: number; divisionId?: string },
): Promise<PlayerStatsWithAvatar[]> {
  let query = supabase
    .from('player_stats')
    .select(`
      player_id,
      goals,
      assists,
      penalty_minutes,
      plus_minus,
      team_id,
      teams(name, division_id),
      profiles(full_name, avatar_url)
    `)
    .eq('league_id', leagueId);

  if (seasonId) query = query.eq('season_id', seasonId);

  const { data, error } = await query;
  if (error || !data) return [];

  // Aggregate by player
  const playerMap = new Map<string, any>();
  for (const row of data as any[]) {
    const pid = row.player_id;
    if (!playerMap.has(pid)) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      playerMap.set(pid, {
        player_id: pid,
        player_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        team_name: team?.name || '',
        team_id: row.team_id,
        division_id: team?.division_id || null,
        position: null,
        games_played: 0,
        goals: 0,
        assists: 0,
        points: 0,
        penalty_minutes: 0,
        plus_minus: 0,
      });
    }
    const p = playerMap.get(pid)!;
    p.games_played += 1;
    p.goals += row.goals || 0;
    p.assists += row.assists || 0;
    p.points += (row.goals || 0) + (row.assists || 0);
    p.penalty_minutes += row.penalty_minutes || 0;
    p.plus_minus += row.plus_minus || 0;
  }

  let results = Array.from(playerMap.values());

  // Apply division filter if provided
  if (options?.divisionId) {
    results = results.filter(p => p.division_id === options.divisionId);
  }

  results.sort((a, b) => b.points - a.points || b.goals - a.goals);

  return results.slice(0, options?.limit ?? 50) as PlayerStatsWithAvatar[];
}

export async function getGoalieLeaders(
  supabase: SupabaseClientArg,
  leagueId: string,
  seasonId?: string,
  limit = 20,
): Promise<GoalieStats[]> {
  let query = supabase
    .from('goalie_stats')
    .select(`
      player_id,
      saves,
      shots_against,
      goals_against,
      shutout,
      game_result,
      team_id,
      teams(name, logo_url),
      profiles(full_name, avatar_url)
    `)
    .eq('league_id', leagueId);

  if (seasonId) query = query.eq('season_id', seasonId);

  const { data, error } = await query;
  if (error || !data) return [];

  const goalieMap = new Map<string, any>();
  for (const row of data as any[]) {
    const pid = row.player_id;
    if (!goalieMap.has(pid)) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      goalieMap.set(pid, {
        player_id: pid,
        player_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        team_id: row.team_id,
        team_name: team?.name || '',
        team_logo: team?.logo_url || null,
        jersey_number: null,
        games_played: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        saves: 0,
        goals_against: 0,
        shutouts: 0,
        save_percentage: 0,
        goals_against_average: 0,
      });
    }
    const g = goalieMap.get(pid)!;
    g.games_played += 1;
    g.saves += row.saves || 0;
    g.goals_against += row.goals_against || 0;
    if (row.shutout) g.shutouts += 1;
    if (row.game_result === 'W') g.wins += 1;
    else if (row.game_result === 'L') g.losses += 1;
    else if (row.game_result === 'T') g.ties += 1;
  }

  const results = Array.from(goalieMap.values()).map((g) => {
    const shotsAgainst = g.saves + g.goals_against;
    g.save_percentage = shotsAgainst > 0 ? g.saves / shotsAgainst : 0;
    g.goals_against_average = g.games_played > 0 ? g.goals_against / g.games_played : 0;
    return g;
  });

  results.sort((a, b) => {
    if (a.games_played < 3 && b.games_played >= 3) return 1;
    if (a.games_played >= 3 && b.games_played < 3) return -1;
    return b.save_percentage - a.save_percentage;
  });

  return results.slice(0, limit) as GoalieStats[];
}

export async function getPlayerCareerStats(
  supabase: SupabaseClientArg,
  playerId: string,
): Promise<PlayerStats[]> {
  const { data, error } = await supabase
    .from('player_stats')
    .select(`
      *,
      teams(name),
      seasons(name),
      leagues(name)
    `)
    .eq('player_id', playerId);

  if (error || !data) return [];

  // Group by season
  const seasonMap = new Map<string, any>();
  for (const row of data as any[]) {
    const key = `${row.season_id}-${row.team_id}`;
    if (!seasonMap.has(key)) {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      seasonMap.set(key, {
        player_id: playerId,
        player_name: '',
        team_name: team?.name || '',
        team_id: row.team_id,
        position: null,
        games_played: 0,
        goals: 0,
        assists: 0,
        points: 0,
        penalty_minutes: 0,
        plus_minus: 0,
      });
    }
    const s = seasonMap.get(key)!;
    s.games_played += 1;
    s.goals += row.goals || 0;
    s.assists += row.assists || 0;
    s.points += (row.goals || 0) + (row.assists || 0);
    s.penalty_minutes += row.penalty_minutes || 0;
    s.plus_minus += row.plus_minus || 0;
  }

  return Array.from(seasonMap.values());
}

export async function getPlayerGameLog(
  supabase: SupabaseClientArg,
  playerId: string,
  seasonId?: string,
  limit = 50,
): Promise<PlayerGameLogEntry[]> {
  let query = supabase
    .from('player_stats')
    .select(`
      *,
      games(id, scheduled_at, home_team_id, away_team_id, home_score, away_score, status,
        home_team:teams!games_home_team_id_fkey(name, logo_url),
        away_team:teams!games_away_team_id_fkey(name, logo_url)
      )
    `)
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (seasonId) query = query.eq('season_id', seasonId);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as any[]).map((row) => {
    const game = Array.isArray(row.games) ? row.games[0] : row.games;
    const isHome = game?.home_team_id === row.team_id;
    const opponent = isHome ? game?.away_team : game?.home_team;
    const opponentTeam = Array.isArray(opponent) ? opponent[0] : opponent;
    const homeScore = game?.home_score ?? 0;
    const awayScore = game?.away_score ?? 0;
    const teamScore = isHome ? homeScore : awayScore;
    const oppScore = isHome ? awayScore : homeScore;

    let result: PlayerGameLogEntry['result'] = '-';
    if (game?.status === 'completed' || game?.status === 'pending_verification') {
      if (teamScore > oppScore) result = 'W';
      else if (teamScore < oppScore) result = 'L';
      else result = 'T';
    }

    return {
      game_id: game?.id || row.game_id,
      date: game?.scheduled_at || '',
      opponent_name: opponentTeam?.name,
      opponent_logo: opponentTeam?.logo_url,
      is_home: isHome,
      result,
      score: `${homeScore}-${awayScore}`,
      goals: row.goals || 0,
      assists: row.assists || 0,
      points: (row.goals || 0) + (row.assists || 0),
      penalty_minutes: row.penalty_minutes || 0,
      plus_minus: row.plus_minus || 0,
    } as PlayerGameLogEntry;
  });
}

export async function getPlayerBadges(
  supabase: SupabaseClientArg,
  playerId: string,
): Promise<PlayerBadge[]> {
  const { data, error } = await supabase
    .from('player_badges')
    .select('*, season:seasons(name), team:teams(name, logo_url, slug)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as PlayerBadge[];
}
