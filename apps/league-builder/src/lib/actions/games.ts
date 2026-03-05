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

    revalidatePath(`/dashboard/games`);
    revalidatePath(`/dashboard/games/${gameId}`);

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

    revalidatePath(`/dashboard/games`);
    revalidatePath(`/dashboard/games/${gameId}`);

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

    revalidatePath(`/dashboard/games`);
    revalidatePath(`/dashboard/games/${gameId}`);

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

    revalidatePath(`/dashboard/games`);
    revalidatePath(`/dashboard/games/${gameId}`);

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
