'use server';

import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { revalidatePath } from 'next/cache';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface PlayoffSeries {
  id: string;
  round_number: number;
  series_number: number;
  high_seed_id: string | null;
  low_seed_id: string | null;
  high_seed_wins: number;
  low_seed_wins: number;
  winner_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  // Joined
  high_seed_name?: string;
  low_seed_name?: string;
  winner_name?: string;
}

export interface PlayoffBracket {
  format: string;
  series: PlayoffSeries[];
  rounds: number;
}

export async function getPlayoffBracket(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<PlayoffBracket | null>> {
  const supabase = await createClient();

  // Get season format
  const { data: season } = await supabase
    .from('seasons')
    .select('playoff_format')
    .eq('id', seasonId)
    .single();

  if (!season) return { success: false, error: 'Season not found' };

  // Get series with team names
  const { data: seriesRows, error } = await supabase
    .from('playoff_series')
    .select(`
      id, round_number, series_number,
      high_seed_id, low_seed_id,
      high_seed_wins, low_seed_wins,
      winner_id, status,
      high_seed:teams!playoff_series_high_seed_id_fkey(name),
      low_seed:teams!playoff_series_low_seed_id_fkey(name),
      winner:teams!playoff_series_winner_id_fkey(name)
    `)
    .eq('season_id', seasonId)
    .order('round_number')
    .order('series_number');

  if (error) return { success: false, error: error.message };

  if (!seriesRows || seriesRows.length === 0) {
    return { success: true, data: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: PlayoffSeries[] = seriesRows.map((row: any) => ({
    id: row.id,
    round_number: row.round_number,
    series_number: row.series_number,
    high_seed_id: row.high_seed_id,
    low_seed_id: row.low_seed_id,
    high_seed_wins: row.high_seed_wins,
    low_seed_wins: row.low_seed_wins,
    winner_id: row.winner_id,
    status: row.status,
    high_seed_name: row.high_seed?.name,
    low_seed_name: row.low_seed?.name,
    winner_name: row.winner?.name,
  }));

  const rounds = Math.max(...series.map((s) => s.round_number));

  return {
    success: true,
    data: {
      format: season.playoff_format || 'single_elimination',
      series,
      rounds,
    },
  };
}

export async function generatePlayoffBracket(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<{ seriesCreated: number }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) return { success: false, error: 'Not authorized' };

  const supabase = await createClient();

  // Get season + standings config
  const [seasonResult, configResult] = await Promise.all([
    supabase.from('seasons').select('playoff_format, status').eq('id', seasonId).single(),
    supabase.from('standings_config').select('playoff_teams_total').eq('season_id', seasonId).maybeSingle(),
  ]);

  if (!seasonResult.data) return { success: false, error: 'Season not found' };

  const format = seasonResult.data.playoff_format || 'single_elimination';
  if (format === 'none') return { success: false, error: 'This season has no playoffs configured' };

  // Clear existing bracket
  await supabase.from('playoff_series').delete().eq('season_id', seasonId);

  // Get team standings
  const { data: standings, error: standingsError } = await supabase.rpc('get_team_standings', {
    check_season_id: seasonId,
    check_league_id: leagueId,
  });

  if (standingsError || !standings || standings.length === 0) {
    return { success: false, error: 'No standings data available. Make sure games have been played.' };
  }

  const playoffCount = configResult.data?.playoff_teams_total ?? Math.min(8, standings.length);
  const playoffTeams = standings.slice(0, playoffCount);

  if (playoffTeams.length < 2) {
    return { success: false, error: 'Need at least 2 teams for playoffs' };
  }

  // Round up to next power of 2 for bracket size
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(playoffTeams.length)));
  const totalRounds = Math.log2(bracketSize);

  // Create Round 1 matchups: 1 vs N, 2 vs N-1, etc.
  const seriesToInsert: {
    league_id: string;
    season_id: string;
    round_number: number;
    series_number: number;
    high_seed_id: string | null;
    low_seed_id: string | null;
    status: string;
  }[] = [];

  const firstRoundMatchups = bracketSize / 2;
  for (let i = 0; i < firstRoundMatchups; i++) {
    const highSeedIndex = i;
    const lowSeedIndex = bracketSize - 1 - i;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highSeedTeam = (playoffTeams as any[])[highSeedIndex];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lowSeedTeam = (playoffTeams as any[])[lowSeedIndex];

    seriesToInsert.push({
      league_id: leagueId,
      season_id: seasonId,
      round_number: 1,
      series_number: i + 1,
      high_seed_id: highSeedTeam?.team_id ?? null,
      low_seed_id: lowSeedTeam?.team_id ?? null,
      status: highSeedTeam && lowSeedTeam ? 'pending' : 'completed',
    });
  }

  // Create placeholder series for subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const seriesInRound = Math.pow(2, totalRounds - round);
    for (let s = 1; s <= seriesInRound; s++) {
      seriesToInsert.push({
        league_id: leagueId,
        season_id: seasonId,
        round_number: round,
        series_number: s,
        high_seed_id: null,
        low_seed_id: null,
        status: 'pending',
      });
    }
  }

  const { error: insertError } = await supabase.from('playoff_series').insert(seriesToInsert);
  if (insertError) return { success: false, error: `Failed to create bracket: ${insertError.message}` };

  // Update season status to playoffs
  await supabase.from('seasons').update({ status: 'playoffs' }).eq('id', seasonId);

  revalidatePath(`/dashboard/leagues/${leagueId}/seasons/${seasonId}`);

  return { success: true, data: { seriesCreated: seriesToInsert.length } };
}

export async function recordSeriesWin(
  leagueId: string,
  seasonId: string,
  seriesId: string,
  winningSide: 'high' | 'low'
): Promise<ActionResult> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) return { success: false, error: 'Not authorized' };

  const supabase = await createClient();

  const { data: series, error } = await supabase
    .from('playoff_series')
    .select('*')
    .eq('id', seriesId)
    .eq('season_id', seasonId)
    .single();

  if (error || !series) return { success: false, error: 'Series not found' };
  if (series.status === 'completed') return { success: false, error: 'Series already completed' };

  const formatResult = await supabase
    .from('seasons')
    .select('playoff_format')
    .eq('id', seasonId)
    .single();
  const format = formatResult.data?.playoff_format;
  const winsToAdvance = format === 'best_of_5' ? 3 : format === 'best_of_3' ? 2 : 1;

  const newHighWins = series.high_seed_wins + (winningSide === 'high' ? 1 : 0);
  const newLowWins = series.low_seed_wins + (winningSide === 'low' ? 1 : 0);

  const highWon = newHighWins >= winsToAdvance;
  const lowWon = newLowWins >= winsToAdvance;
  const winnerId = highWon ? series.high_seed_id : lowWon ? series.low_seed_id : null;
  const newStatus: string = highWon || lowWon ? 'completed' : 'in_progress';

  await supabase
    .from('playoff_series')
    .update({
      high_seed_wins: newHighWins,
      low_seed_wins: newLowWins,
      winner_id: winnerId,
      status: newStatus,
    })
    .eq('id', seriesId);

  // If series completed, advance winner to next round
  if (winnerId) {
    const nextRound = series.round_number + 1;
    const nextSeriesNumber = Math.ceil(series.series_number / 2);

    const { data: nextSeries } = await supabase
      .from('playoff_series')
      .select('*')
      .eq('season_id', seasonId)
      .eq('round_number', nextRound)
      .eq('series_number', nextSeriesNumber)
      .maybeSingle();

    if (nextSeries) {
      // Odd series number → high seed slot, even → low seed slot
      const isHighSlot = series.series_number % 2 === 1;
      await supabase
        .from('playoff_series')
        .update(isHighSlot ? { high_seed_id: winnerId } : { low_seed_id: winnerId })
        .eq('id', nextSeries.id);
    }

    // Check if this was the championship (no next round)
    const { data: nextRoundCheck } = await supabase
      .from('playoff_series')
      .select('id')
      .eq('season_id', seasonId)
      .eq('round_number', nextRound)
      .limit(1);

    if (!nextRoundCheck || nextRoundCheck.length === 0) {
      // Champion! Mark season complete
      await supabase
        .from('seasons')
        .update({ champion_team_id: winnerId, status: 'completed' })
        .eq('id', seasonId);
    }
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/seasons/${seasonId}`);
  return { success: true, data: undefined };
}
