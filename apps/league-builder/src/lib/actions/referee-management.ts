'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';
import {
  getRefereeAvailabilityMetadata,
  syncLeagueRefereesFromStaff,
} from './staffing-availability';
import {
  selectBestCandidateForGame,
  type StaffingAssignment,
  type StaffingAvailabilityWindow,
  type StaffingCandidate,
} from '@/lib/staffing/scheduler';
import { resolveRefereePayroll } from '@/lib/referees/payroll';

const isDevelopment = process.env.NODE_ENV !== 'production';

// ============================================================================
// TYPES
// ============================================================================

export interface LeagueReferee {
  id: string;
  league_referee_id: string | null;
  league_id: string;
  name: string;
  role_title: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  bio: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  total_assignments: number;
  availability_window_count: number;
  max_games_per_week: number | null;
  preferred_days: number[] | null;
  can_referee: boolean;
  can_linesman: boolean;
  referee_identifier: string | null;
  default_jersey_number: string | null;
  game_fee_cents: number;
  solo_game_fee_cents: number;
  paired_game_fee_cents: number;
  linesman_fee_cents: number;
  single_game_fee_cents: number;
}

export interface GameOfficial {
  id: string;
  game_id: string;
  name: string;
  role: string;
  jersey_number: string | null;
  league_referee_id?: string | null;
  assignment_status?: string | null;
  payment_status?: string | null;
  payment_amount?: number | null;
  payment_amount_cents?: number | null;
  payment_rule_applied?: string | null;
  referee_identifier_snapshot?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefereePayrollLineItem {
  officialId: string;
  gameId: string;
  scheduledAt: string;
  venue: string | null;
  matchup: string;
  role: string;
  assignmentStatus: string;
  paymentStatus: string;
  paymentAmountCents: number;
  paymentRuleApplied: string;
  refereeId: string;
  refereeName: string;
  refereeIdentifier: string | null;
  jerseyNumber: string | null;
}

export interface RefereePayrollSummary {
  refereeId: string;
  refereeName: string;
  refereeIdentifier: string | null;
  assignments: number;
  totalAmountCents: number;
  paidAmountCents: number;
  pendingAmountCents: number;
}

type StructuredRefereeRow = {
  id: string;
  display_name: string;
  referee_identifier: string | null;
  default_jersey_number: string | null;
  max_games_per_week: number | null;
  preferred_days: number[] | null;
  total_assignments: number;
  can_referee: boolean;
  can_linesman: boolean;
  game_fee: number | null;
  game_fee_cents: number;
  solo_game_fee_cents: number;
  paired_game_fee_cents: number;
  linesman_fee_cents: number;
  single_game_fee_cents: number;
};

type PaymentContextRow = {
  id: string;
  game_id: string;
  league_referee_id: string | null;
  role: string | null;
  jersey_number: string | null;
  assignment_status: string | null;
  payment_status: string | null;
  game?: { scheduled_at: string; league_id: string } | null;
  referee?: StructuredRefereeRow | null;
};

function getDayKey(isoTimestamp: string | null | undefined) {
  return isoTimestamp ? isoTimestamp.slice(0, 10) : '';
}

function centsToCurrency(cents: number) {
  return Math.round(cents) / 100;
}

function normalizeFeeCents(referee: StructuredRefereeRow, field: keyof Pick<
  StructuredRefereeRow,
  'game_fee_cents' | 'solo_game_fee_cents' | 'paired_game_fee_cents' | 'linesman_fee_cents' | 'single_game_fee_cents'
>) {
  const value = referee[field];
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

async function recalculateRefereePayments(params: {
  leagueId: string;
  gameIds?: string[];
  seasonId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = createServiceRoleClient();

  let targetQuery = (supabase as any)
    .from('game_officials')
    .select(`
      id,
      game_id,
      league_referee_id,
      name,
      role,
      jersey_number,
      assignment_status,
      payment_status,
      game:games!inner(id, scheduled_at, league_id, season_id),
      referee:league_referees!game_officials_league_referee_id_fkey(
        id,
        display_name,
        referee_identifier,
        default_jersey_number,
        game_fee,
        game_fee_cents,
        solo_game_fee_cents,
        paired_game_fee_cents,
        linesman_fee_cents,
        single_game_fee_cents,
        max_games_per_week,
        preferred_days,
        total_assignments,
        can_referee,
        can_linesman
      )
    `)
    .eq('game.league_id' as any, params.leagueId)
    .not('league_referee_id', 'is', null);

  if (params.gameIds?.length) {
    targetQuery = targetQuery.in('game_id', params.gameIds);
  }
  if (params.seasonId) {
    targetQuery = targetQuery.eq('game.season_id' as any, params.seasonId);
  }
  if (params.dateFrom) {
    targetQuery = targetQuery.gte('game.scheduled_at' as any, params.dateFrom);
  }
  if (params.dateTo) {
    targetQuery = targetQuery.lte('game.scheduled_at' as any, params.dateTo);
  }

  const { data: targetedRows, error: targetedError } = await targetQuery;
  if (targetedError) {
    if (isDevelopment) console.error('Error loading targeted referee payments:', targetedError);
    return;
  }

  const targets = (targetedRows || []) as PaymentContextRow[];
  if (targets.length === 0) {
    return;
  }

  const affectedGameIds = Array.from(new Set(targets.map((row) => row.game_id)));
  const affectedRefereeIds = Array.from(
    new Set(targets.map((row) => row.league_referee_id).filter(Boolean))
  ) as string[];
  const affectedDayKeys = new Set(
    targets.map((row) => getDayKey(row.game?.scheduled_at)).filter(Boolean)
  );

  const [{ data: gameAssignmentRows }, { data: refereeDayRows }] = await Promise.all([
    affectedGameIds.length > 0
      ? (supabase as any)
          .from('game_officials')
          .select('id, game_id, assignment_status')
          .in('game_id', affectedGameIds)
      : Promise.resolve({ data: [] as any[] }),
    affectedRefereeIds.length > 0
      ? (supabase as any)
          .from('game_officials')
          .select(`
            id,
            league_referee_id,
            assignment_status,
            game:games!inner(id, scheduled_at, league_id)
          `)
          .eq('game.league_id' as any, params.leagueId)
          .in('league_referee_id', affectedRefereeIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const officialsPerGame = new Map<string, number>();
  for (const row of (gameAssignmentRows || []) as Array<{ game_id: string; assignment_status: string | null }>) {
    if (row.assignment_status === 'declined') continue;
    officialsPerGame.set(row.game_id, (officialsPerGame.get(row.game_id) || 0) + 1);
  }

  const assignmentsPerRefereeDay = new Map<string, number>();
  for (const row of (refereeDayRows || []) as Array<{
    league_referee_id: string | null;
    assignment_status: string | null;
    game?: { scheduled_at: string } | null;
  }>) {
    if (!row.league_referee_id || row.assignment_status === 'declined') continue;
    const dayKey = getDayKey(row.game?.scheduled_at);
    if (!dayKey || !affectedDayKeys.has(dayKey)) continue;
    const compositeKey = `${row.league_referee_id}:${dayKey}`;
    assignmentsPerRefereeDay.set(compositeKey, (assignmentsPerRefereeDay.get(compositeKey) || 0) + 1);
  }

  for (const row of targets) {
    if (!row.league_referee_id || !row.referee) continue;

    if (row.assignment_status === 'declined') {
      await (supabase as any)
        .from('game_officials')
        .update({
          payment_amount: null,
          payment_amount_cents: null,
          payment_rule_applied: null,
        })
        .eq('id', row.id);
      continue;
    }

    const compositeKey = `${row.league_referee_id}:${getDayKey(row.game?.scheduled_at)}`;
    const resolution = resolveRefereePayroll(
      {
        game_fee_cents: normalizeFeeCents(row.referee, 'game_fee_cents') || Math.round((row.referee.game_fee || 0) * 100),
        solo_game_fee_cents: normalizeFeeCents(row.referee, 'solo_game_fee_cents'),
        paired_game_fee_cents: normalizeFeeCents(row.referee, 'paired_game_fee_cents'),
        linesman_fee_cents: normalizeFeeCents(row.referee, 'linesman_fee_cents'),
        single_game_fee_cents: normalizeFeeCents(row.referee, 'single_game_fee_cents'),
      },
      {
        role: row.role || 'referee',
        officialsOnGame: officialsPerGame.get(row.game_id) || 1,
        assignmentsThatDay: assignmentsPerRefereeDay.get(compositeKey) || 1,
      }
    );

    await (supabase as any)
      .from('game_officials')
      .update({
        payment_amount: centsToCurrency(resolution.amountCents),
        payment_amount_cents: resolution.amountCents,
        payment_rule_applied: resolution.ruleApplied,
        referee_identifier_snapshot: row.referee.referee_identifier || null,
        jersey_number: row.jersey_number || row.referee.default_jersey_number || null,
      })
      .eq('id', row.id);
  }
}

function revalidateRefereePaths(leagueId: string) {
  revalidatePath(`/dashboard/leagues/${leagueId}`);
  revalidatePath(`/dashboard/leagues/${leagueId}/games`);
  revalidatePath(`/dashboard/leagues/${leagueId}/settings/referees`);
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all referees for a league (staff with role_title containing 'referee')
 */
export async function getLeagueReferees(leagueId: string): Promise<{
  success: boolean;
  data?: { referees: LeagueReferee[] };
  error?: string;
}> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  await syncLeagueRefereesFromStaff(leagueId);

  const supabase = await createClient();

  // Fetch staff with referee-like role titles
  const { data: staff, error: staffError } = await (supabase
    .from('league_staff') as any)
    .select('*')
    .eq('league_id', leagueId)
    .ilike('role_title', '%referee%')
    .order('display_order', { ascending: true });

  if (staffError) {
    if (isDevelopment) console.error('Error fetching referees:', staffError);
    return { success: false, error: 'Failed to fetch referees' };
  }

  // Structured referee records power availability + auto-assignment.
  const serviceClient = createServiceRoleClient();
  const { data: leagueReferees } = await (serviceClient as any)
    .from('league_referees')
    .select('*')
    .eq('league_id', leagueId);

  const availabilityCountByRefereeId = await getRefereeAvailabilityMetadata(leagueId);

  // Get assignment counts from game_officials
  const refereeNames = (staff || []).map((s: any) => s.name);
  const assignmentCounts: Record<string, number> = {};

  if (refereeNames.length > 0) {
    const { data: officials } = await (supabase
      .from('game_officials') as any)
      .select('name')
      .in('name', refereeNames);

    if (officials) {
      for (const official of officials) {
        assignmentCounts[official.name] = (assignmentCounts[official.name] || 0) + 1;
      }
    }
  }

  const referees: LeagueReferee[] = (staff || []).map((s: any) => {
    const structuredReferee = (leagueReferees || []).find((row: any) => {
      if (s.email && row.email) {
        return String(row.email).toLowerCase() === String(s.email).toLowerCase();
      }
      return row.display_name === s.name;
    });

    return {
      ...s,
      league_referee_id: structuredReferee?.id || null,
      total_assignments: assignmentCounts[s.name] || 0,
      availability_window_count: structuredReferee?.id
        ? availabilityCountByRefereeId.get(structuredReferee.id) || 0
        : 0,
      max_games_per_week: structuredReferee?.max_games_per_week || null,
      preferred_days: structuredReferee?.preferred_days || null,
      can_referee: structuredReferee?.can_referee ?? true,
      can_linesman: structuredReferee?.can_linesman ?? true,
      referee_identifier: structuredReferee?.referee_identifier || null,
      default_jersey_number: structuredReferee?.default_jersey_number || null,
      game_fee_cents: structuredReferee?.game_fee_cents || 0,
      solo_game_fee_cents: structuredReferee?.solo_game_fee_cents || 0,
      paired_game_fee_cents: structuredReferee?.paired_game_fee_cents || 0,
      linesman_fee_cents: structuredReferee?.linesman_fee_cents || 0,
      single_game_fee_cents: structuredReferee?.single_game_fee_cents || 0,
    };
  });

  return { success: true, data: { referees } };
}

/**
 * Get game officials for a specific game
 */
export async function getGameOfficials(gameId: string): Promise<{
  success: boolean;
  data?: GameOfficial[];
  error?: string;
}> {
  const supabase = createServiceRoleClient();
  const userClient = await createClient();

  const { data: gameRef, error: gameRefError } = await (supabase as any)
    .from('games')
    .select('league_id')
    .eq('id', gameId)
    .maybeSingle();

  if (gameRefError || !gameRef?.league_id) {
    return { success: false, error: 'Game not found' };
  }

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const access = await verifyLeagueOwnerAccess(gameRef.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const { data, error } = await (supabase
    .from('game_officials') as any)
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isDevelopment) console.error('Error fetching game officials:', error);
    return { success: false, error: 'Failed to fetch game officials' };
  }

  return { success: true, data: data || [] };
}

/**
 * Get all game officials for a league (across all games in all seasons)
 */
export async function getLeagueGameOfficials(leagueId: string): Promise<{
  success: boolean;
  data?: Array<GameOfficial & { game: { id: string; scheduled_at: string; status: string } }>;
  error?: string;
}> {
  const supabase = await createClient();

  // Get all games for this league
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, scheduled_at, status, season:seasons!inner(league_id)')
    .eq('seasons.league_id' as any, leagueId);

  if (gamesError || !games) {
    if (isDevelopment) console.error('Error fetching league games:', gamesError);
    return { success: false, error: 'Failed to fetch league games' };
  }

  const gameIds = games.map((g: any) => g.id);
  if (gameIds.length === 0) {
    return { success: true, data: [] };
  }

  const { data: officials, error: officialsError } = await (supabase
    .from('game_officials') as any)
    .select('*')
    .in('game_id', gameIds);

  if (officialsError) {
    if (isDevelopment) console.error('Error fetching officials:', officialsError);
    return { success: false, error: 'Failed to fetch officials' };
  }

  const gameMap = new Map(games.map((g: any) => [g.id, { id: g.id, scheduled_at: g.scheduled_at, status: g.status }]));

  const result = (officials || []).map((o: any) => ({
    ...o,
    game: gameMap.get(o.game_id) || { id: o.game_id, scheduled_at: '', status: 'unknown' },
  }));

  return { success: true, data: result };
}

export async function getRefereePayrollReport(params: {
  leagueId: string;
  seasonId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: 'pending' | 'paid' | 'all';
}): Promise<{
  success: boolean;
  data?: {
    lineItems: RefereePayrollLineItem[];
    summary: RefereePayrollSummary[];
    totals: {
      assignments: number;
      totalAmountCents: number;
      paidAmountCents: number;
      pendingAmountCents: number;
    };
    unlinkedAssignments: number;
  };
  error?: string;
}> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  await recalculateRefereePayments({
    leagueId: params.leagueId,
    seasonId: params.seasonId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  const supabase = createServiceRoleClient();

  let lineItemsQuery = (supabase as any)
    .from('game_officials')
    .select(`
      id,
      game_id,
      league_referee_id,
      role,
      jersey_number,
      assignment_status,
      payment_status,
      payment_amount,
      payment_amount_cents,
      payment_rule_applied,
      referee_identifier_snapshot,
      game:games!inner(
        id,
        scheduled_at,
        location,
        season_id,
        league_id,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name)
      ),
      referee:league_referees!game_officials_league_referee_id_fkey(
        id,
        display_name,
        referee_identifier
      )
    `)
    .eq('game.league_id' as any, params.leagueId)
    .not('league_referee_id', 'is', null);

  if (params.seasonId) {
    lineItemsQuery = lineItemsQuery.eq('game.season_id' as any, params.seasonId);
  }
  if (params.dateFrom) {
    lineItemsQuery = lineItemsQuery.gte('game.scheduled_at' as any, params.dateFrom);
  }
  if (params.dateTo) {
    lineItemsQuery = lineItemsQuery.lte('game.scheduled_at' as any, params.dateTo);
  }
  if (params.paymentStatus && params.paymentStatus !== 'all') {
    lineItemsQuery = lineItemsQuery.eq('payment_status', params.paymentStatus);
  }

  let unlinkedQuery = (supabase as any)
    .from('game_officials')
    .select(`
      id,
      assignment_status,
      game:games!inner(id, scheduled_at, season_id, league_id)
    `)
    .is('league_referee_id', null)
    .in('assignment_status', ['confirmed', 'pending'])
    .eq('game.league_id' as any, params.leagueId);

  if (params.seasonId) {
    unlinkedQuery = unlinkedQuery.eq('game.season_id' as any, params.seasonId);
  }
  if (params.dateFrom) {
    unlinkedQuery = unlinkedQuery.gte('game.scheduled_at' as any, params.dateFrom);
  }
  if (params.dateTo) {
    unlinkedQuery = unlinkedQuery.lte('game.scheduled_at' as any, params.dateTo);
  }

  const [{ data: lineRows, error: lineError }, { data: unlinkedRows }] = await Promise.all([
    lineItemsQuery,
    unlinkedQuery,
  ]);

  if (lineError) {
    if (isDevelopment) console.error('Error loading referee payroll report:', lineError);
    return { success: false, error: 'Failed to load referee payroll report.' };
  }

  const summaryMap = new Map<string, RefereePayrollSummary>();
  const lineItems: RefereePayrollLineItem[] = ((lineRows || []) as Array<any>)
    .filter((row) => row.assignment_status !== 'declined')
    .map((row) => {
      const amountCents =
        typeof row.payment_amount_cents === 'number'
          ? row.payment_amount_cents
          : Math.round(Number(row.payment_amount || 0) * 100);
      const game = row.game;
      const matchup = `${game?.home_team?.name || 'TBD'} vs ${game?.away_team?.name || 'TBD'}`;
      const refereeId = row.referee?.id || row.league_referee_id;
      const summary = summaryMap.get(refereeId) || {
        refereeId,
        refereeName: row.referee?.display_name || row.name || 'Referee',
        refereeIdentifier: row.referee_identifier_snapshot || row.referee?.referee_identifier || null,
        assignments: 0,
        totalAmountCents: 0,
        paidAmountCents: 0,
        pendingAmountCents: 0,
      };

      summary.assignments += 1;
      summary.totalAmountCents += amountCents;
      if (row.payment_status === 'paid') {
        summary.paidAmountCents += amountCents;
      } else {
        summary.pendingAmountCents += amountCents;
      }
      summaryMap.set(refereeId, summary);

      return {
        officialId: row.id,
        gameId: row.game_id,
        scheduledAt: game?.scheduled_at,
        venue: game?.location || null,
        matchup,
        role: row.role || 'referee',
        assignmentStatus: row.assignment_status || 'confirmed',
        paymentStatus: row.payment_status || 'pending',
        paymentAmountCents: amountCents,
        paymentRuleApplied: row.payment_rule_applied || 'standard',
        refereeId,
        refereeName: row.referee?.display_name || row.name || 'Referee',
        refereeIdentifier: row.referee_identifier_snapshot || row.referee?.referee_identifier || null,
        jerseyNumber: row.jersey_number || null,
      };
    })
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));

  const summary = Array.from(summaryMap.values()).sort((left, right) =>
    left.refereeName.localeCompare(right.refereeName)
  );

  return {
    success: true,
    data: {
      lineItems,
      summary,
      totals: {
        assignments: lineItems.length,
        totalAmountCents: lineItems.reduce((sum, line) => sum + line.paymentAmountCents, 0),
        paidAmountCents: lineItems
          .filter((line) => line.paymentStatus === 'paid')
          .reduce((sum, line) => sum + line.paymentAmountCents, 0),
        pendingAmountCents: lineItems
          .filter((line) => line.paymentStatus !== 'paid')
          .reduce((sum, line) => sum + line.paymentAmountCents, 0),
      },
      unlinkedAssignments: (unlinkedRows || []).length,
    },
  };
}

// ============================================================================
// MUTATIONS
// ============================================================================

export async function updateRefereeCompensation(params: {
  leagueId: string;
  leagueRefereeId: string;
  refereeIdentifier?: string | null;
  defaultJerseyNumber?: string | null;
  gameFeeCents?: number;
  soloGameFeeCents?: number;
  pairedGameFeeCents?: number;
  linesmanFeeCents?: number;
  singleGameFeeCents?: number;
}): Promise<{ success: boolean; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();

  const gameFeeCents = Math.max(0, Math.round(params.gameFeeCents || 0));
  const updateData = {
    referee_identifier: params.refereeIdentifier?.trim() || null,
    default_jersey_number: params.defaultJerseyNumber?.trim() || null,
    game_fee_cents: gameFeeCents,
    game_fee: centsToCurrency(gameFeeCents),
    solo_game_fee_cents: Math.max(0, Math.round(params.soloGameFeeCents || 0)),
    paired_game_fee_cents: Math.max(0, Math.round(params.pairedGameFeeCents || 0)),
    linesman_fee_cents: Math.max(0, Math.round(params.linesmanFeeCents || 0)),
    single_game_fee_cents: Math.max(0, Math.round(params.singleGameFeeCents || 0)),
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from('league_referees')
    .update(updateData)
    .eq('id', params.leagueRefereeId)
    .eq('league_id', params.leagueId);

  if (error) {
    if (isDevelopment) console.error('Error updating referee compensation:', error);
    return { success: false, error: 'Failed to update referee compensation.' };
  }

  await recalculateRefereePayments({ leagueId: params.leagueId });
  revalidateRefereePaths(params.leagueId);
  return { success: true };
}

/**
 * Assign a referee to a game via game_officials table
 */
export async function assignRefereeToGame(params: {
  gameId: string;
  leagueId: string;
  refereeName: string;
  leagueRefereeId?: string;
  role?: string;
  jerseyNumber?: string;
}): Promise<{ success: boolean; data?: GameOfficial; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  // Verify the game belongs to the selected league
  const { data: gameRef } = await (supabase as any)
    .from('games')
    .select('id')
    .eq('id', params.gameId)
    .eq('league_id', params.leagueId)
    .maybeSingle();

  if (!gameRef) {
    return { success: false, error: 'Game not found for this league' };
  }

  // Check if this referee is already assigned to this game
  const { data: existing } = await (supabase
    .from('game_officials') as any)
    .select('id')
    .eq('game_id', params.gameId)
    .eq('name', params.refereeName)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Referee is already assigned to this game' };
  }

  let structuredReferee: StructuredRefereeRow | null = null;
  if (params.leagueRefereeId) {
    const { data } = await (supabase as any)
      .from('league_referees')
      .select('*')
      .eq('id', params.leagueRefereeId)
      .eq('league_id', params.leagueId)
      .maybeSingle();
    structuredReferee = (data as StructuredRefereeRow | null) || null;
  }

  const { data, error } = await (supabase
    .from('game_officials') as any)
    .insert({
      game_id: params.gameId,
      league_referee_id: structuredReferee?.id || null,
      name: params.refereeName,
      role: params.role || 'referee',
      jersey_number: params.jerseyNumber || structuredReferee?.default_jersey_number || null,
      assigned_by: user?.id || null,
      assignment_status: 'confirmed',
      payment_status: 'pending',
      referee_identifier_snapshot: structuredReferee?.referee_identifier || null,
    })
    .select()
    .single();

  if (error) {
    if (isDevelopment) console.error('Error assigning referee:', error);
    return { success: false, error: 'Failed to assign referee' };
  }

  await recalculateRefereePayments({ leagueId: params.leagueId, gameIds: [params.gameId] });
  revalidateRefereePaths(params.leagueId);
  return { success: true, data };
}

/**
 * Remove a referee assignment from a game
 */
export async function removeRefereeFromGame(params: {
  officialId: string;
  leagueId: string;
}): Promise<{ success: boolean; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();

  // Verify assignment belongs to this league before deletion
  const { data: official } = await (supabase as any)
    .from('game_officials')
    .select('id, game_id, league_referee_id, game:games!inner(scheduled_at, league_id)')
    .eq('id', params.officialId)
    .maybeSingle();

  if (!official?.game_id) {
    return { success: false, error: 'Official assignment not found' };
  }

  const { data: gameRef } = await (supabase as any)
    .from('games')
    .select('id')
    .eq('id', official.game_id)
    .eq('league_id', params.leagueId)
    .maybeSingle();

  if (!gameRef) {
    return { success: false, error: 'Assignment does not belong to this league' };
  }

  const { error } = await (supabase
    .from('game_officials') as any)
    .delete()
    .eq('id', params.officialId);

  if (error) {
    if (isDevelopment) console.error('Error removing referee:', error);
    return { success: false, error: 'Failed to remove referee' };
  }

  const scheduledAt = (official.game as { scheduled_at?: string } | null)?.scheduled_at;
  if (scheduledAt) {
    const day = scheduledAt.slice(0, 10);
    await recalculateRefereePayments({
      leagueId: params.leagueId,
      dateFrom: `${day}T00:00:00.000Z`,
      dateTo: `${day}T23:59:59.999Z`,
    });
  }
  revalidateRefereePaths(params.leagueId);
  return { success: true };
}

/**
 * Bulk assign a referee to multiple games
 */
export async function bulkAssignRefereeToGames(params: {
  leagueId: string;
  refereeName: string;
  leagueRefereeId?: string;
  gameIds: string[];
  role?: string;
}): Promise<{ success: boolean; assigned: number; skipped: number; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, assigned: 0, skipped: 0, error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  let assigned = 0;
  let skipped = 0;
  let structuredReferee: StructuredRefereeRow | null = null;

  if (params.leagueRefereeId) {
    const { data } = await (supabase as any)
      .from('league_referees')
      .select('*')
      .eq('id', params.leagueRefereeId)
      .eq('league_id', params.leagueId)
      .maybeSingle();
    structuredReferee = (data as StructuredRefereeRow | null) || null;
  }

  // Restrict bulk operations to games in this league
  const { data: leagueGames } = await (supabase as any)
    .from('games')
    .select('id')
    .eq('league_id', params.leagueId)
    .in('id', params.gameIds);
  const leagueGameIds = new Set((leagueGames || []).map((g: any) => g.id));

  for (const gameId of params.gameIds) {
    if (!leagueGameIds.has(gameId)) {
      skipped++;
      continue;
    }
    // Check for existing assignment
    const { data: existing } = await (supabase
      .from('game_officials') as any)
      .select('id')
      .eq('game_id', gameId)
      .eq('name', params.refereeName)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await (supabase
      .from('game_officials') as any)
      .insert({
        game_id: gameId,
        league_referee_id: structuredReferee?.id || null,
        name: params.refereeName,
        role: params.role || 'referee',
        jersey_number: structuredReferee?.default_jersey_number || null,
        assigned_by: user?.id || null,
        assignment_status: 'confirmed',
        payment_status: 'pending',
        referee_identifier_snapshot: structuredReferee?.referee_identifier || null,
      });

    if (error) {
      if (isDevelopment) console.error('Error in bulk assign:', error);
      skipped++;
    } else {
      assigned++;
    }
  }

  if (assigned > 0) {
    await recalculateRefereePayments({ leagueId: params.leagueId, gameIds: params.gameIds });
  }
  revalidateRefereePaths(params.leagueId);
  return { success: true, assigned, skipped };
}

export async function autoAssignReferees(params: {
  leagueId: string;
  seasonId?: string;
  dateFrom?: string;
  dateTo?: string;
  overwriteExisting?: boolean;
  officialsPerGame?: number;
  strategy: 'round_robin' | 'least_assigned' | 'availability_based';
}): Promise<{
  success: boolean;
  data?: {
    gamesProcessed: number;
    gamesAssigned: number;
    gamesSkipped: number;
    assignments: Array<{ gameId: string; refereeId: string; refereeName: string; role: string }>;
    skipped: Array<{ gameId: string; reason: string }>;
  };
  error?: string;
}> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  await syncLeagueRefereesFromStaff(params.leagueId);

  const supabase = createServiceRoleClient();
  const officialsPerGame = Math.max(1, Math.min(2, params.officialsPerGame || 1));

  const { data: referees, error: refereesError } = await (supabase as any)
    .from('league_referees')
    .select('*')
    .eq('league_id', params.leagueId)
    .eq('status', 'active');

  if (refereesError || !referees || referees.length === 0) {
    return { success: false, error: 'No active referees are available for auto-assignment.' };
  }

  let gamesQuery = supabase
    .from('games')
    .select('id, scheduled_at, league_id, status')
    .eq('league_id', params.leagueId)
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_at', { ascending: true });

  if (params.seasonId) {
    gamesQuery = gamesQuery.eq('season_id', params.seasonId);
  }
  if (params.dateFrom) {
    gamesQuery = gamesQuery.gte('scheduled_at', params.dateFrom);
  }
  if (params.dateTo) {
    gamesQuery = gamesQuery.lte('scheduled_at', params.dateTo);
  }

  const { data: games, error: gamesError } = await gamesQuery;
  if (gamesError || !games || games.length === 0) {
    return { success: false, error: 'No games found for referee auto-assignment.' };
  }

  const refereeIds = referees.map((referee: any) => referee.id);
  const [{ data: availabilityRows }, { data: existingOfficials }] = await Promise.all([
    refereeIds.length > 0
      ? (supabase as any)
          .from('referee_availability')
          .select('referee_id, day_of_week, start_time, end_time, availability_type')
          .eq('league_id', params.leagueId)
          .in('referee_id', refereeIds)
      : Promise.resolve({ data: [] as any[] }),
    (supabase as any)
      .from('game_officials')
      .select('id, game_id, league_referee_id, role, game:games!inner(id, scheduled_at, league_id)')
      .eq('games.league_id' as any, params.leagueId),
  ]);

  const existingAssignments: StaffingAssignment[] = [];
  for (const official of existingOfficials || []) {
    const scheduledAt = (official.game as any)?.scheduled_at;
    if (official.league_referee_id && scheduledAt) {
      existingAssignments.push({
        gameId: official.game_id,
        assignmentKey: official.league_referee_id,
        scheduledAt,
      });
    }
  }

  const windowsByRefereeId = new Map<string, StaffingAvailabilityWindow[]>();
  for (const row of availabilityRows || []) {
    const existing = windowsByRefereeId.get(row.referee_id) || [];
    existing.push({
      dayOfWeek: row.day_of_week ?? null,
      startTime: String(row.start_time).slice(0, 5),
      endTime: String(row.end_time).slice(0, 5),
      availabilityType: row.availability_type,
      isRecurring: true,
    });
    windowsByRefereeId.set(row.referee_id, existing);
  }

  const structuredReferees = referees as StructuredRefereeRow[];

  const candidates: StaffingCandidate[] = structuredReferees.map((referee) => ({
    assignmentKey: referee.id,
    displayName: referee.display_name,
    totalAssignments: referee.total_assignments || 0,
    maxAssignmentsPerWeek: referee.max_games_per_week,
    preferredDays: referee.preferred_days || [],
    availabilityWindows: windowsByRefereeId.get(referee.id) || [],
  }));

  const result = {
    gamesProcessed: games.length,
    gamesAssigned: 0,
    gamesSkipped: 0,
    assignments: [] as Array<{ gameId: string; refereeId: string; refereeName: string; role: string }>,
    skipped: [] as Array<{ gameId: string; reason: string }>,
  };

  const removeExistingAssignmentsForGame = (gameId: string) => {
    for (let index = existingAssignments.length - 1; index >= 0; index--) {
      if (existingAssignments[index]?.gameId === gameId) {
        existingAssignments.splice(index, 1);
      }
    }
  };

  for (const game of games) {
    const existingForGame = (existingOfficials || []).filter((official: any) => official.game_id === game.id);
    const desiredRoles = officialsPerGame === 2 ? ['referee', 'linesman'] : ['referee'];

    let rolesToFill = [...desiredRoles];

    if (!params.overwriteExisting && existingForGame.length > 0) {
      const existingRoles = new Set(
        existingForGame.map((official: any) => String(official.role || 'referee'))
      );
      rolesToFill = desiredRoles.filter((role) => !existingRoles.has(role));

      if (rolesToFill.length === 0) {
        result.gamesSkipped++;
        result.skipped.push({ gameId: game.id, reason: 'Game already has referee assignments.' });
        continue;
      }
    }

    if (params.overwriteExisting && existingForGame.length > 0) {
      await (supabase as any).from('game_officials').delete().eq('game_id', game.id);
      removeExistingAssignmentsForGame(game.id);
    }

    const assignedForGame = new Set<string>();
    let assignmentsCreatedForGame = 0;

    for (const desiredRole of rolesToFill) {
      const selection = selectBestCandidateForGame({
        candidates: candidates.filter((candidate) => {
          if (assignedForGame.has(candidate.assignmentKey)) {
            return false;
          }
          const structuredReferee = structuredReferees.find((row) => row.id === candidate.assignmentKey);
          if (!structuredReferee) {
            return false;
          }
          return desiredRole === 'linesman'
            ? structuredReferee.can_linesman
            : structuredReferee.can_referee;
        }),
        existingAssignments,
        scheduledAt: game.scheduled_at,
        strategy: params.strategy,
      });

      if (!selection.candidate) {
        continue;
      }

      const structuredReferee = structuredReferees.find(
        (row) => row.id === selection.candidate.assignmentKey
      );
      if (!structuredReferee) {
        continue;
      }

      const { error } = await (supabase as any).from('game_officials').insert({
        game_id: game.id,
        league_referee_id: structuredReferee.id,
        name: structuredReferee.display_name,
        role: desiredRole,
        jersey_number: structuredReferee.default_jersey_number || null,
        assigned_by: user.id,
        assignment_status: 'confirmed',
        payment_status: 'pending',
        referee_identifier_snapshot: structuredReferee.referee_identifier || null,
      });

      if (error) {
        continue;
      }

      assignedForGame.add(structuredReferee.id);
      assignmentsCreatedForGame++;
      selection.candidate.totalAssignments += 1;
      existingAssignments.push({
        gameId: game.id,
        assignmentKey: structuredReferee.id,
        scheduledAt: game.scheduled_at,
      });
      result.assignments.push({
        gameId: game.id,
        refereeId: structuredReferee.id,
        refereeName: structuredReferee.display_name,
        role: desiredRole,
      });
    }

    if (assignmentsCreatedForGame === rolesToFill.length && assignmentsCreatedForGame > 0) {
      result.gamesAssigned++;
    } else if (assignmentsCreatedForGame > 0) {
      result.gamesAssigned++;
      result.skipped.push({
        gameId: game.id,
        reason: `Only ${assignmentsCreatedForGame} of ${rolesToFill.length} officiating slot${rolesToFill.length === 1 ? '' : 's'} could be filled.`,
      });
    } else {
      result.gamesSkipped++;
      result.skipped.push({
        gameId: game.id,
        reason: 'No available referees matched this game slot.',
      });
    }
  }

  if (games.length > 0) {
    await recalculateRefereePayments({
      leagueId: params.leagueId,
      gameIds: games.map((game) => game.id),
    });
  }
  revalidateRefereePaths(params.leagueId);
  return { success: true, data: result };
}
