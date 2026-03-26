'use server';

import { revalidatePath } from 'next/cache';
import type { Database } from '@hockey-life/database/types';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import {
  buildGeneratedPlayoffScopes,
  type PlayoffStandingRow,
} from '@/lib/playoffs/bracket-generation';
import {
  assignPlayoffSeriesToSlots,
  buildPlayoffSchedulingSlots,
} from '@/lib/playoffs/scheduling';
import {
  calculateDivisionBalance,
  type DivisionBalanceResult,
  type DivisionRecommendation,
} from '@/lib/ratings';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

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
  high_seed_name?: string;
  low_seed_name?: string;
  winner_name?: string;
  next_game_id?: string | null;
  next_game_at?: string | null;
  next_game_location?: string | null;
  scheduled_game_count?: number;
}

export interface PlayoffBracket {
  format: string;
  series: PlayoffSeries[];
  rounds: number;
}

export interface PlayoffVenueOption {
  id: string;
  name: string;
  address: string | null;
  numberOfRinks: number | null;
}

type GeneratedBracketResult = {
  seriesCreated: number;
  bracket: PlayoffBracket;
  openingSeries: PlayoffSeries[];
  usedDivisionPlayoffs: boolean;
};

type ManualPlayoffGameInput = {
  seriesId: string;
  scheduledAt: string;
  venueId?: string | null;
  location?: string | null;
};

type AuthenticatedSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ServiceRoleSupabaseClient = ReturnType<typeof createServiceRoleClient>;
type SupabaseQueryClient = AuthenticatedSupabaseClient | ServiceRoleSupabaseClient;

type PlayoffSeriesCapabilities = {
  hasDivisionScope: boolean;
};

type ScheduledPlayoffGameSummary = {
  count: number;
  nextGameId: string | null;
  nextGameAt: string | null;
  nextGameLocation: string | null;
};

const OVERALL_BRACKET_KEY = 'overall';
const PLAYOFF_SERIES_DIVISION_ID_MISSING =
  "Could not find the 'division_id' column of 'playoff_series' in the schema cache";
const PLAYOFF_BRACKET_WRITE_FAILURE =
  'Playoff bracket changes are temporarily unavailable. Please try again after playoff access is updated.';
const PLAYOFF_GAME_WRITE_FAILURE =
  'Playoff game scheduling is temporarily unavailable. Please try again after playoff access is updated.';
const PLAYOFF_RESULT_WRITE_FAILURE =
  'Playoff results could not be saved right now. Please try again in a moment.';

function isMissingPlayoffSeriesDivisionScopeError(
  error: { message?: string | null } | null | undefined,
) {
  return error?.message?.includes(PLAYOFF_SERIES_DIVISION_ID_MISSING) ?? false;
}

function isPlayoffSeriesRlsError(
  error: { message?: string | null } | null | undefined,
) {
  const message = error?.message?.toLowerCase() ?? '';
  return message.includes('row-level security') && message.includes('playoff_series');
}

function logPlayoffWriteError(context: string, error: unknown) {
  console.error(`[playoff-bracket] ${context}:`, error);
}

function normalizePlayoffWriteError(
  fallbackMessage: string,
  error: { message?: string | null } | null | undefined,
) {
  if (isMissingPlayoffSeriesDivisionScopeError(error)) {
    return 'This environment is missing division-scoped playoff support. Apply the playoff_series division migration, then try again.';
  }

  if (isPlayoffSeriesRlsError(error)) {
    return fallbackMessage;
  }

  return fallbackMessage;
}

async function getPlayoffSeriesCapabilities(
  supabase: SupabaseQueryClient,
): Promise<PlayoffSeriesCapabilities> {
  const { error } = await supabase
    .from('playoff_series')
    .select('id, division_id')
    .limit(1);

  if (isMissingPlayoffSeriesDivisionScopeError(error)) {
    return { hasDivisionScope: false };
  }

  return { hasDivisionScope: true };
}

// Supabase query builders use different concrete types, so this stays loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDivisionScope(query: any, divisionId: string | null, capabilities: PlayoffSeriesCapabilities) {
  if (!capabilities.hasDivisionScope) {
    return query;
  }

  return divisionId ? query.eq('division_id', divisionId) : query.is('division_id', null);
}

async function getDivisionNameMap(
  supabase: SupabaseQueryClient,
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

async function getScheduledPlayoffGameMap(
  supabase: SupabaseQueryClient,
  leagueId: string,
  seasonId: string,
) {
  const { data: games } = await supabase
    .from('games')
    .select('id, playoff_series_id, scheduled_at, location, status')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('game_type', 'playoff')
    .not('playoff_series_id', 'is', null)
    .order('scheduled_at', { ascending: true });

  const now = Date.now();
  const gameMap = new Map<string, ScheduledPlayoffGameSummary>();

  for (const game of games ?? []) {
    if (!game.playoff_series_id || game.status === 'cancelled') {
      continue;
    }

    const current = gameMap.get(game.playoff_series_id) ?? {
      count: 0,
      nextGameId: null,
      nextGameAt: null,
      nextGameLocation: null,
    };

    current.count += 1;

    const isUpcoming = new Date(game.scheduled_at).getTime() >= now && game.status !== 'completed';
    if (isUpcoming && (!current.nextGameAt || new Date(game.scheduled_at).getTime() < new Date(current.nextGameAt).getTime())) {
      current.nextGameId = game.id;
      current.nextGameAt = game.scheduled_at;
      current.nextGameLocation = game.location ?? null;
    }

    gameMap.set(game.playoff_series_id, current);
  }

  return gameMap;
}

async function fetchPlayoffBracketData(
  supabase: SupabaseQueryClient,
  leagueId: string,
  seasonId: string,
  capabilities: PlayoffSeriesCapabilities,
): Promise<ActionResult<PlayoffBracket | null>> {
  const { data: season } = await supabase
    .from('seasons')
    .select('playoff_format')
    .eq('id', seasonId)
    .single();

  if (!season) {
    return { success: false, error: 'Season not found' };
  }

  const seriesSelect = capabilities.hasDivisionScope
    ? `
      id, division_id, round_number, series_number,
      high_seed_id, low_seed_id,
      high_seed_wins, low_seed_wins,
      winner_id, status,
      high_seed:teams!playoff_series_high_seed_id_fkey(name),
      low_seed:teams!playoff_series_low_seed_id_fkey(name),
      winner:teams!playoff_series_winner_id_fkey(name)
    `
    : `
      id, round_number, series_number,
      high_seed_id, low_seed_id,
      high_seed_wins, low_seed_wins,
      winner_id, status,
      high_seed:teams!playoff_series_high_seed_id_fkey(name),
      low_seed:teams!playoff_series_low_seed_id_fkey(name),
      winner:teams!playoff_series_winner_id_fkey(name)
    `;

  // The selected shape changes when older environments still lack division_id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playoffSeriesTable: any = supabase.from('playoff_series');
  const { data: seriesRows, error } = await playoffSeriesTable
    .select(seriesSelect)
    .eq('season_id', seasonId)
    .order('round_number')
    .order('series_number');

  if (error) {
    return { success: false, error: error.message };
  }

  if (!seriesRows || seriesRows.length === 0) {
    return { success: true, data: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRowsList = (seriesRows ?? []) as any[];
  const divisionIds = capabilities.hasDivisionScope
    ? [...new Set(
      seriesRowsList
        .map((row: { division_id?: string | null }) => row.division_id)
        .filter((value: string | null | undefined): value is string => Boolean(value)),
    )]
    : [];
  const [divisionNameById, scheduledGamesBySeriesId] = await Promise.all([
    getDivisionNameMap(supabase, divisionIds),
    getScheduledPlayoffGameMap(supabase, leagueId, seasonId),
  ]);

  const series: PlayoffSeries[] = seriesRowsList.map((row: {
    division_id?: string | null;
    id: string;
    round_number: number;
    series_number: number;
    high_seed_id: string | null;
    low_seed_id: string | null;
    high_seed_wins: number;
    low_seed_wins: number;
    winner_id: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    high_seed?: { name?: string | null } | null;
    low_seed?: { name?: string | null } | null;
    winner?: { name?: string | null } | null;
  }) => {
    const scheduled = scheduledGamesBySeriesId.get(row.id);

    return {
      division_id: capabilities.hasDivisionScope ? row.division_id ?? null : null,
      division_name: capabilities.hasDivisionScope && row.division_id
        ? divisionNameById.get(row.division_id) ?? null
        : null,
      id: row.id,
      round_number: row.round_number,
      series_number: row.series_number,
      high_seed_id: row.high_seed_id,
      low_seed_id: row.low_seed_id,
      high_seed_wins: row.high_seed_wins,
      low_seed_wins: row.low_seed_wins,
      winner_id: row.winner_id,
      status: row.status,
      high_seed_name: row.high_seed?.name ?? undefined,
      low_seed_name: row.low_seed?.name ?? undefined,
      winner_name: row.winner?.name ?? undefined,
      next_game_id: scheduled?.nextGameId ?? null,
      next_game_at: scheduled?.nextGameAt ?? null,
      next_game_location: scheduled?.nextGameLocation ?? null,
      scheduled_game_count: scheduled?.count ?? 0,
    };
  });

  return {
    success: true,
    data: {
      format: season.playoff_format || 'single_elimination',
      rounds: Math.max(...series.map((entry) => entry.round_number)),
      series,
    },
  };
}

function getOpeningSeries(bracket: PlayoffBracket | null) {
  if (!bracket) {
    return [];
  }

  return bracket.series.filter((series) =>
    series.round_number === 1
    && Boolean(series.high_seed_id)
    && Boolean(series.low_seed_id)
    && series.status !== 'completed'
    && (series.scheduled_game_count ?? 0) === 0,
  );
}

function dedupeRecommendations(recommendations: DivisionRecommendation[]) {
  const byTeamId = new Map<string, DivisionRecommendation>();

  for (const recommendation of recommendations) {
    const existing = byTeamId.get(recommendation.teamId);
    if (!existing || recommendation.impact > existing.impact) {
      byTeamId.set(recommendation.teamId, recommendation);
    }
  }

  return [...byTeamId.values()].sort((left, right) => right.impact - left.impact);
}

function addDays(dateString: string, days: number) {
  const value = new Date(`${dateString}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().split('T')[0];
}

async function revalidatePlayoffPaths(
  supabase: SupabaseQueryClient,
  leagueId: string,
  seasonId: string,
) {
  revalidatePath(`/dashboard/leagues/${leagueId}`);
  revalidatePath(`/dashboard/leagues/${leagueId}/schedule`);
  revalidatePath(`/dashboard/leagues/${leagueId}/seasons/${seasonId}`);

  const { data: league } = await supabase
    .from('leagues')
    .select('slug')
    .eq('id', leagueId)
    .maybeSingle();

  if (league?.slug) {
    revalidatePath(`/${league.slug}/playoffs`);
    revalidatePath(`/${league.slug}/schedule`);
  }
}

async function finalizeSeasonIfReady(
  supabase: SupabaseQueryClient,
  seasonId: string,
  capabilities: PlayoffSeriesCapabilities,
) {
  const { count: incompleteCount, error: incompleteError } = await supabase
    .from('playoff_series')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .neq('status', 'completed');

  if (incompleteError || (incompleteCount ?? 0) > 0) {
    return;
  }

  const completedSeriesSelect = capabilities.hasDivisionScope
    ? 'division_id, round_number, winner_id'
    : 'round_number, winner_id';
  // The selected shape changes when older environments still lack division_id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedSeriesQuery: any = supabase
    .from('playoff_series')
    .select(completedSeriesSelect);
  const { data: completedSeries, error: completedError } = await completedSeriesQuery
    .eq('season_id', seasonId)
    .eq('status', 'completed')
    .order('round_number', { ascending: false });

  if (completedError || !completedSeries || completedSeries.length === 0) {
    return;
  }

  const championsByScope = new Map<string, string | null>();
  const completedSeriesRows = completedSeries as unknown as Array<{
    division_id?: string | null;
    winner_id: string | null;
  }>;
  for (const row of completedSeriesRows) {
    const scopeKey = capabilities.hasDivisionScope
      ? row.division_id ?? OVERALL_BRACKET_KEY
      : OVERALL_BRACKET_KEY;
    if (!championsByScope.has(scopeKey)) {
      championsByScope.set(scopeKey, row.winner_id);
    }
  }

  const championTeamId = championsByScope.size === 1
    ? [...championsByScope.values()][0] ?? null
    : null;

  const { error: seasonUpdateError } = await supabase
    .from('seasons')
    .update({
      champion_team_id: championTeamId,
      status: 'completed',
    })
    .eq('id', seasonId);

  if (seasonUpdateError) {
    throw new Error(seasonUpdateError.message);
  }
}

async function createPlayoffGamesFromManualEntries(
  supabase: SupabaseQueryClient,
  leagueId: string,
  seasonId: string,
  entries: ManualPlayoffGameInput[],
) {
  if (entries.length === 0) {
    return { scheduled: 0, skippedIds: [] as string[] };
  }

  const seriesIds = entries.map((entry) => entry.seriesId);
  const { data: seriesRows, error: seriesError } = await supabase
    .from('playoff_series')
    .select('*')
    .eq('season_id', seasonId)
    .eq('league_id', leagueId)
    .in('id', seriesIds);

  if (seriesError) {
    throw new Error(seriesError.message);
  }

  const existingGameMap = new Map<string, number>();
  const { data: existingGames } = await supabase
    .from('games')
    .select('playoff_series_id')
    .eq('season_id', seasonId)
    .eq('league_id', leagueId)
    .in('playoff_series_id', seriesIds)
    .neq('status', 'cancelled');

  for (const game of existingGames ?? []) {
    if (!game.playoff_series_id) {
      continue;
    }
    existingGameMap.set(
      game.playoff_series_id,
      (existingGameMap.get(game.playoff_series_id) ?? 0) + 1,
    );
  }

  const seriesById = new Map((seriesRows ?? []).map((row) => [row.id, row]));
  const insertRows: Array<Database['public']['Tables']['games']['Insert']> = [];
  const skippedIds: string[] = [];

  for (const entry of entries) {
    const series = seriesById.get(entry.seriesId);
    if (!series || !series.high_seed_id || !series.low_seed_id || series.status === 'completed') {
      skippedIds.push(entry.seriesId);
      continue;
    }

    if ((existingGameMap.get(entry.seriesId) ?? 0) > 0) {
      skippedIds.push(entry.seriesId);
      continue;
    }

    insertRows.push({
      league_id: leagueId,
      season_id: seasonId,
      home_team_id: series.high_seed_id,
      away_team_id: series.low_seed_id,
      division_id: series.division_id ?? null,
      scheduled_at: entry.scheduledAt,
      location: entry.location || null,
      game_type: 'playoff',
      playoff_series_id: entry.seriesId,
      round_number: series.round_number,
      status: 'scheduled',
    });
  }

  if (insertRows.length === 0) {
    return { scheduled: 0, skippedIds };
  }

  const { data: insertedGames, error: insertError } = await supabase
    .from('games')
    .insert(insertRows)
    .select('playoff_series_id');

  if (insertError) {
    throw new Error(insertError.message);
  }

  const insertedSeriesIds = [...new Set(
    (insertedGames ?? [])
      .map((game) => game.playoff_series_id)
      .filter((value): value is string => Boolean(value)),
  )];

  if (insertedSeriesIds.length > 0) {
    await supabase
      .from('playoff_series')
      .update({ status: 'in_progress' })
      .in('id', insertedSeriesIds)
      .eq('status', 'pending');
  }

  return { scheduled: insertRows.length, skippedIds };
}

export async function getPlayoffBracket(
  leagueId: string,
  seasonId: string,
): Promise<ActionResult<PlayoffBracket | null>> {
  const supabase = await createClient();
  const capabilities = await getPlayoffSeriesCapabilities(supabase);
  return fetchPlayoffBracketData(supabase, leagueId, seasonId, capabilities);
}

export async function getPlayoffGenerationPreview(
  leagueId: string,
  seasonId: string,
): Promise<ActionResult<{ balance: DivisionBalanceResult | null; recommendations: DivisionRecommendation[] }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  const serviceClient = createServiceRoleClient();

  try {
    const balance = await calculateDivisionBalance(serviceClient, leagueId, seasonId);
    const recommendations = dedupeRecommendations(balance.recommendations);
    return {
      success: true,
      data: {
        balance,
        recommendations,
      },
    };
  } catch {
    return {
      success: true,
      data: {
        balance: null,
        recommendations: [],
      },
    };
  }
}

export async function applySuggestedDivisionBalanceMoves(
  leagueId: string,
  seasonId: string,
): Promise<ActionResult<{ appliedCount: number; recommendations: DivisionRecommendation[] }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  const serviceClient = createServiceRoleClient();

  let balance: DivisionBalanceResult;
  try {
    balance = await calculateDivisionBalance(serviceClient, leagueId, seasonId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to calculate division balance',
    };
  }

  const recommendations = dedupeRecommendations(balance.recommendations);
  if (recommendations.length === 0) {
    return { success: true, data: { appliedCount: 0, recommendations: [] } };
  }

  let appliedCount = 0;
  for (const recommendation of recommendations) {
    const { error } = await serviceClient
      .from('teams')
      .update({
        division_id: recommendation.toDivisionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendation.teamId)
      .eq('league_id', leagueId);

    if (!error) {
      appliedCount += 1;
    }
  }

  const supabase = await createClient();
  await revalidatePlayoffPaths(supabase, leagueId, seasonId);
  revalidatePath(`/dashboard/leagues/${leagueId}/divisions`);
  revalidatePath(`/dashboard/leagues/${leagueId}/teams`);
  revalidatePath(`/dashboard/leagues/${leagueId}/ratings`);

  return {
    success: true,
    data: {
      appliedCount,
      recommendations,
    },
  };
}

export async function generatePlayoffBracket(
  leagueId: string,
  seasonId: string,
  options?: { forceDivisionPlayoffs?: boolean },
): Promise<ActionResult<GeneratedBracketResult>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();
  const capabilities = await getPlayoffSeriesCapabilities(supabase);

  const [seasonResult, configResult] = await Promise.all([
    supabase.from('seasons').select('playoff_format').eq('id', seasonId).single(),
    supabase
      .from('standings_config')
      .select('playoff_teams_total, playoff_teams_per_division, use_division_playoffs')
      .eq('season_id', seasonId)
      .maybeSingle(),
  ]);

  if (!seasonResult.data) {
    return { success: false, error: 'Season not found' };
  }

  const format = seasonResult.data.playoff_format || 'single_elimination';
  if (format === 'none') {
    return { success: false, error: 'This season has no playoffs configured' };
  }

  const { data: standings, error: standingsError } = await supabase.rpc('get_team_standings', {
    check_season_id: seasonId,
    check_league_id: leagueId,
  });

  if (standingsError || !standings || standings.length === 0) {
    return {
      success: false,
      error: 'No standings data available. Make sure games have been played.',
    };
  }

  const generationResult = buildGeneratedPlayoffScopes(
    standings as PlayoffStandingRow[],
    {
      playoffTeamsTotal: configResult.data?.playoff_teams_total,
      playoffTeamsPerDivision: configResult.data?.playoff_teams_per_division,
      useDivisionPlayoffs: options?.forceDivisionPlayoffs ?? configResult.data?.use_division_playoffs,
    },
  );

  if (!generationResult.success) {
    return { success: false, error: generationResult.error };
  }

  const needsDivisionScope = generationResult.data.some((scope) => scope.divisionId !== null);
  if (needsDivisionScope && !capabilities.hasDivisionScope) {
    return {
      success: false,
      error:
        'This environment is missing division-scoped playoff support. Apply the playoff_series division migration, then try again.',
    };
  }

  const { error: deleteGamesError } = await serviceClient
    .from('games')
    .delete()
    .eq('season_id', seasonId)
    .eq('game_type', 'playoff');

  if (deleteGamesError) {
    logPlayoffWriteError('delete existing playoff games', deleteGamesError);
    return { success: false, error: PLAYOFF_BRACKET_WRITE_FAILURE };
  }

  const { error: deleteSeriesError } = await serviceClient
    .from('playoff_series')
    .delete()
    .eq('season_id', seasonId);

  if (deleteSeriesError) {
    logPlayoffWriteError('delete existing playoff series', deleteSeriesError);
    return { success: false, error: PLAYOFF_BRACKET_WRITE_FAILURE };
  }

  const seriesToInsert = generationResult.data.flatMap((scope) =>
    scope.series.map((series) => ({
      league_id: leagueId,
      season_id: seasonId,
      ...(capabilities.hasDivisionScope ? { division_id: scope.divisionId } : {}),
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

  const { error: insertError } = await serviceClient.from('playoff_series').insert(seriesToInsert);
  if (insertError) {
    logPlayoffWriteError('insert playoff series', insertError);
    return {
      success: false,
      error: normalizePlayoffWriteError(PLAYOFF_BRACKET_WRITE_FAILURE, insertError),
    };
  }

  const { error: seasonUpdateError } = await serviceClient
    .from('seasons')
    .update({ status: 'playoffs' })
    .eq('id', seasonId);

  if (seasonUpdateError) {
    logPlayoffWriteError('update season to playoffs', seasonUpdateError);
    return { success: false, error: PLAYOFF_BRACKET_WRITE_FAILURE };
  }

  const bracketResult = await fetchPlayoffBracketData(serviceClient, leagueId, seasonId, capabilities);
  if (!bracketResult.success || !bracketResult.data) {
    return {
      success: false,
      error: bracketResult.success ? 'Failed to load the generated playoff bracket' : bracketResult.error,
    };
  }

  await revalidatePlayoffPaths(supabase, leagueId, seasonId);

  return {
    success: true,
    data: {
      seriesCreated: seriesToInsert.length,
      bracket: bracketResult.data,
      openingSeries: getOpeningSeries(bracketResult.data),
      usedDivisionPlayoffs: needsDivisionScope,
    },
  };
}

export async function autoScheduleOpeningPlayoffGames(
  leagueId: string,
  seasonId: string,
  startDate: string,
): Promise<ActionResult<{ scheduled: number; unscheduledSeries: string[] }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();
  const capabilities = await getPlayoffSeriesCapabilities(supabase);
  const bracketResult = await fetchPlayoffBracketData(supabase, leagueId, seasonId, capabilities);

  if (!bracketResult.success) {
    return { success: false, error: bracketResult.error };
  }

  const openingSeries = getOpeningSeries(bracketResult.data);
  if (openingSeries.length === 0) {
    return { success: false, error: 'No unscheduled opening-round playoff series were found.' };
  }

  const endDate = addDays(startDate, 45);
  const [venuesResult, availabilityResult, blackoutResult, existingGamesResult] = await Promise.all([
    supabase
      .from('venues')
      .select('id, name, address, number_of_rinks')
      .eq('league_id', leagueId)
      .order('name'),
    supabase
      .from('venue_availability')
      .select('venue_id, day_of_week, start_time, is_available, max_games')
      .eq('league_id', leagueId)
      .or(`season_id.eq.${seasonId},season_id.is.null`),
    supabase
      .from('venue_blackout_dates')
      .select('venue_id, blackout_date, start_time, end_time')
      .eq('league_id', leagueId)
      .gte('blackout_date', startDate)
      .lte('blackout_date', endDate),
    supabase
      .from('games')
      .select('scheduled_at, location, status')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .gte('scheduled_at', `${startDate}T00:00:00`),
  ]);

  if (venuesResult.error || !venuesResult.data || venuesResult.data.length === 0) {
    return { success: false, error: 'No league venues are configured for playoff scheduling.' };
  }

  if (availabilityResult.error || !availabilityResult.data || availabilityResult.data.length === 0) {
    return { success: false, error: 'No recurring ice times are configured. Add venue schedule slots first.' };
  }

  const slots = buildPlayoffSchedulingSlots({
    venues: (venuesResult.data ?? []).map((venue) => ({
      id: venue.id,
      name: venue.name,
      numberOfRinks: venue.number_of_rinks ?? 1,
    })),
    availability: (availabilityResult.data ?? []).map((row) => ({
      venueId: row.venue_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      isAvailable: row.is_available ?? true,
      maxGames: row.max_games,
    })),
    blackouts: (blackoutResult.data ?? []).map((row) => ({
      venueId: row.venue_id,
      blackoutDate: row.blackout_date,
      startTime: row.start_time,
      endTime: row.end_time,
    })),
    existingGames: (existingGamesResult.data ?? []).map((game) => ({
      scheduledAt: game.scheduled_at,
      location: game.location,
      status: game.status,
    })),
    startDate,
    endDate,
  });

  if (slots.length === 0) {
    return { success: false, error: 'No available ice slots were found in the selected window.' };
  }

  const { assignments, unscheduledSeriesIds } = assignPlayoffSeriesToSlots(
    openingSeries.map((series) => ({ id: series.id })),
    slots,
  );

  let result;
  try {
    result = await createPlayoffGamesFromManualEntries(
      serviceClient,
      leagueId,
      seasonId,
      assignments.map((entry) => ({
        seriesId: entry.seriesId,
        scheduledAt: entry.scheduledAt,
        venueId: entry.venueId,
        location: entry.location,
      })),
    );
  } catch (error) {
    logPlayoffWriteError('auto schedule opening playoff games', error);
    return { success: false, error: PLAYOFF_GAME_WRITE_FAILURE };
  }

  await revalidatePlayoffPaths(supabase, leagueId, seasonId);

  const unscheduledNameMap = new Map(
    openingSeries.map((series) => [
      series.id,
      `${series.high_seed_name ?? 'TBD'} vs ${series.low_seed_name ?? 'TBD'}`,
    ]),
  );

  return {
    success: true,
    data: {
      scheduled: result.scheduled,
      unscheduledSeries: [...new Set([...unscheduledSeriesIds, ...result.skippedIds])]
        .map((id) => unscheduledNameMap.get(id) ?? id),
    },
  };
}

export async function scheduleOpeningPlayoffGames(
  leagueId: string,
  seasonId: string,
  schedules: ManualPlayoffGameInput[],
): Promise<ActionResult<{ scheduled: number; skippedSeries: string[] }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  const validSchedules = schedules.filter((entry) => entry.seriesId && entry.scheduledAt && entry.location);
  if (validSchedules.length === 0) {
    return { success: false, error: 'Add at least one playoff game time before saving.' };
  }

  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();
  let result;

  try {
    result = await createPlayoffGamesFromManualEntries(serviceClient, leagueId, seasonId, validSchedules);
  } catch (error) {
    logPlayoffWriteError('schedule opening playoff games', error);
    return {
      success: false,
      error: PLAYOFF_GAME_WRITE_FAILURE,
    };
  }

  await revalidatePlayoffPaths(supabase, leagueId, seasonId);

  const skippedNameMap = new Map<string, string>();
  const bracket = await fetchPlayoffBracketData(
    supabase,
    leagueId,
    seasonId,
    await getPlayoffSeriesCapabilities(supabase),
  );
  if (bracket.success && bracket.data) {
    for (const series of bracket.data.series) {
      skippedNameMap.set(
        series.id,
        `${series.high_seed_name ?? 'TBD'} vs ${series.low_seed_name ?? 'TBD'}`,
      );
    }
  }

  return {
    success: true,
    data: {
      scheduled: result.scheduled,
      skippedSeries: result.skippedIds.map((id) => skippedNameMap.get(id) ?? id),
    },
  };
}

export async function recordSeriesWin(
  leagueId: string,
  seasonId: string,
  seriesId: string,
  winningSide: 'high' | 'low',
): Promise<ActionResult> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();
  const capabilities = await getPlayoffSeriesCapabilities(supabase);

  const { data: series, error } = await serviceClient
    .from('playoff_series')
    .select('*')
    .eq('id', seriesId)
    .eq('season_id', seasonId)
    .single();

  if (error || !series) {
    return { success: false, error: 'Series not found' };
  }
  if (series.status === 'completed') {
    return { success: false, error: 'Series already completed' };
  }

  const formatResult = await serviceClient
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

  const { error: updateSeriesError } = await serviceClient
    .from('playoff_series')
    .update({
      high_seed_wins: newHighWins,
      low_seed_wins: newLowWins,
      winner_id: winnerId,
      status: newStatus,
    })
    .eq('id', seriesId);

  if (updateSeriesError) {
    logPlayoffWriteError('record series win', updateSeriesError);
    return { success: false, error: PLAYOFF_RESULT_WRITE_FAILURE };
  }

  if (winnerId) {
    const nextRound = series.round_number + 1;
    const nextSeriesNumber = Math.ceil(series.series_number / 2);

    let nextSeriesQuery = serviceClient
      .from('playoff_series')
      .select('*')
      .eq('season_id', seasonId)
      .eq('round_number', nextRound)
      .eq('series_number', nextSeriesNumber);

    nextSeriesQuery = applyDivisionScope(nextSeriesQuery, series.division_id ?? null, capabilities);

    const { data: nextSeries } = await nextSeriesQuery.maybeSingle();

    if (nextSeries) {
      const isHighSlot = series.series_number % 2 === 1;
      const { error: advanceError } = await serviceClient
        .from('playoff_series')
        .update(isHighSlot ? { high_seed_id: winnerId } : { low_seed_id: winnerId })
        .eq('id', nextSeries.id);

      if (advanceError) {
        logPlayoffWriteError('advance winner to next series', advanceError);
        return { success: false, error: PLAYOFF_RESULT_WRITE_FAILURE };
      }
    }

    try {
      await finalizeSeasonIfReady(serviceClient, seasonId, capabilities);
    } catch (error) {
      logPlayoffWriteError('finalize playoff season', error);
      return { success: false, error: PLAYOFF_RESULT_WRITE_FAILURE };
    }
  }

  await revalidatePlayoffPaths(supabase, leagueId, seasonId);
  return { success: true, data: undefined };
}

export async function schedulePlayoffGame(
  leagueId: string,
  seasonId: string,
  seriesId: string,
  scheduledAt: string,
  location: string,
): Promise<ActionResult<{ gameId: string }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  const { data: series, error: seriesError } = await serviceClient
    .from('playoff_series')
    .select('*')
    .eq('id', seriesId)
    .eq('season_id', seasonId)
    .eq('league_id', leagueId)
    .single();

  if (seriesError || !series) {
    return { success: false, error: 'Series not found' };
  }
  if (!series.high_seed_id || !series.low_seed_id) {
    return { success: false, error: 'Cannot schedule a game — both teams are not yet determined' };
  }
  if (series.status === 'completed') {
    return { success: false, error: 'Series is already complete' };
  }

  const { data: game, error: insertError } = await serviceClient
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
    if (insertError) {
      logPlayoffWriteError('schedule playoff game', insertError);
    }
    return { success: false, error: PLAYOFF_GAME_WRITE_FAILURE };
  }

  if (series.status === 'pending') {
    const { error: markSeriesError } = await serviceClient
      .from('playoff_series')
      .update({ status: 'in_progress' })
      .eq('id', seriesId);

    if (markSeriesError) {
      logPlayoffWriteError('mark playoff series in progress', markSeriesError);
      return { success: false, error: PLAYOFF_RESULT_WRITE_FAILURE };
    }
  }

  await revalidatePlayoffPaths(supabase, leagueId, seasonId);
  return { success: true, data: { gameId: game.id } };
}
