'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ==============================================================================
// CONSTANTS
// ==============================================================================

const MAX_BULK_OPERATIONS = 100;
const MAX_SCORE_VALUE = 99;
const VALID_GAME_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'] as const;

// ==============================================================================
// INPUT VALIDATION HELPERS
// ==============================================================================

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function isValidGameStatus(status: string): status is GameStatus {
  return VALID_GAME_STATUSES.includes(status as GameStatus);
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function sanitizeError(error: unknown, context: string): string {
  // Log the real error for debugging (server-side only)
  console.error(`Error in ${context}:`, error);

  // Return generic message to client
  if (error instanceof Error) {
    if (error.message.includes('not found') || error.message.includes('PGRST116')) {
      return 'Resource not found';
    }
    if (error.message.includes('permission denied') || error.message.includes('row-level security')) {
      return 'Permission denied';
    }
    if (error.message.includes('duplicate')) {
      return 'A resource with this identifier already exists';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

function revalidateGamePaths(game: { league_id: string; season_id: string; id: string }) {
  revalidatePath(`/dashboard/leagues/${game.league_id}/games`);
  revalidatePath(`/dashboard/leagues/${game.league_id}/games/${game.id}`);
  revalidatePath(`/dashboard/leagues/${game.league_id}/seasons/${game.season_id}/games`);
  revalidatePath(`/dashboard/leagues/${game.league_id}/seasons/${game.season_id}/games/${game.id}`);
}

function shouldRevalidatePublicGameResultPaths(
  before: Pick<Game, 'status' | 'home_score' | 'away_score'>,
  after: Pick<Game, 'status' | 'home_score' | 'away_score'>,
) {
  const beforeCompleted = before.status === 'completed';
  const afterCompleted = after.status === 'completed';
  const scoreChanged = before.home_score !== after.home_score || before.away_score !== after.away_score;

  return beforeCompleted !== afterCompleted || (afterCompleted && scoreChanged);
}

async function revalidatePublicLeagueResultPaths(
  serviceClient: Awaited<ReturnType<typeof createServiceRoleClient>>,
  game: Pick<Game, 'league_id' | 'home_team_id' | 'away_team_id'>,
) {
  const { data: league } = await serviceClient
    .from('leagues')
    .select('slug')
    .eq('id', game.league_id)
    .maybeSingle();

  if (!league?.slug) {
    return;
  }

  const teamIds = [game.home_team_id, game.away_team_id].filter(Boolean);
  const { data: teams } = teamIds.length
    ? await serviceClient
        .from('teams')
        .select('slug')
        .in('id', teamIds)
    : { data: [] };

  const paths = Array.from(
    new Set([
      `/${league.slug}`,
      `/${league.slug}/schedule`,
      `/${league.slug}/scores`,
      `/${league.slug}/standings`,
      `/${league.slug}/playoffs`,
      `/${league.slug}/stats`,
      `/${league.slug}/teams`,
      `/${league.slug}/news`,
      ...(teams ?? [])
        .map((team) => team.slug)
        .filter(Boolean)
        .map((teamSlug) => `/${league.slug}/teams/${teamSlug}`),
    ]),
  );

  const leagueSitesUrl = process.env.LEAGUE_SITES_URL || 'http://localhost:3001';

  try {
    await fetch(`${leagueSitesUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: league.slug,
        secret: process.env.REVALIDATION_SECRET,
        type: 'game_result',
        paths,
      }),
    });
  } catch (error) {
    console.warn('[games] Failed to trigger league-sites revalidation:', error);
  }
}

// ==============================================================================
// TYPES
// ==============================================================================

export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

export interface Game {
  id: string;
  league_id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: GameStatus;
  scheduled_at: string;
  location: string | null;
  is_rescheduled: boolean;
  original_scheduled_at: string | null;
  rescheduled_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  round_number: number | null;
  game_number: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  home_team?: {
    id: string;
    name: string;
    short_name: string | null;
    primary_color: string | null;
    logo_url: string | null;
  };
  away_team?: {
    id: string;
    name: string;
    short_name: string | null;
    primary_color: string | null;
    logo_url: string | null;
  };
  season?: {
    id: string;
    name: string;
  };
}

export interface GameFilters {
  status?: GameStatus | 'all';
  teamId?: string;
  seasonId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==============================================================================
// HELPER: Verify user has admin access to league
// ==============================================================================

async function verifyLeagueAdmin(leagueId: string): Promise<{ userId: string } | null> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  // Check active league membership with owner/admin role
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membership && ['owner', 'admin'].includes(membership.role)) {
    return { userId: user.id };
  }

  // Check league creator and organization owner fallback
  const { data: league } = await supabase
    .from('leagues')
    .select('created_by, organizations(owner_user_id)')
    .eq('id', leagueId)
    .maybeSingle();

  const org = (league as any)?.organizations as { owner_user_id?: string } | null | undefined;
  if ((league as any)?.created_by === user.id || org?.owner_user_id === user.id) {
    return { userId: user.id };
  }

  // Platform admin fallback
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .maybeSingle();

  if ((profile as any)?.is_platform_admin === true) {
    return { userId: user.id };
  }

  return null;
}

// ==============================================================================
// HELPER: Log game audit
// ==============================================================================

async function logGameAudit(
  gameId: string,
  leagueId: string,
  action: string,
  changedBy: string,
  previousData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  reason?: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase.from('game_audit_log').insert({
    game_id: gameId,
    league_id: leagueId,
    action,
    changed_by: changedBy,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previous_data: previousData as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new_data: newData as any,
    reason: reason ?? null,
  });
}

// ==============================================================================
// GET GAMES
// ==============================================================================

export async function getGames(
  leagueId: string,
  filters?: GameFilters
): Promise<ActionResult<{ games: Game[]; total: number }>> {
  try {
    // Input validation
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (filters?.teamId && !isValidUUID(filters.teamId)) {
      return { success: false, error: 'Invalid team ID format' };
    }

    if (filters?.seasonId && !isValidUUID(filters.seasonId)) {
      return { success: false, error: 'Invalid season ID format' };
    }

    if (filters?.status && filters.status !== 'all' && !isValidGameStatus(filters.status)) {
      return { success: false, error: 'Invalid status value' };
    }

    if (filters?.dateFrom && !isValidDate(filters.dateFrom)) {
      return { success: false, error: 'Invalid from date format' };
    }

    if (filters?.dateTo && !isValidDate(filters.dateTo)) {
      return { success: false, error: 'Invalid to date format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, logo_url),
        season:seasons(id, name)
      `, { count: 'exact' })
      .eq('league_id', leagueId)
      .order('scheduled_at', { ascending: false });

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.teamId) {
      query = query.or(`home_team_id.eq.${filters.teamId},away_team_id.eq.${filters.teamId}`);
    }
    if (filters?.seasonId) {
      query = query.eq('season_id', filters.seasonId);
    }
    if (filters?.dateFrom) {
      query = query.gte('scheduled_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('scheduled_at', filters.dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: sanitizeError(error, 'getGames') };
    }

    return {
      success: true,
      data: {
        games: (data || []) as Game[],
        total: count || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'getGames'),
    };
  }
}

// ==============================================================================
// GET SINGLE GAME
// ==============================================================================

export async function getGame(gameId: string): Promise<ActionResult<Game>> {
  try {
    // Input validation first
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID format' };
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const serviceClient = await createServiceRoleClient();

    // First, get just the league_id to verify authorization BEFORE fetching full data
    const { data: gameRef, error: refError } = await serviceClient
      .from('games')
      .select('league_id')
      .eq('id', gameId)
      .single();

    if (refError || !gameRef) {
      return { success: false, error: 'Game not found or access denied' };
    }

    // Verify access to this game's league BEFORE fetching full data
    const auth = await verifyLeagueAdmin(gameRef.league_id);
    if (!auth || auth.userId !== user.id) {
      return { success: false, error: 'Game not found or access denied' };
    }

    // Now fetch full game data (user is authorized)
    const { data, error } = await serviceClient
      .from('games')
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, logo_url),
        season:seasons(id, name)
      `)
      .eq('id', gameId)
      .single();

    if (error) {
      return { success: false, error: sanitizeError(error, 'getGame') };
    }

    return { success: true, data: data as Game };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'getGame'),
    };
  }
}

// ==============================================================================
// CREATE GAME (single manual add)
// ==============================================================================

export interface CreateGameInput {
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  /** ISO 8601 timestamp. */
  scheduledAt: string;
  location?: string | null;
  gameType?: string | null;
}

/**
 * Add a single game to a season's schedule.
 *
 * Unlike the schedule generator, this leaves `generation_log_id` NULL, which
 * marks the game as manually added — it will survive a full schedule
 * regeneration (see save_schedule_games).
 *
 * Conflicts (same team or same venue within ±3h) are returned as non-blocking
 * `warnings` so an admin can knowingly override; the game is still created.
 */
export async function createGame(
  leagueId: string,
  input: CreateGameInput,
): Promise<ActionResult<{ game: Game; warnings: string[] }>> {
  try {
    // Input validation
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }
    if (!isValidUUID(input.seasonId)) {
      return { success: false, error: 'Invalid season ID format' };
    }
    if (!isValidUUID(input.homeTeamId) || !isValidUUID(input.awayTeamId)) {
      return { success: false, error: 'Invalid team ID format' };
    }
    if (input.homeTeamId === input.awayTeamId) {
      return { success: false, error: 'Home and away team cannot be the same' };
    }
    if (!isValidDate(input.scheduledAt)) {
      return { success: false, error: 'Invalid date/time' };
    }

    // Verify admin access
    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = await createServiceRoleClient();

    // Verify season belongs to league
    const { data: season } = await serviceClient
      .from('seasons')
      .select('id')
      .eq('id', input.seasonId)
      .eq('league_id', leagueId)
      .maybeSingle();
    if (!season) {
      return { success: false, error: 'Season not found for this league' };
    }

    // Verify both teams belong to the league
    const { data: teams } = await serviceClient
      .from('teams')
      .select('id, name')
      .eq('league_id', leagueId)
      .in('id', [input.homeTeamId, input.awayTeamId]);
    const teamsById = new Map((teams ?? []).map((t) => [t.id, t.name]));
    if (!teamsById.has(input.homeTeamId) || !teamsById.has(input.awayTeamId)) {
      return { success: false, error: 'One or both teams do not belong to this league' };
    }

    const scheduledIso = new Date(input.scheduledAt).toISOString();
    const location = input.location?.trim() || null;

    // Soft conflict detection (±3h window) — non-blocking warnings
    const warnings: string[] = [];
    const windowMs = 3 * 60 * 60 * 1000;
    const windowStart = new Date(new Date(scheduledIso).getTime() - windowMs).toISOString();
    const windowEnd = new Date(new Date(scheduledIso).getTime() + windowMs).toISOString();
    const { data: nearby } = await serviceClient
      .from('games')
      .select('id, scheduled_at, location, home_team_id, away_team_id')
      .eq('season_id', input.seasonId)
      .neq('status', 'cancelled')
      .gte('scheduled_at', windowStart)
      .lte('scheduled_at', windowEnd);

    for (const g of nearby ?? []) {
      const sharesTeam =
        g.home_team_id === input.homeTeamId ||
        g.away_team_id === input.homeTeamId ||
        g.home_team_id === input.awayTeamId ||
        g.away_team_id === input.awayTeamId;
      if (sharesTeam) {
        const teamName =
          g.home_team_id === input.homeTeamId || g.away_team_id === input.homeTeamId
            ? teamsById.get(input.homeTeamId)
            : teamsById.get(input.awayTeamId);
        warnings.push(
          `${teamName ?? 'A team'} already has a game within 3 hours of this time.`,
        );
      }
      if (location && g.location && g.location.trim().toLowerCase() === location.toLowerCase()) {
        warnings.push(`${location} is already booked within 3 hours of this time.`);
      }
    }

    const { data, error } = await serviceClient
      .from('games')
      .insert({
        league_id: leagueId,
        season_id: input.seasonId,
        home_team_id: input.homeTeamId,
        away_team_id: input.awayTeamId,
        scheduled_at: scheduledIso,
        location,
        game_type: input.gameType?.trim() || null,
        status: 'scheduled',
        // generation_log_id intentionally left NULL → survives regeneration
      })
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, logo_url),
        season:seasons(id, name)
      `)
      .single();

    if (error || !data) {
      return { success: false, error: sanitizeError(error, 'createGame') };
    }

    await logGameAudit(
      data.id,
      leagueId,
      'create',
      auth.userId,
      null,
      {
        home_team_id: input.homeTeamId,
        away_team_id: input.awayTeamId,
        scheduled_at: scheduledIso,
        location,
      },
      'Manually added game',
    );

    revalidateGamePaths({ league_id: leagueId, season_id: input.seasonId, id: data.id });
    await revalidatePublicLeagueResultPaths(serviceClient, data as Game);

    return { success: true, data: { game: data as Game, warnings: Array.from(new Set(warnings)) } };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'createGame') };
  }
}

// ==============================================================================
// UPDATE GAME
// ==============================================================================

export interface UpdateGameInput {
  scheduled_at?: string;
  location?: string;
  home_score?: number;
  away_score?: number;
  status?: GameStatus;
}

export async function updateGame(
  gameId: string,
  updates: UpdateGameInput
): Promise<ActionResult<Game>> {
  try {
    // Input validation
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID format' };
    }

    if (updates.status && !isValidGameStatus(updates.status)) {
      return { success: false, error: 'Invalid status value' };
    }

    if (updates.home_score !== undefined) {
      if (updates.home_score < 0 || updates.home_score > MAX_SCORE_VALUE) {
        return { success: false, error: `Score must be between 0 and ${MAX_SCORE_VALUE}` };
      }
    }

    if (updates.away_score !== undefined) {
      if (updates.away_score < 0 || updates.away_score > MAX_SCORE_VALUE) {
        return { success: false, error: `Score must be between 0 and ${MAX_SCORE_VALUE}` };
      }
    }

    if (updates.scheduled_at && !isValidDate(updates.scheduled_at)) {
      return { success: false, error: 'Invalid date format' };
    }

    const serviceClient = await createServiceRoleClient();

    // Get current game first
    const { data: currentGame, error: fetchError } = await serviceClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError || !currentGame) {
      return { success: false, error: 'Game not found' };
    }

    // Verify admin access
    const auth = await verifyLeagueAdmin(currentGame.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    // Update game
    const { data, error } = await serviceClient
      .from('games')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, logo_url),
        season:seasons(id, name)
      `)
      .single();

    if (error) {
      return { success: false, error: sanitizeError(error, 'updateGame') };
    }

    // Log audit
    await logGameAudit(
      gameId,
      currentGame.league_id,
      'update',
      auth.userId,
      currentGame,
      data,
      undefined
    );

    revalidateGamePaths(currentGame);

    if (shouldRevalidatePublicGameResultPaths(currentGame as Game, data as Game)) {
      await revalidatePublicLeagueResultPaths(serviceClient, currentGame as Game);
    }

    return { success: true, data: data as Game };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'updateGame'),
    };
  }
}

// ==============================================================================
// RESCHEDULE GAME
// ==============================================================================

export async function rescheduleGame(
  gameId: string,
  newScheduledAt: string,
  newLocation?: string
): Promise<ActionResult<Game>> {
  try {
    // Input validation
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID format' };
    }

    if (!isValidDate(newScheduledAt)) {
      return { success: false, error: 'Invalid date format' };
    }

    const serviceClient = await createServiceRoleClient();

    // Get current game
    const { data: currentGame, error: fetchError } = await serviceClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError || !currentGame) {
      return { success: false, error: 'Game not found' };
    }

    // Verify admin access
    const auth = await verifyLeagueAdmin(currentGame.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    // Can only reschedule scheduled or postponed games
    if (!currentGame.status || !['scheduled', 'postponed'].includes(currentGame.status)) {
      return {
        success: false,
        error: 'Can only reschedule scheduled or postponed games'
      };
    }

    // Update game
    const { data, error } = await serviceClient
      .from('games')
      .update({
        scheduled_at: newScheduledAt,
        location: newLocation !== undefined ? newLocation : currentGame.location,
        original_scheduled_at: currentGame.original_scheduled_at || currentGame.scheduled_at,
        is_rescheduled: true,
        rescheduled_at: new Date().toISOString(),
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, logo_url),
        season:seasons(id, name)
      `)
      .single();

    if (error) {
      return { success: false, error: sanitizeError(error, 'rescheduleGame') };
    }

    // Log audit
    await logGameAudit(
      gameId,
      currentGame.league_id,
      'reschedule',
      auth.userId,
      { scheduled_at: currentGame.scheduled_at, location: currentGame.location },
      { scheduled_at: newScheduledAt, location: newLocation || currentGame.location },
      `Rescheduled from ${currentGame.scheduled_at}`
    );

    revalidateGamePaths(currentGame);

    return { success: true, data: data as Game };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'rescheduleGame'),
    };
  }
}

// ==============================================================================
// CANCEL GAME
// ==============================================================================

export async function cancelGame(
  gameId: string,
  reason: string
): Promise<ActionResult<Game>> {
  try {
    // Input validation
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID format' };
    }

    if (!reason.trim()) {
      return { success: false, error: 'Cancellation reason is required' };
    }

    const serviceClient = await createServiceRoleClient();

    // Get current game
    const { data: currentGame, error: fetchError } = await serviceClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError || !currentGame) {
      return { success: false, error: 'Game not found' };
    }

    // Verify admin access
    const auth = await verifyLeagueAdmin(currentGame.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    // Can't cancel completed games
    if (currentGame.status === 'completed') {
      return { success: false, error: 'Cannot cancel a completed game' };
    }

    // Update game
    const { data, error } = await serviceClient
      .from('games')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, logo_url),
        season:seasons(id, name)
      `)
      .single();

    if (error) {
      return { success: false, error: sanitizeError(error, 'cancelGame') };
    }

    // Log audit
    await logGameAudit(
      gameId,
      currentGame.league_id,
      'cancel',
      auth.userId,
      { status: currentGame.status },
      { status: 'cancelled', cancellation_reason: reason },
      reason
    );

    revalidateGamePaths(currentGame);

    return { success: true, data: data as Game };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'cancelGame'),
    };
  }
}

// ==============================================================================
// POSTPONE GAME
// ==============================================================================

export async function postponeGame(
  gameId: string,
  reason: string
): Promise<ActionResult<Game>> {
  try {
    // Input validation
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID format' };
    }

    if (!reason.trim()) {
      return { success: false, error: 'Postponement reason is required' };
    }

    const serviceClient = await createServiceRoleClient();

    // Get current game
    const { data: currentGame, error: fetchError } = await serviceClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError || !currentGame) {
      return { success: false, error: 'Game not found' };
    }

    // Verify admin access
    const auth = await verifyLeagueAdmin(currentGame.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    // Can only postpone scheduled games
    if (currentGame.status !== 'scheduled') {
      return { success: false, error: 'Can only postpone scheduled games' };
    }

    // Update game
    const { data, error } = await serviceClient
      .from('games')
      .update({
        status: 'postponed',
        cancellation_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select(`
        *,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color, logo_url),
        season:seasons(id, name)
      `)
      .single();

    if (error) {
      return { success: false, error: sanitizeError(error, 'postponeGame') };
    }

    // Log audit
    await logGameAudit(
      gameId,
      currentGame.league_id,
      'postpone',
      auth.userId,
      { status: currentGame.status },
      { status: 'postponed' },
      reason
    );

    revalidateGamePaths(currentGame);

    return { success: true, data: data as Game };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'postponeGame'),
    };
  }
}

// ==============================================================================
// BULK CANCEL GAMES
// ==============================================================================

export async function bulkCancelGames(
  gameIds: string[],
  reason: string
): Promise<ActionResult<{ cancelled: number; failed: string[] }>> {
  try {
    if (!reason.trim()) {
      return { success: false, error: 'Cancellation reason is required' };
    }

    if (gameIds.length === 0) {
      return { success: false, error: 'No games selected' };
    }

    // Bulk operation limit
    if (gameIds.length > MAX_BULK_OPERATIONS) {
      return {
        success: false,
        error: `Cannot cancel more than ${MAX_BULK_OPERATIONS} games at once`
      };
    }

    // Validate all game IDs
    for (const gameId of gameIds) {
      if (!isValidUUID(gameId)) {
        return { success: false, error: 'Invalid game ID format in selection' };
      }
    }

    const cancelled: string[] = [];
    const failed: string[] = [];

    for (const gameId of gameIds) {
      const result = await cancelGame(gameId, reason);
      if (result.success) {
        cancelled.push(gameId);
      } else {
        failed.push(gameId);
      }
    }

    return {
      success: true,
      data: {
        cancelled: cancelled.length,
        failed,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'bulkCancelGames'),
    };
  }
}

// ==============================================================================
// BULK POSTPONE GAMES
// ==============================================================================

export async function bulkPostponeGames(
  gameIds: string[],
  reason: string
): Promise<ActionResult<{ postponed: number; failed: string[] }>> {
  try {
    if (!reason.trim()) {
      return { success: false, error: 'Postponement reason is required' };
    }

    if (gameIds.length === 0) {
      return { success: false, error: 'No games selected' };
    }

    if (gameIds.length > MAX_BULK_OPERATIONS) {
      return {
        success: false,
        error: `Cannot postpone more than ${MAX_BULK_OPERATIONS} games at once`
      };
    }

    for (const gameId of gameIds) {
      if (!isValidUUID(gameId)) {
        return { success: false, error: 'Invalid game ID format in selection' };
      }
    }

    const postponed: string[] = [];
    const failed: string[] = [];

    for (const gameId of gameIds) {
      const result = await postponeGame(gameId, reason);
      if (result.success) {
        postponed.push(gameId);
      } else {
        failed.push(gameId);
      }
    }

    return {
      success: true,
      data: {
        postponed: postponed.length,
        failed,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'bulkPostponeGames'),
    };
  }
}

// ==============================================================================
// BULK RESCHEDULE GAMES (shift by days)
// ==============================================================================

export async function bulkRescheduleGames(
  gameIds: string[],
  dayShift: number
): Promise<ActionResult<{ rescheduled: number; failed: string[] }>> {
  try {
    if (gameIds.length === 0) {
      return { success: false, error: 'No games selected' };
    }

    // Bulk operation limit
    if (gameIds.length > MAX_BULK_OPERATIONS) {
      return {
        success: false,
        error: `Cannot reschedule more than ${MAX_BULK_OPERATIONS} games at once`
      };
    }

    // Validate day shift bounds
    if (!Number.isInteger(dayShift) || dayShift < -365 || dayShift > 365) {
      return { success: false, error: 'Day shift must be an integer between -365 and 365' };
    }

    // Validate all game IDs
    for (const gameId of gameIds) {
      if (!isValidUUID(gameId)) {
        return { success: false, error: 'Invalid game ID format in selection' };
      }
    }

    const rescheduled: string[] = [];
    const failed: string[] = [];

    const serviceClient = await createServiceRoleClient();

    for (const gameId of gameIds) {
      // Get current game
      const { data: currentGame, error: fetchError } = await serviceClient
        .from('games')
        .select('scheduled_at, league_id, status')
        .eq('id', gameId)
        .single();

      if (fetchError || !currentGame) {
        failed.push(gameId);
        continue;
      }

      // Calculate new date
      const currentDate = new Date(currentGame.scheduled_at);
      currentDate.setDate(currentDate.getDate() + dayShift);
      const newScheduledAt = currentDate.toISOString();

      const result = await rescheduleGame(gameId, newScheduledAt);
      if (result.success) {
        rescheduled.push(gameId);
      } else {
        failed.push(gameId);
      }
    }

    return {
      success: true,
      data: {
        rescheduled: rescheduled.length,
        failed,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'bulkRescheduleGames'),
    };
  }
}

// ==============================================================================
// GET TEAMS FOR FILTER
// ==============================================================================

export async function getTeamsForLeague(
  leagueId: string
): Promise<ActionResult<Array<{ id: string; name: string; short_name: string | null }>>> {
  try {
    // Input validation
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = await createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('teams')
      .select('id, name, short_name')
      .eq('league_id', leagueId)
      .order('name');

    if (error) {
      return { success: false, error: sanitizeError(error, 'getTeamsForLeague') };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'getTeamsForLeague'),
    };
  }
}

// ==============================================================================
// GET SEASONS FOR FILTER
// ==============================================================================

export async function getSeasonsForLeague(
  leagueId: string
): Promise<ActionResult<Array<{ id: string; name: string }>>> {
  try {
    // Input validation
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = await createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('seasons')
      .select('id, name')
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false });

    if (error) {
      return { success: false, error: sanitizeError(error, 'getSeasonsForLeague') };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'getSeasonsForLeague'),
    };
  }
}

// ==============================================================================
// GET GAME AUDIT LOG
// ==============================================================================

export async function getGameAuditLog(
  gameId: string
): Promise<ActionResult<Array<{
  id: string;
  action: string;
  changed_by: string;
  previous_data: unknown;
  new_data: unknown;
  reason: string | null;
  created_at: string;
  changed_by_profile?: { full_name: string | null };
}>>> {
  try {
    // Input validation
    if (!isValidUUID(gameId)) {
      return { success: false, error: 'Invalid game ID format' };
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const serviceClient = await createServiceRoleClient();

    // First get the game's league_id to verify authorization
    const { data: game, error: gameError } = await serviceClient
      .from('games')
      .select('league_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      // Use generic error to prevent game enumeration
      return { success: false, error: 'Game not found or access denied' };
    }

    // Verify admin access
    const auth = await verifyLeagueAdmin(game.league_id);
    if (!auth) {
      return { success: false, error: 'Game not found or access denied' };
    }

    const { data, error } = await serviceClient
      .from('game_audit_log')
      .select(`
        *,
        changed_by_profile:profiles!game_audit_log_changed_by_fkey(full_name)
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: sanitizeError(error, 'getGameAuditLog') };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'getGameAuditLog'),
    };
  }
}

// ==============================================================================
// BULK POSTPONE BY DATE
// ==============================================================================

export async function bulkPostponeByDate(
  leagueId: string,
  date: string,
  reason: string,
  sendNotifications: boolean = true
): Promise<ActionResult<{ postponed: number; failed: string[]; notified: number }>> {
  try {
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (!reason.trim()) {
      return { success: false, error: 'Postponement reason is required' };
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = await createServiceRoleClient();

    // Fetch all scheduled games on this date for this league
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const { data: games, error: fetchError } = await serviceClient
      .from('games')
      .select(`
        id,
        scheduled_at,
        location,
        home_team:teams!games_home_team_id_fkey(id, name, short_name),
        away_team:teams!games_away_team_id_fkey(id, name, short_name)
      `)
      .eq('league_id', leagueId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', dayStart)
      .lte('scheduled_at', dayEnd);

    if (fetchError) {
      return { success: false, error: 'Failed to fetch games for this date.' };
    }

    if (!games || games.length === 0) {
      return { success: false, error: 'No scheduled games found on this date.' };
    }

    if (games.length > MAX_BULK_OPERATIONS) {
      return {
        success: false,
        error: `Too many games (${games.length}). Maximum ${MAX_BULK_OPERATIONS} per operation.`,
      };
    }

    // Postpone all games
    const gameIds = games.map((g) => g.id);
    const result = await bulkPostponeGames(gameIds, reason.trim());

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Send notifications to affected players
    let notified = 0;
    if (sendNotifications && result.data.postponed > 0) {
      notified = await sendPostponementNotifications(
        leagueId,
        games,
        reason.trim(),
        date
      );
    }

    return {
      success: true,
      data: {
        postponed: result.data.postponed,
        failed: result.data.failed,
        notified,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'bulkPostponeByDate'),
    };
  }
}

// ==============================================================================
// SEND POSTPONEMENT NOTIFICATIONS
// ==============================================================================

async function sendPostponementNotifications(
  leagueId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  games: any[],
  reason: string,
  date: string
): Promise<number> {
  try {
    const { sendEmail } = await import('@/lib/notifications/email-service');
    const { getScheduleChangeEmail } = await import(
      '@/lib/notifications/templates/schedule-change'
    );

    const serviceClient = await createServiceRoleClient();

    // Get league name
    const { data: league } = await serviceClient
      .from('leagues')
      .select('name')
      .eq('id', leagueId)
      .single();

    const leagueName = league?.name || 'Your League';

    // Collect all team IDs from affected games
    const teamIds = new Set<string>();
    for (const game of games) {
      const homeTeam = game.home_team as { id: string } | null;
      const awayTeam = game.away_team as { id: string } | null;
      if (homeTeam?.id) teamIds.add(homeTeam.id);
      if (awayTeam?.id) teamIds.add(awayTeam.id);
    }

    // Fetch players on those teams with email addresses
    const { data: rosters } = await serviceClient
      .from('team_rosters')
      .select(`
        team_id,
        player:player_id (
          id,
          full_name,
          email
        )
      `)
      .in('team_id', Array.from(teamIds));

    if (!rosters || rosters.length === 0) return 0;

    // Check notification preferences
    const playerIds = rosters
      .map((r) => (r.player as { id: string } | null)?.id)
      .filter(Boolean) as string[];

    const { data: prefs } = await serviceClient
      .from('user_notification_preferences')
      .select('user_id, email_game_updates')
      .in('user_id', playerIds);

    const optedOut = new Set(
      (prefs || [])
        .filter((p) => p.email_game_updates === false)
        .map((p) => p.user_id)
    );

    // Build a map: teamId → list of games for that team
    const teamGames = new Map<string, typeof games>();
    for (const game of games) {
      const homeId = (game.home_team as { id: string } | null)?.id;
      const awayId = (game.away_team as { id: string } | null)?.id;
      if (homeId) {
        if (!teamGames.has(homeId)) teamGames.set(homeId, []);
        teamGames.get(homeId)!.push(game);
      }
      if (awayId) {
        if (!teamGames.has(awayId)) teamGames.set(awayId, []);
        teamGames.get(awayId)!.push(game);
      }
    }

    let sentCount = 0;
    const sentEmails = new Set<string>(); // Deduplicate

    for (const roster of rosters) {
      const player = roster.player as { id: string; full_name: string; email: string } | null;
      if (!player?.email || optedOut.has(player.id) || sentEmails.has(player.email)) continue;

      const playerTeamGames = teamGames.get(roster.team_id) || [];
      if (playerTeamGames.length === 0) continue;

      // Send one email per player for the first affected game (with note about others)
      const firstGame = playerTeamGames[0];
      const homeTeam = firstGame.home_team as { name: string; short_name: string | null } | null;
      const awayTeam = firstGame.away_team as { name: string; short_name: string | null } | null;

      const gameDate = new Date(firstGame.scheduled_at);
      const formattedDate = gameDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedTime = gameDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const multiGameNote =
        playerTeamGames.length > 1
          ? ` (and ${playerTeamGames.length - 1} other game${playerTeamGames.length > 2 ? 's' : ''} on ${date})`
          : '';

      const html = getScheduleChangeEmail({
        recipientName: player.full_name || 'Player',
        teamName: homeTeam?.name || 'Team',
        opponentName: awayTeam?.name || 'Opponent',
        changeType: 'cancelled',
        originalDate: formattedDate,
        originalTime: formattedTime,
        venueName: firstGame.location || 'TBD',
        reason: reason + multiGameNote,
        willReschedule: true,
        dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca'}/schedule`,
        leagueName,
      });

      const emailResult = await sendEmail({
        to: player.email,
        subject: `Game Postponed: ${formattedDate}${multiGameNote} - ${leagueName}`,
        html,
        tags: [
          { name: 'type', value: 'schedule_change' },
          { name: 'league_id', value: leagueId },
        ],
      });

      if (emailResult.success) {
        sentCount++;
        sentEmails.add(player.email);
      }
    }

    return sentCount;
  } catch (error) {
    console.error('[sendPostponementNotifications] Error:', error);
    return 0;
  }
}

// ==============================================================================
// BULK MOVE VENUE
// ==============================================================================

export async function bulkMoveVenue(
  leagueId: string,
  seasonId: string,
  fromLocation: string,
  toLocation: string
): Promise<ActionResult<{ moved: number; failed: string[] }>> {
  try {
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (!isValidUUID(seasonId)) {
      return { success: false, error: 'Invalid season ID format' };
    }

    if (!fromLocation.trim() || !toLocation.trim()) {
      return { success: false, error: 'Both venue locations are required' };
    }

    if (fromLocation === toLocation) {
      return { success: false, error: 'Source and destination venues must be different' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = await createServiceRoleClient();

    // Find all scheduled/postponed games at the source location
    const { data: games, error: fetchError } = await serviceClient
      .from('games')
      .select('id, location, status, scheduled_at')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('location', fromLocation)
      .in('status', ['scheduled', 'postponed']);

    if (fetchError) {
      return { success: false, error: 'Failed to fetch games at this venue.' };
    }

    if (!games || games.length === 0) {
      return { success: false, error: `No upcoming games found at "${fromLocation}".` };
    }

    if (games.length > MAX_BULK_OPERATIONS) {
      return {
        success: false,
        error: `Too many games (${games.length}). Maximum ${MAX_BULK_OPERATIONS} per operation.`,
      };
    }

    const moved: string[] = [];
    const failed: string[] = [];

    for (const game of games) {
      const { error: updateError } = await serviceClient
        .from('games')
        .update({
          location: toLocation.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (updateError) {
        failed.push(game.id);
      } else {
        moved.push(game.id);

        // Log audit for each game
        await logGameAudit(
          game.id,
          leagueId,
          'update',
          auth.userId,
          { location: fromLocation },
          { location: toLocation.trim() },
          `Bulk venue move: ${fromLocation} → ${toLocation.trim()}`
        );
      }
    }

    return {
      success: true,
      data: {
        moved: moved.length,
        failed,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'bulkMoveVenue'),
    };
  }
}

// ==============================================================================
// GET GAMES AT VENUE IN DATE RANGE
// ==============================================================================

export interface VenueGame {
  id: string;
  scheduled_at: string;
  location: string;
  status: string;
  home_team: { id: string; name: string; short_name: string | null } | null;
  away_team: { id: string; name: string; short_name: string | null } | null;
}

export async function getGamesAtVenueInRange(
  leagueId: string,
  seasonId: string,
  location: string,
  dateFrom: string,
  dateTo: string
): Promise<ActionResult<VenueGame[]>> {
  try {
    if (!isValidUUID(leagueId) || !isValidUUID(seasonId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    if (!location.trim()) {
      return { success: false, error: 'Location is required' };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = await createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('games')
      .select(`
        id,
        scheduled_at,
        location,
        status,
        home_team:teams!games_home_team_id_fkey(id, name, short_name),
        away_team:teams!games_away_team_id_fkey(id, name, short_name)
      `)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('location', location)
      .in('status', ['scheduled', 'postponed'])
      .gte('scheduled_at', `${dateFrom}T00:00:00.000Z`)
      .lte('scheduled_at', `${dateTo}T23:59:59.999Z`)
      .order('scheduled_at', { ascending: true });

    if (error) {
      return { success: false, error: 'Failed to fetch games.' };
    }

    return { success: true, data: (data || []) as VenueGame[] };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'getGamesAtVenueInRange'),
    };
  }
}

// ==============================================================================
// BULK MOVE SELECTED GAMES TO VENUE
// ==============================================================================

export async function bulkMoveSelectedGamesToVenue(
  leagueId: string,
  gameIds: string[],
  toLocation: string
): Promise<ActionResult<{ moved: number; failed: string[] }>> {
  try {
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (!toLocation.trim()) {
      return { success: false, error: 'Destination venue is required' };
    }

    if (gameIds.length === 0) {
      return { success: false, error: 'No games selected' };
    }

    if (gameIds.length > MAX_BULK_OPERATIONS) {
      return {
        success: false,
        error: `Cannot move more than ${MAX_BULK_OPERATIONS} games at once`,
      };
    }

    for (const id of gameIds) {
      if (!isValidUUID(id)) {
        return { success: false, error: 'Invalid game ID format in selection' };
      }
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = await createServiceRoleClient();
    const moved: string[] = [];
    const failed: string[] = [];

    for (const gameId of gameIds) {
      const { data: game, error: fetchError } = await serviceClient
        .from('games')
        .select('id, location, league_id')
        .eq('id', gameId)
        .eq('league_id', leagueId)
        .single();

      if (fetchError || !game) {
        failed.push(gameId);
        continue;
      }

      const previousLocation = game.location;

      const { error: updateError } = await serviceClient
        .from('games')
        .update({
          location: toLocation.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (updateError) {
        failed.push(gameId);
      } else {
        moved.push(gameId);

        await logGameAudit(
          gameId,
          leagueId,
          'update',
          auth.userId,
          { location: previousLocation },
          { location: toLocation.trim() },
          `Venue move: ${previousLocation} → ${toLocation.trim()}`
        );
      }
    }

    revalidatePath('/dashboard');

    return {
      success: true,
      data: { moved: moved.length, failed },
    };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'bulkMoveSelectedGamesToVenue'),
    };
  }
}

// ==============================================================================
// GET DISTINCT LOCATIONS
// ==============================================================================

export async function getDistinctLocations(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<string[]>> {
  try {
    if (!isValidUUID(leagueId) || !isValidUUID(seasonId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const serviceClient = await createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('games')
      .select('location')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .in('status', ['scheduled', 'postponed'])
      .not('location', 'is', null);

    if (error) {
      return { success: false, error: 'Failed to fetch locations.' };
    }

    const locations = [...new Set((data || []).map((g) => g.location).filter(Boolean))] as string[];
    locations.sort();

    return { success: true, data: locations };
  } catch (error) {
    return {
      success: false,
      error: sanitizeError(error, 'getDistinctLocations'),
    };
  }
}
