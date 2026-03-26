export async function checkAddonActive(supabase: any, leagueId: string): Promise<boolean> {
  // Get league's organization
  const { data: league } = await supabase
    .from('leagues')
    .select('organization_id')
    .eq('id', leagueId)
    .single();

  if (!league?.organization_id) return false;

  // Check for active ai_news addon
  const { data: addon } = await supabase
    .from('organization_addons')
    .select('id')
    .eq('organization_id', league.organization_id)
    .eq('addon_type', 'ai_news')
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  return !!addon;
}

export async function gatherGameRecapData(supabase: any, gameId: string) {
  // Get game details
  const { data: game } = await supabase
    .from('games')
    .select(`
      id, league_id, season_id, scheduled_at, location, status,
      home_score, away_score, home_team_id, away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name),
      away_team:teams!games_away_team_id_fkey(id, name)
    `)
    .eq('id', gameId)
    .single();

  if (!game || game.status !== 'completed') return null;

  const homeTeam = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
  const awayTeam = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team;

  // Get game events (goals and penalties)
  const { data: events } = await supabase
    .from('game_events')
    .select(`
      event_type, period, game_time_seconds, team_id,
      player_id, assist1_player_id, assist2_player_id,
      penalty_minutes, penalty_type,
      is_power_play, is_short_handed, is_empty_net
    `)
    .eq('game_id', gameId)
    .is('deleted_at', null)
    .in('event_type', ['goal', 'penalty'])
    .order('period', { ascending: true })
    .order('game_time_seconds', { ascending: true });

  // Collect all player IDs for name lookup
  const playerIds = new Set<string>();
  for (const event of events || []) {
    playerIds.add(event.player_id);
    if (event.assist1_player_id) playerIds.add(event.assist1_player_id);
    if (event.assist2_player_id) playerIds.add(event.assist2_player_id);
  }

  // Fetch player names
  const playerNameMap: Record<string, string> = {};
  if (playerIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(playerIds));

    for (const p of profiles || []) {
      playerNameMap[p.id] = p.full_name || 'Unknown Player';
    }
  }

  // Team name map
  const teamNameMap: Record<string, string> = {};
  if (homeTeam) teamNameMap[homeTeam.id] = homeTeam.name;
  if (awayTeam) teamNameMap[awayTeam.id] = awayTeam.name;

  // Format time
  const formatTime = (seconds: number | null) => {
    if (seconds == null) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Build goals array
  const goals = (events || [])
    .filter((e: any) => e.event_type === 'goal')
    .map((e: any) => ({
      period: e.period,
      time: formatTime(e.game_time_seconds),
      scorer_id: e.player_id,
      scorer_name: playerNameMap[e.player_id] || 'Unknown',
      assist1_id: e.assist1_player_id,
      assist1_name: e.assist1_player_id ? playerNameMap[e.assist1_player_id] || null : null,
      assist2_id: e.assist2_player_id,
      assist2_name: e.assist2_player_id ? playerNameMap[e.assist2_player_id] || null : null,
      team_id: e.team_id,
      team_name: teamNameMap[e.team_id] || 'Unknown',
      is_power_play: e.is_power_play || false,
      is_short_handed: e.is_short_handed || false,
      is_empty_net: e.is_empty_net || false,
    }));

  // Build penalties array
  const penalties = (events || [])
    .filter((e: any) => e.event_type === 'penalty')
    .map((e: any) => ({
      period: e.period,
      player_id: e.player_id,
      player_name: playerNameMap[e.player_id] || 'Unknown',
      team_name: teamNameMap[e.team_id] || 'Unknown',
      penalty_type: e.penalty_type || 'Minor',
      minutes: e.penalty_minutes || 2,
    }));

  // Get goalie stats
  const { data: goalieRows } = await supabase
    .from('goalie_stats')
    .select('player_id, team_id, saves, goals_against')
    .eq('game_id', gameId);

  let homeGoalie = null;
  let awayGoalie = null;

  for (const row of goalieRows || []) {
    const goalieData = {
      player_id: row.player_id,
      name: playerNameMap[row.player_id] || 'Unknown',
      saves: row.saves || 0,
      goals_against: row.goals_against || 0,
    };
    if (row.team_id === game.home_team_id) {
      homeGoalie = goalieData;
    } else {
      awayGoalie = goalieData;
    }
  }

  // Get standings context (optional, non-blocking)
  let standings = null;
  try {
    const { data: standingsData } = await supabase.rpc('get_team_standings', {
      check_league_id: game.league_id,
      check_season_id: game.season_id || null,
    });

    if (standingsData) {
      const homeStanding = standingsData.find((s: any) => s.team_id === game.home_team_id);
      const awayStanding = standingsData.find((s: any) => s.team_id === game.away_team_id);
      if (homeStanding || awayStanding) {
        standings = {
          homeRecord: homeStanding ? `${homeStanding.wins}W-${homeStanding.losses}L-${homeStanding.ties}T` : 'N/A',
          awayRecord: awayStanding ? `${awayStanding.wins}W-${awayStanding.losses}L-${awayStanding.ties}T` : 'N/A',
        };
      }
    }
  } catch {
    // Standings are optional context, don't fail on this
  }

  return {
    league_id: game.league_id,
    season_id: game.season_id,
    homeTeam: homeTeam || { id: game.home_team_id, name: 'Home Team' },
    awayTeam: awayTeam || { id: game.away_team_id, name: 'Away Team' },
    homeScore: game.home_score,
    awayScore: game.away_score,
    scheduledAt: game.scheduled_at,
    venue: game.location,
    goals,
    penalties,
    homeGoalie,
    awayGoalie,
    standings,
  };
}

export async function gatherWeeklyWrapData(
  supabase: any,
  leagueId: string,
  divisionId: string | null,
  weekStart: Date,
  weekEnd: Date,
) {
  // Get current season
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  const seasonId = season?.id || null;

  // Get division name if applicable
  let divisionName = null;
  if (divisionId) {
    const { data: div } = await supabase
      .from('divisions')
      .select('name')
      .eq('id', divisionId)
      .single();
    divisionName = div?.name || null;
  }

  // Get completed games this week
  let gamesQuery = supabase
    .from('games')
    .select(`
      id, scheduled_at, home_score, away_score,
      home_team_id, away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, division_id),
      away_team:teams!games_away_team_id_fkey(id, name, division_id)
    `)
    .eq('league_id', leagueId)
    .eq('status', 'completed')
    .gte('scheduled_at', weekStart.toISOString())
    .lte('scheduled_at', weekEnd.toISOString())
    .order('scheduled_at', { ascending: true });

  const { data: gamesData } = await gamesQuery;

  // Filter by division if needed
  let games = (gamesData || []).map((g: any) => {
    const home = Array.isArray(g.home_team) ? g.home_team[0] : g.home_team;
    const away = Array.isArray(g.away_team) ? g.away_team[0] : g.away_team;
    return { ...g, home_team: home, away_team: away };
  });

  if (divisionId) {
    games = games.filter((g: any) =>
      g.home_team?.division_id === divisionId || g.away_team?.division_id === divisionId
    );
  }

  if (games.length === 0) return null;

  const gameIds = games.map((g: any) => g.id);

  // Get player stats for these games
  const { data: playerStats } = await supabase
    .from('player_stats')
    .select('player_id, team_id, goals, assists, game_id')
    .in('game_id', gameIds);

  // Get goalie stats for these games
  const { data: goalieStats } = await supabase
    .from('goalie_stats')
    .select('player_id, team_id, saves, goals_against, shots_against, game_id')
    .in('game_id', gameIds);

  // Get player names
  const allPlayerIds = new Set<string>();
  for (const ps of playerStats || []) allPlayerIds.add(ps.player_id);
  for (const gs of goalieStats || []) allPlayerIds.add(gs.player_id);

  const playerNameMap: Record<string, string> = {};
  const playerTeamMap: Record<string, string> = {};
  if (allPlayerIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(allPlayerIds));
    for (const p of profiles || []) {
      playerNameMap[p.id] = p.full_name || 'Unknown';
    }
  }

  // Get team names
  const teamIds = new Set<string>();
  for (const g of games) {
    if (g.home_team?.id) teamIds.add(g.home_team.id);
    if (g.away_team?.id) teamIds.add(g.away_team.id);
  }
  const teamNameMap: Record<string, string> = {};
  for (const g of games) {
    if (g.home_team) teamNameMap[g.home_team.id] = g.home_team.name;
    if (g.away_team) teamNameMap[g.away_team.id] = g.away_team.name;
  }

  // Aggregate weekly stats per player
  const weeklyStats: Record<string, { goals: number; assists: number; points: number; team_id: string }> = {};
  for (const ps of playerStats || []) {
    if (!weeklyStats[ps.player_id]) {
      weeklyStats[ps.player_id] = { goals: 0, assists: 0, points: 0, team_id: ps.team_id };
      playerTeamMap[ps.player_id] = ps.team_id;
    }
    weeklyStats[ps.player_id].goals += ps.goals || 0;
    weeklyStats[ps.player_id].assists += ps.assists || 0;
    weeklyStats[ps.player_id].points += (ps.goals || 0) + (ps.assists || 0);
  }

  // Top scorers
  const topScorers = Object.entries(weeklyStats)
    .sort(([, a], [, b]) => b.points - a.points)
    .slice(0, 5)
    .map(([playerId, stats]) => ({
      player_id: playerId,
      name: playerNameMap[playerId] || 'Unknown',
      team: teamNameMap[stats.team_id] || 'Unknown',
      ...stats,
    }));

  // Top goalies
  const goalieAgg: Record<string, { saves: number; goals_against: number; shots: number; team_id: string }> = {};
  for (const gs of goalieStats || []) {
    if (!goalieAgg[gs.player_id]) {
      goalieAgg[gs.player_id] = { saves: 0, goals_against: 0, shots: 0, team_id: gs.team_id };
    }
    goalieAgg[gs.player_id].saves += gs.saves || 0;
    goalieAgg[gs.player_id].goals_against += gs.goals_against || 0;
    goalieAgg[gs.player_id].shots += gs.shots_against || (gs.saves || 0) + (gs.goals_against || 0);
  }

  const topGoalies = Object.entries(goalieAgg)
    .filter(([, stats]) => stats.shots > 0)
    .sort(([, a], [, b]) => (b.saves / b.shots) - (a.saves / a.shots))
    .slice(0, 3)
    .map(([playerId, stats]) => ({
      player_id: playerId,
      name: playerNameMap[playerId] || 'Unknown',
      team: teamNameMap[stats.team_id] || 'Unknown',
      saves: stats.saves,
      save_percentage: Math.round((stats.saves / stats.shots) * 1000) / 10,
    }));

  // Format games for prompt
  const formattedGames = games.map((g: any) => {
    // Get scorers for this game
    const gameScorers = (playerStats || [])
      .filter((ps: any) => ps.game_id === g.id && (ps.goals > 0 || ps.assists > 0))
      .map((ps: any) => ({
        player_id: ps.player_id,
        name: playerNameMap[ps.player_id] || 'Unknown',
        team: teamNameMap[ps.team_id] || 'Unknown',
        goals: ps.goals || 0,
        assists: ps.assists || 0,
      }));

    return {
      id: g.id,
      homeTeamId: g.home_team?.id || g.home_team_id || null,
      awayTeamId: g.away_team?.id || g.away_team_id || null,
      homeTeam: g.home_team?.name || 'Unknown',
      awayTeam: g.away_team?.name || 'Unknown',
      homeScore: g.home_score,
      awayScore: g.away_score,
      scheduledAt: g.scheduled_at,
      scorers: gameScorers,
    };
  });

  // Get standings
  let standings: any[] = [];
  try {
    const { data: standingsData } = await supabase.rpc('get_team_standings', {
      check_league_id: leagueId,
      check_season_id: seasonId,
    });
    if (standingsData) {
      standings = standingsData
        .filter((s: any) => {
          if (!divisionId) return true;
          // Filter standings by division teams
          return games.some((g: any) =>
            g.home_team?.id === s.team_id || g.away_team?.id === s.team_id
          );
        })
        .map((s: any) => ({
          name: teamNameMap[s.team_id] || 'Unknown',
          wins: s.wins || 0,
          losses: s.losses || 0,
          ties: s.ties || 0,
          points: s.points || 0,
        }))
        .sort((a: any, b: any) => b.points - a.points);
    }
  } catch {
    // Non-critical
  }

  return {
    season_id: seasonId,
    divisionName,
    games: formattedGames,
    topScorers,
    topGoalies,
    standings,
  };
}
