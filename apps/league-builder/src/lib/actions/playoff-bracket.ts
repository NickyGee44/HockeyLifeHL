'use server';

import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import {
  buildGeneratedPlayoffScopes,
  type PlayoffStandingRow,
} from '@/lib/playoffs/bracket-generation';
import { revalidatePath } from 'next/cache';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface PlayoffSeries {
  division_id: string | null;
  division_name: string | null;
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

const OVERALL_BRACKET_KEY = 'overall';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Supabase query builders use different concrete types, so this stays loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDivisionScope(query: any, divisionId: string | null) {
  return divisionId ? query.eq('division_id', divisionId) : query.is('division_id', null);
}

async function getDivisionNameMap(
  supabase: SupabaseServerClient,
  divisionIds: string[],
) {
  if (divisionIds.length === 0) {
    return new Map<string, string>();
  }

  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .in('id', divisionIds);

  return new Map((divisions ?? []).map((division) => [division.id, division.name]));
}

async function finalizeSeasonIfReady(
  supabase: SupabaseServerClient,
  seasonId: string,
) {
  const { count: incompleteCount, error: incompleteError } = await supabase
    .from('playoff_series')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .neq('status', 'completed');

  if (incompleteError || (incompleteCount ?? 0) > 0) {
    return;
  }

  const { data: completedSeries, error: completedError } = await supabase
    .from('playoff_series')
    .select('division_id, round_number, winner_id')
    .eq('season_id', seasonId)
    .eq('status', 'completed')
    .order('round_number', { ascending: false });

  if (completedError || !completedSeries || completedSeries.length === 0) {
    return;
  }

  const championsByScope = new Map<string, string | null>();
  for (const row of completedSeries) {
    const scopeKey = row.division_id ?? OVERALL_BRACKET_KEY;
    if (!championsByScope.has(scopeKey)) {
      championsByScope.set(scopeKey, row.winner_id);
    }
  }

  const championTeamId = championsByScope.size === 1
    ? [...championsByScope.values()][0] ?? null
    : null;

  await supabase
    .from('seasons')
    .update({
      champion_team_id: championTeamId,
      status: 'completed',
    })
    .eq('id', seasonId);
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
      id, division_id, round_number, series_number,
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

  const divisionIds = [...new Set(
    seriesRows
      .map((row) => row.division_id)
      .filter((value): value is string => Boolean(value)),
  )];
  const divisionNameById = await getDivisionNameMap(supabase, divisionIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: PlayoffSeries[] = seriesRows.map((row: any) => ({
    division_id: row.division_id ?? null,
    division_name: row.division_id ? divisionNameById.get(row.division_id) ?? null : null,
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
    supabase
      .from('standings_config')
      .select('playoff_teams_total, playoff_teams_per_division, use_division_playoffs')
      .eq('season_id', seasonId)
      .maybeSingle(),
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

  const generationResult = buildGeneratedPlayoffScopes(
    standings as PlayoffStandingRow[],
    {
      playoffTeamsTotal: configResult.data?.playoff_teams_total,
      playoffTeamsPerDivision: configResult.data?.playoff_teams_per_division,
      useDivisionPlayoffs: configResult.data?.use_division_playoffs,
    },
  );

  if (!generationResult.success) {
    return { success: false, error: generationResult.error };
  }

  const seriesToInsert = generationResult.data.flatMap((scope) =>
    scope.series.map((series) => ({
      league_id: leagueId,
      season_id: seasonId,
      division_id: scope.divisionId,
      round_number: series.round_number,
      series_number: series.series_number,
      high_seed_id: series.high_seed_id,
      low_seed_id: series.low_seed_id,
      high_seed_wins: series.high_seed_wins,
      low_seed_wins: series.low_seed_wins,
      winner_id: series.winner_id,
      status: series.status,
    })),
  );

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

    let nextSeriesQuery = supabase
      .from('playoff_series')
      .select('*')
      .eq('season_id', seasonId)
      .eq('round_number', nextRound)
      .eq('series_number', nextSeriesNumber);

    nextSeriesQuery = applyDivisionScope(nextSeriesQuery, series.division_id);

    const { data: nextSeries } = await nextSeriesQuery.maybeSingle();

    if (nextSeries) {
      // Odd series number → high seed slot, even → low seed slot
      const isHighSlot = series.series_number % 2 === 1;
      await supabase
        .from('playoff_series')
        .update(isHighSlot ? { high_seed_id: winnerId } : { low_seed_id: winnerId })
        .eq('id', nextSeries.id);
    }

    await finalizeSeasonIfReady(supabase, seasonId);
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/seasons/${seasonId}`);
  return { success: true, data: undefined };
}

export async function schedulePlayoffGame(
  leagueId: string,
  seasonId: string,
  seriesId: string,
  scheduledAt: string,
  location: string
): Promise<ActionResult<{ gameId: string }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) return { success: false, error: 'Not authorized' };

  const supabase = await createClient();

  // Get series to confirm it has teams and belongs to this league
  const { data: series, error: seriesError } = await supabase
    .from('playoff_series')
    .select('*')
    .eq('id', seriesId)
    .eq('season_id', seasonId)
    .eq('league_id', leagueId)
    .single();

  if (seriesError || !series) return { success: false, error: 'Series not found' };
  if (!series.high_seed_id || !series.low_seed_id) {
    return { success: false, error: 'Cannot schedule a game — both teams are not yet determined' };
  }
  if (series.status === 'completed') {
    return { success: false, error: 'Series is already complete' };
  }

  const { data: game, error: insertError } = await supabase
    .from('games')
    .insert({
      league_id: leagueId,
      season_id: seasonId,
      home_team_id: series.high_seed_id,
      away_team_id: series.low_seed_id,
      division_id: series.division_id ?? null,
      scheduled_at: scheduledAt,
      location: location || null,
      game_type: 'playoff',
      playoff_series_id: seriesId,
      round_number: series.round_number,
      status: 'scheduled',
    })
    .select('id')
    .single();

  if (insertError || !game) {
    return { success: false, error: insertError?.message ?? 'Failed to create game' };
  }

  // Mark series as in_progress if it was pending
  if (series.status === 'pending') {
    await supabase
      .from('playoff_series')
      .update({ status: 'in_progress' })
      .eq('id', seriesId);
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/seasons/${seasonId}`);
  return { success: true, data: { gameId: game.id } };
}
