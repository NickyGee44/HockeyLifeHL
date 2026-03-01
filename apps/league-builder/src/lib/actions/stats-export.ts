'use server';

import { createClient } from '@/lib/supabase/server';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

interface PlayerStatRow {
  player_id: string;
  player_name: string;
  team_name: string;
  jersey_number: string | null;
  position: string | null;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  plus_minus: number;
  power_play_goals: number;
  power_play_assists: number;
  short_handed_goals: number;
  short_handed_assists: number;
  game_winning_goals: number;
  shots: number;
}

/**
 * Export all skater stats for a season as a CSV string.
 * Aggregates per-game player_stats rows into season totals.
 */
export async function exportPlayerStatsCSV(
  leagueId: string,
  seasonId: string,
  seasonName: string
): Promise<ActionResult<string>> {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Verify admin/owner membership
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: leagueRow } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', leagueId)
    .maybeSingle();

  const isCreator = leagueRow?.created_by === user.id;
  const isAdmin = membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active';
  if (!isCreator && !isAdmin) return { success: false, error: 'Forbidden' };

  // Fetch per-game stats joined to profiles and team rosters
  const { data, error } = await supabase
    .from('player_stats')
    .select(`
      player_id,
      goals,
      assists,
      penalty_minutes,
      plus_minus,
      power_play_goals,
      power_play_assists,
      short_handed_goals,
      short_handed_assists,
      game_winning_goals,
      shots,
      profiles!player_stats_player_id_fkey(full_name, jersey_number),
      games!player_stats_game_id_fkey(status, home_captain_verified, away_captain_verified),
      teams!player_stats_team_id_fkey(name)
    `)
    .eq('league_id', leagueId)
    .eq('season_id', seasonId);

  if (error) return { success: false, error: error.message };

  // Filter to verified completed games only (same as the view)
  const verified = (data ?? []).filter(
    (r: any) =>
      r.games?.status === 'completed' &&
      r.games?.home_captain_verified === true &&
      r.games?.away_captain_verified === true
  );

  // Aggregate per player
  const map = new Map<string, PlayerStatRow>();
  for (const row of verified as any[]) {
    const pid = row.player_id as string;
    const profile = row.profiles as { full_name: string | null; jersey_number: string | null } | null;
    const team = row.teams as { name: string } | null;

    if (!map.has(pid)) {
      map.set(pid, {
        player_id: pid,
        player_name: profile?.full_name ?? 'Unknown',
        team_name: team?.name ?? 'Unknown',
        jersey_number: profile?.jersey_number ?? null,
        position: null, // not in player_stats table directly
        games_played: 0,
        goals: 0,
        assists: 0,
        points: 0,
        penalty_minutes: 0,
        plus_minus: 0,
        power_play_goals: 0,
        power_play_assists: 0,
        short_handed_goals: 0,
        short_handed_assists: 0,
        game_winning_goals: 0,
        shots: 0,
      });
    }

    const p = map.get(pid)!;
    p.games_played += 1;
    p.goals += Number(row.goals) || 0;
    p.assists += Number(row.assists) || 0;
    p.penalty_minutes += Number(row.penalty_minutes) || 0;
    p.plus_minus += Number(row.plus_minus) || 0;
    p.power_play_goals += Number(row.power_play_goals) || 0;
    p.power_play_assists += Number(row.power_play_assists) || 0;
    p.short_handed_goals += Number(row.short_handed_goals) || 0;
    p.short_handed_assists += Number(row.short_handed_assists) || 0;
    p.game_winning_goals += Number(row.game_winning_goals) || 0;
    p.shots += Number(row.shots) || 0;
    p.points = p.goals + p.assists;
  }

  // Sort by points desc, then goals
  const players = Array.from(map.values()).sort((a, b) =>
    b.points !== a.points ? b.points - a.points : b.goals - a.goals
  );

  // Build CSV
  const headers = [
    'Rank', 'Player', 'Team', '#', 'GP',
    'G', 'A', 'PTS', 'PIM', '+/-',
    'PPG', 'PPA', 'SHG', 'SHA', 'GWG', 'SOG',
  ];

  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = players.map((p, i) => [
    i + 1,
    escape(p.player_name),
    escape(p.team_name),
    escape(p.jersey_number ?? ''),
    p.games_played,
    p.goals,
    p.assists,
    p.points,
    p.penalty_minutes,
    p.plus_minus,
    p.power_play_goals,
    p.power_play_assists,
    p.short_handed_goals,
    p.short_handed_assists,
    p.game_winning_goals,
    p.shots,
  ].join(','));

  const csv = [`# ${seasonName} — Player Stats`, headers.join(','), ...rows].join('\n');
  return { success: true, data: csv };
}

/**
 * Export goalie stats for a season as a CSV string.
 */
export async function exportGoalieStatsCSV(
  leagueId: string,
  seasonId: string,
  seasonName: string
): Promise<ActionResult<string>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: leagueRow } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', leagueId)
    .maybeSingle();

  const isCreator = leagueRow?.created_by === user.id;
  const isAdmin = membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active';
  if (!isCreator && !isAdmin) return { success: false, error: 'Forbidden' };

  const { data, error } = await supabase
    .from('goalie_stats')
    .select(`
      player_id,
      goals_against,
      saves,
      shutout,
      minutes_played,
      profiles!goalie_stats_player_id_fkey(full_name, jersey_number),
      games!goalie_stats_game_id_fkey(status, home_captain_verified, away_captain_verified),
      teams!goalie_stats_team_id_fkey(name)
    `)
    .eq('league_id', leagueId)
    .eq('season_id', seasonId);

  if (error) return { success: false, error: error.message };

  const verified = (data ?? []).filter(
    (r: any) =>
      r.games?.status === 'completed' &&
      r.games?.home_captain_verified === true &&
      r.games?.away_captain_verified === true
  );

  const map = new Map<string, {
    player_id: string;
    player_name: string;
    team_name: string;
    jersey_number: string | null;
    games_played: number;
    goals_against: number;
    saves: number;
    shutouts: number;
    minutes_played: number;
  }>();

  for (const row of verified as any[]) {
    const pid = row.player_id as string;
    const profile = row.profiles as { full_name: string | null; jersey_number: string | null } | null;
    const team = row.teams as { name: string } | null;

    if (!map.has(pid)) {
      map.set(pid, {
        player_id: pid,
        player_name: profile?.full_name ?? 'Unknown',
        team_name: team?.name ?? 'Unknown',
        jersey_number: profile?.jersey_number ?? null,
        games_played: 0,
        goals_against: 0,
        saves: 0,
        shutouts: 0,
        minutes_played: 0,
      });
    }

    const g = map.get(pid)!;
    g.games_played += 1;
    g.goals_against += Number(row.goals_against) || 0;
    g.saves += Number(row.saves) || 0;
    g.shutouts += row.shutout ? 1 : 0;
    g.minutes_played += Number(row.minutes_played) || 0;
  }

  const goalies = Array.from(map.values()).sort((a, b) => {
    const gaaPct = (x: typeof a) => x.games_played > 0 ? x.goals_against / x.games_played : 99;
    return gaaPct(a) - gaaPct(b);
  });

  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headers = ['Rank', 'Goalie', 'Team', '#', 'GP', 'GA', 'SV', 'SO', 'GAA', 'SV%', 'MIN'];
  const rows = goalies.map((g, i) => {
    const gaa = g.games_played > 0 ? (g.goals_against / g.games_played).toFixed(2) : '0.00';
    const svPct = (g.saves + g.goals_against) > 0
      ? ((g.saves / (g.saves + g.goals_against)) * 100).toFixed(1)
      : '0.0';
    return [
      i + 1,
      escape(g.player_name),
      escape(g.team_name),
      escape(g.jersey_number ?? ''),
      g.games_played,
      g.goals_against,
      g.saves,
      g.shutouts,
      gaa,
      svPct,
      g.minutes_played,
    ].join(',');
  });

  const csv = [`# ${seasonName} — Goalie Stats`, headers.join(','), ...rows].join('\n');
  return { success: true, data: csv };
}
