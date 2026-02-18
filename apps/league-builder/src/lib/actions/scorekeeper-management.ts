'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ==============================================================================
// CONSTANTS
// ==============================================================================

const MAX_BULK_OPERATIONS = 100;

// ==============================================================================
// INPUT VALIDATION HELPERS
// ==============================================================================

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeError(error: unknown, context: string): string {
  console.error(`Error in ${context}:`, error);

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

export interface LeagueScorekeeper {
  id: string;
  league_id: string;
  scorekeeper_id: string;
  status: 'active' | 'inactive';
  hourly_rate: number | null;
  hourly_rate_cents: number;
  notes: string | null;
  can_edit_games: boolean;
  can_verify_games: boolean;
  hired_date: string | null;
  created_at: string;
  updated_at: string;
  total_assignments: number;
  completed_assignments: number;
  preferred_days: number[] | null;
  max_games_per_week: number | null;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  is_active: boolean;
  // Joined data from profiles table
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export interface GameWithScorekeeper {
  id: string;
  scheduled_at: string;
  status: string;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
  scorekeeper_assignment?: {
    id: string;
    scorekeeper_id: string;
    scorekeeper_name: string | null;
    assigned_at: string;
  };
}

export interface AutoAssignOptions {
  seasonId?: string;
  dateFrom?: string;
  dateTo?: string;
  strategy: 'round_robin' | 'least_assigned' | 'availability_based';
  overwriteExisting?: boolean;
  gameIds?: string[];
}

export interface AutoAssignResult {
  gamesProcessed: number;
  gamesAssigned: number;
  gamesSkipped: number;
  conflictsDetected: number;
  assignments: Array<{ gameId: string; scorekeeperId: string; scorekeeperName: string }>;
  skipped: Array<{ gameId: string; reason: string }>;
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

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  // Also check if user is the league creator
  const { data: league } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', leagueId)
    .single();

  const isCreator = league?.created_by === user.id;
  const isAdmin = membership && ['owner', 'admin'].includes(membership.role);

  if (isCreator || isAdmin) {
    return { userId: user.id };
  }

  // Fallback: platform admins get owner-level access to all leagues
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.is_platform_admin === true) {
    return { userId: user.id };
  }

  return null;
}

// ==============================================================================
// GET LEAGUE SCOREKEEPERS
// ==============================================================================

export async function getLeagueScorekepers(
  leagueId: string
): Promise<ActionResult<{ scorekeepers: LeagueScorekeeper[]; total: number }>> {
  try {
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    const { data, error, count } = await supabase
      .from('league_scorekeepers')
      .select(`
        *,
        profile:profiles!league_scorekeepers_scorekeeper_id_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: sanitizeError(error, 'getLeagueScorekepers') };
    }

    return {
      success: true,
      data: {
        scorekeepers: (data || []) as LeagueScorekeeper[],
        total: count || 0,
      },
    };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'getLeagueScorekepers') };
  }
}

// ==============================================================================
// ADD SCOREKEEPER TO LEAGUE
// ==============================================================================

export async function addScorekeeperToLeague(params: {
  leagueId: string;
  scorekeeperId?: string; // Optional - for existing users
  email: string;
  displayName: string;
  hourlyRate?: number;
  notes?: string;
}): Promise<ActionResult<LeagueScorekeeper>> {
  try {
    const { leagueId, scorekeeperId, email, displayName, hourlyRate, notes } = params;

    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (!isValidEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (!displayName.trim()) {
      return { success: false, error: 'Display name is required' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    // If scorekeeperId not provided, try to find user by email
    let finalScorekeeperId = scorekeeperId;
    if (!finalScorekeeperId) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        finalScorekeeperId = existingUser.id;
      }
    }

    // Check if already added
    if (finalScorekeeperId) {
      const { data: existing } = await supabase
        .from('league_scorekeepers')
        .select('id')
        .eq('league_id', leagueId)
        .eq('scorekeeper_id', finalScorekeeperId)
        .single();

      if (existing) {
        return { success: false, error: 'This scorekeeper is already added to the league' };
      }
    }

    // Create the league scorekeeper record
    // If no user found by email, we'll create a placeholder entry
    const insertData = {
      league_id: leagueId,
      hourly_rate: hourlyRate || null,
      notes: notes || null,
      email: email.toLowerCase(),
      display_name: displayName.trim(),
      status: 'active' as const,
      is_active: true,
      hired_date: new Date().toISOString().split('T')[0],
      scorekeeper_id: finalScorekeeperId || auth.userId,
    };

    const { data, error } = await supabase
      .from('league_scorekeepers')
      .insert(insertData)
      .select(`
        *,
        profile:profiles!league_scorekeepers_scorekeeper_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      return { success: false, error: sanitizeError(error, 'addScorekeeperToLeague') };
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/settings/scorekeepers`);

    return { success: true, data: data as LeagueScorekeeper };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'addScorekeeperToLeague') };
  }
}

// ==============================================================================
// UPDATE SCOREKEEPER
// ==============================================================================

export async function updateScorekeeper(params: {
  id: string;
  leagueId: string;
  status?: 'active' | 'inactive';
  hourlyRate?: number | null;
  notes?: string | null;
  displayName?: string;
  maxGamesPerWeek?: number | null;
  preferredDays?: number[] | null;
}): Promise<ActionResult<LeagueScorekeeper>> {
  try {
    const { id, leagueId, ...updates } = params;

    if (!isValidUUID(id) || !isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) {
      updateData.status = updates.status;
      updateData.is_active = updates.status === 'active';
    }
    if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
    if (updates.maxGamesPerWeek !== undefined) updateData.max_games_per_week = updates.maxGamesPerWeek;
    if (updates.preferredDays !== undefined) updateData.preferred_days = updates.preferredDays;

    const { data, error } = await supabase
      .from('league_scorekeepers')
      .update(updateData)
      .eq('id', id)
      .eq('league_id', leagueId)
      .select(`
        *,
        profile:profiles!league_scorekeepers_scorekeeper_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      return { success: false, error: sanitizeError(error, 'updateScorekeeper') };
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/settings/scorekeepers`);

    return { success: true, data: data as LeagueScorekeeper };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'updateScorekeeper') };
  }
}

// ==============================================================================
// REMOVE SCOREKEEPER FROM LEAGUE
// ==============================================================================

export async function removeScorekeeperFromLeague(params: {
  id: string;
  leagueId: string;
}): Promise<ActionResult<void>> {
  try {
    const { id, leagueId } = params;

    if (!isValidUUID(id) || !isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    const { error } = await supabase
      .from('league_scorekeepers')
      .delete()
      .eq('id', id)
      .eq('league_id', leagueId);

    if (error) {
      return { success: false, error: sanitizeError(error, 'removeScorekeeperFromLeague') };
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/settings/scorekeepers`);

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'removeScorekeeperFromLeague') };
  }
}

// ==============================================================================
// GET GAMES FOR SCOREKEEPER ASSIGNMENT
// ==============================================================================

export async function getGamesForScorekeeperAssignment(params: {
  leagueId: string;
  seasonId?: string;
  dateFrom?: string;
  dateTo?: string;
  unassignedOnly?: boolean;
}): Promise<ActionResult<GameWithScorekeeper[]>> {
  try {
    const { leagueId, seasonId, dateFrom, dateTo, unassignedOnly } = params;

    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
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
        id,
        scheduled_at,
        status,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name),
        scorekeeper_assignments:game_scorekeeper_assignments(
          id,
          scorekeeper_id,
          assigned_at,
          scorekeeper:profiles!game_scorekeeper_assignments_scorekeeper_id_fkey(full_name)
        )
      `)
      .eq('league_id', leagueId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true });

    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    if (dateFrom) {
      query = query.gte('scheduled_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('scheduled_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: sanitizeError(error, 'getGamesForScorekeeperAssignment') };
    }

    // Transform the data
    let games = (data || []).map((game: any) => {
      const assignment = game.scorekeeper_assignments?.[0];
      return {
        id: game.id,
        scheduled_at: game.scheduled_at,
        status: game.status,
        home_team: game.home_team,
        away_team: game.away_team,
        scorekeeper_assignment: assignment ? {
          id: assignment.id,
          scorekeeper_id: assignment.scorekeeper_id,
          scorekeeper_name: assignment.scorekeeper?.full_name || null,
          assigned_at: assignment.assigned_at,
        } : undefined,
      };
    });

    // Filter unassigned only if requested
    if (unassignedOnly) {
      games = games.filter((g: GameWithScorekeeper) => !g.scorekeeper_assignment);
    }

    return { success: true, data: games as GameWithScorekeeper[] };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'getGamesForScorekeeperAssignment') };
  }
}

// ==============================================================================
// BULK ASSIGN SCOREKEEPERS
// ==============================================================================

export async function bulkAssignScorekepers(params: {
  leagueId: string;
  assignments: Array<{ gameId: string; scorekeeperId: string }>;
}): Promise<ActionResult<{ assigned: number; failed: string[] }>> {
  try {
    const { leagueId, assignments } = params;

    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (assignments.length === 0) {
      return { success: false, error: 'No assignments provided' };
    }

    if (assignments.length > MAX_BULK_OPERATIONS) {
      return { success: false, error: `Cannot assign more than ${MAX_BULK_OPERATIONS} games at once` };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();
    const assigned: string[] = [];
    const failed: string[] = [];

    for (const { gameId, scorekeeperId } of assignments) {
      if (!isValidUUID(gameId) || !isValidUUID(scorekeeperId)) {
        failed.push(gameId);
        continue;
      }

      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('game_scorekeeper_assignments')
        .select('id')
        .eq('game_id', gameId)
        .single();

      if (existing) {
        // Update existing assignment
        const { error } = await supabase
          .from('game_scorekeeper_assignments')
          .update({
            scorekeeper_id: scorekeeperId,
            assigned_by: auth.userId,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          failed.push(gameId);
        } else {
          assigned.push(gameId);
        }
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('game_scorekeeper_assignments')
          .insert({
            game_id: gameId,
            scorekeeper_id: scorekeeperId,
            league_id: leagueId,
            assigned_by: auth.userId,
            assigned_at: new Date().toISOString(),
          });

        if (error) {
          failed.push(gameId);
        } else {
          assigned.push(gameId);
        }
      }
    }

    // Update scorekeeper assignment counts
    const scorekeeperCounts = new Map<string, number>();
    for (const { gameId, scorekeeperId } of assignments) {
      if (assigned.includes(gameId)) {
        scorekeeperCounts.set(scorekeeperId, (scorekeeperCounts.get(scorekeeperId) || 0) + 1);
      }
    }
    for (const [scorekeeperId, count] of scorekeeperCounts.entries()) {
      // Find the league_scorekeeper record
      const { data: lsk } = await supabase
        .from('league_scorekeepers')
        .select('id')
        .eq('league_id', leagueId)
        .eq('scorekeeper_id', scorekeeperId)
        .maybeSingle();

      if (lsk) {
        await supabase.rpc('increment_scorekeeper_assignments', {
          p_league_scorekeeper_id: lsk.id,
          p_count: count,
        });
      }
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/settings/scorekeepers`);
    revalidatePath(`/dashboard/leagues/${leagueId}/games`);

    return { success: true, data: { assigned: assigned.length, failed } };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'bulkAssignScorekepers') };
  }
}

// ==============================================================================
// BULK UNASSIGN SCOREKEEPERS
// ==============================================================================

export async function bulkUnassignScorekepers(params: {
  leagueId: string;
  gameIds: string[];
}): Promise<ActionResult<{ unassigned: number; failed: string[] }>> {
  try {
    const { leagueId, gameIds } = params;

    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (gameIds.length === 0) {
      return { success: false, error: 'No games selected' };
    }

    if (gameIds.length > MAX_BULK_OPERATIONS) {
      return { success: false, error: `Cannot unassign more than ${MAX_BULK_OPERATIONS} games at once` };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();
    const unassigned: string[] = [];
    const failed: string[] = [];

    for (const gameId of gameIds) {
      if (!isValidUUID(gameId)) {
        failed.push(gameId);
        continue;
      }

      const { error } = await supabase
        .from('game_scorekeeper_assignments')
        .delete()
        .eq('game_id', gameId)
        .eq('league_id', leagueId);

      if (error) {
        failed.push(gameId);
      } else {
        unassigned.push(gameId);
      }
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/settings/scorekeepers`);
    revalidatePath(`/dashboard/leagues/${leagueId}/games`);

    return { success: true, data: { unassigned: unassigned.length, failed } };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'bulkUnassignScorekepers') };
  }
}

// ==============================================================================
// AUTO-ASSIGN SCOREKEEPERS
// ==============================================================================

export async function autoAssignScorekepers(params: {
  leagueId: string;
  options: AutoAssignOptions;
}): Promise<ActionResult<AutoAssignResult>> {
  try {
    const { leagueId, options } = params;

    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createServiceRoleClient();

    // Create auto-assign log entry
    const { data: logEntry, error: logError } = await supabase
      .from('scorekeeper_auto_assign_log')
      .insert({
        league_id: leagueId,
        season_id: options.seasonId || null,
        assignment_strategy: options.strategy,
        triggered_by: auth.userId,
        status: 'running',
      })
      .select('id')
      .single();
    if (logError) {
      console.error('Failed to create log entry:', logError);
    }

    // Get active scorekeepers
    const { data: scorekeepers, error: skError } = await supabase
      .from('league_scorekeepers')
      .select('*')
      .eq('league_id', leagueId)
      .eq('status', 'active');

    if (skError || !scorekeepers || scorekeepers.length === 0) {
      return { success: false, error: 'No active scorekeepers found for this league' };
    }

    // Get games to assign
    let gamesQuery = supabase
      .from('games')
      .select(`
        id,
        scheduled_at,
        status,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name)
      `)
      .eq('league_id', leagueId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true });

    if (options.gameIds && options.gameIds.length > 0) {
      gamesQuery = gamesQuery.in('id', options.gameIds);
    } else {
      if (options.seasonId) {
        gamesQuery = gamesQuery.eq('season_id', options.seasonId);
      }
      if (options.dateFrom) {
        gamesQuery = gamesQuery.gte('scheduled_at', options.dateFrom);
      }
      if (options.dateTo) {
        gamesQuery = gamesQuery.lte('scheduled_at', options.dateTo);
      }
    }

    const { data: games, error: gamesError } = await gamesQuery;

    if (gamesError || !games || games.length === 0) {
      return { success: false, error: 'No games found matching the criteria' };
    }

    // Get existing assignments to check for conflicts
    const { data: existingAssignments } = await supabase
      .from('game_scorekeeper_assignments')
      .select('game_id, scorekeeper_id')
      .eq('league_id', leagueId)
      .in('game_id', games.map(g => g.id));

    const existingMap = new Map(
      (existingAssignments || []).map(a => [a.game_id, a.scorekeeper_id])
    );

    // Track assignments for round-robin using actual total_assignments column
    const scorekeeperAssignments = new Map<string, number>();
    scorekeepers.forEach(sk => {
      scorekeeperAssignments.set(sk.scorekeeper_id, (sk as any).total_assignments || 0);
    });

    // Track conflicts (same scorekeeper at same time)
    const timeslotAssignments = new Map<string, string>(); // time -> scorekeeper_id

    const result: AutoAssignResult = {
      gamesProcessed: games.length,
      gamesAssigned: 0,
      gamesSkipped: 0,
      conflictsDetected: 0,
      assignments: [],
      skipped: [],
    };

    for (const game of games) {
      // Skip if already assigned and not overwriting
      if (existingMap.has(game.id) && !options.overwriteExisting) {
        result.gamesSkipped++;
        result.skipped.push({
          gameId: game.id,
          reason: 'Already has scorekeeper assigned',
        });
        continue;
      }

      // Find available scorekeeper based on strategy
      let selectedScorekeeper: typeof scorekeepers[0] | null = null;
      const gameTime = new Date(game.scheduled_at).toISOString();

      // Sort scorekeepers by assignment count for round-robin
      const sortedScorekeppers = [...scorekeepers].sort((a, b) => {
        const aCount = scorekeeperAssignments.get(a.scorekeeper_id) || 0;
        const bCount = scorekeeperAssignments.get(b.scorekeeper_id) || 0;
        return aCount - bCount;
      });

      for (const sk of sortedScorekeppers) {
        // Check for time conflict
        if (timeslotAssignments.has(gameTime) && timeslotAssignments.get(gameTime) === sk.scorekeeper_id) {
          result.conflictsDetected++;
          continue;
        }

        // Check max games per week limit
        const skMaxGames = (sk as any).max_games_per_week;
        if (skMaxGames && skMaxGames > 0) {
          const weekStart = new Date(game.scheduled_at);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const weekGames = games.filter(g => {
            const gDate = new Date(g.scheduled_at);
            return gDate >= weekStart && gDate < weekEnd;
          });
          const weekAssignments = weekGames.filter(g =>
            result.assignments.some(a => a.gameId === g.id && a.scorekeeperId === sk.scorekeeper_id)
          ).length;
          if (weekAssignments >= skMaxGames) {
            continue;
          }
        }

        // Check preferred days
        const skPreferredDays = (sk as any).preferred_days;
        if (skPreferredDays && Array.isArray(skPreferredDays) && skPreferredDays.length > 0) {
          const gameDay = new Date(game.scheduled_at).getDay();
          if (!skPreferredDays.includes(gameDay)) {
            // Skip to next if there are other options, but remember this one as fallback
            if (!selectedScorekeeper) {
              selectedScorekeeper = sk;
            }
            continue;
          }
        }

        selectedScorekeeper = sk;
        break;
      }

      if (!selectedScorekeeper) {
        result.gamesSkipped++;
        result.skipped.push({
          gameId: game.id,
          reason: 'No available scorekeeper found',
        });
        continue;
      }

      // Make the assignment
      const { error: assignError } = existingMap.has(game.id)
        ? await supabase
            .from('game_scorekeeper_assignments')
            .update({
              scorekeeper_id: selectedScorekeeper.scorekeeper_id,
              assigned_by: auth.userId,
              assigned_at: new Date().toISOString(),
            })
            .eq('game_id', game.id)
        : await supabase
            .from('game_scorekeeper_assignments')
            .insert({
              game_id: game.id,
              scorekeeper_id: selectedScorekeeper.scorekeeper_id,
              league_id: leagueId,
              assigned_by: auth.userId,
              assigned_at: new Date().toISOString(),
            });

      if (assignError) {
        result.gamesSkipped++;
        result.skipped.push({
          gameId: game.id,
          reason: 'Database error',
        });
        continue;
      }

      // Update tracking
      timeslotAssignments.set(gameTime, selectedScorekeeper.scorekeeper_id);
      scorekeeperAssignments.set(
        selectedScorekeeper.scorekeeper_id,
        (scorekeeperAssignments.get(selectedScorekeeper.scorekeeper_id) || 0) + 1
      );

      result.gamesAssigned++;
      result.assignments.push({
        gameId: game.id,
        scorekeeperId: selectedScorekeeper.scorekeeper_id,
        scorekeeperName: (selectedScorekeeper as any).display_name || (selectedScorekeeper as any).email || 'Scorekeeper',
      });
    }

    // Update assignment counts for scorekeepers
    const scorekeeperCountUpdates = new Map<string, number>();
    for (const assignment of result.assignments) {
      const currentCount = scorekeeperCountUpdates.get(assignment.scorekeeperId) || 0;
      scorekeeperCountUpdates.set(assignment.scorekeeperId, currentCount + 1);
    }
    for (const [skId, count] of scorekeeperCountUpdates.entries()) {
      // Find the league_scorekeeper record by scorekeeper_id
      const { data: lsk } = await supabase
        .from('league_scorekeepers')
        .select('id, total_assignments')
        .eq('league_id', leagueId)
        .eq('scorekeeper_id', skId)
        .maybeSingle();

      if (lsk) {
        await supabase
          .from('league_scorekeepers')
          .update({
            total_assignments: ((lsk as any).total_assignments || 0) + count,
          })
          .eq('id', lsk.id);
      }
    }

    // Update auto-assign log entry
    if (logEntry) {
      await supabase
        .from('scorekeeper_auto_assign_log')
        .update({
          games_processed: result.gamesProcessed,
          games_assigned: result.gamesAssigned,
          games_skipped: result.gamesSkipped,
          conflicts_detected: result.conflictsDetected,
          assignments: result.assignments as any,
          skipped_games: result.skipped as any,
          completed_at: new Date().toISOString(),
          status: result.gamesAssigned > 0 ? 'completed' : 'partial',
        })
        .eq('id', logEntry.id);
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/settings/scorekeepers`);
    revalidatePath(`/dashboard/leagues/${leagueId}/games`);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'autoAssignScorekepers') };
  }
}

// ==============================================================================
// IMPORT SCOREKEEPERS FROM CSV
// ==============================================================================

export async function importScorekepersFromCSV(params: {
  leagueId: string;
  csvData: Array<{ email: string; name: string; hourlyRate?: number }>;
}): Promise<ActionResult<{ imported: number; skipped: number; errors: string[] }>> {
  try {
    const { leagueId, csvData } = params;

    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (csvData.length === 0) {
      return { success: false, error: 'No data to import' };
    }

    if (csvData.length > MAX_BULK_OPERATIONS) {
      return { success: false, error: `Cannot import more than ${MAX_BULK_OPERATIONS} scorekeepers at once` };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of csvData) {
      if (!row.email || !isValidEmail(row.email)) {
        errors.push(`Invalid email: ${row.email}`);
        skipped++;
        continue;
      }

      if (!row.name || !row.name.trim()) {
        errors.push(`Missing name for email: ${row.email}`);
        skipped++;
        continue;
      }

      const result = await addScorekeeperToLeague({
        leagueId,
        email: row.email,
        displayName: row.name,
        hourlyRate: row.hourlyRate,
      });

      if (result.success) {
        imported++;
      } else {
        const errorMessage = result.error;
        if (errorMessage.includes('already added')) {
          skipped++;
        } else {
          errors.push(`${row.email}: ${errorMessage}`);
          skipped++;
        }
      }
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/settings/scorekeepers`);

    return { success: true, data: { imported, skipped, errors } };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'importScorekepersFromCSV') };
  }
}

// ==============================================================================
// EXPORT SCOREKEEPERS
// ==============================================================================

export async function exportScorekepers(
  leagueId: string
): Promise<ActionResult<Array<{
  name: string;
  email: string;
  status: string;
  hourlyRate: number | null;
  totalAssignments: number;
  completedAssignments: number;
  hiredDate: string | null;
}>>> {
  try {
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await getLeagueScorekepers(leagueId);

    if (!result.success) {
      return result as ActionResult<never>;
    }

    const exportData = result.data.scorekeepers.map(sk => ({
      name: sk.display_name || sk.profile?.full_name || '',
      email: sk.email || sk.profile?.email || '',
      status: sk.status,
      hourlyRate: sk.hourly_rate,
      totalAssignments: sk.total_assignments ?? 0,
      completedAssignments: sk.completed_assignments ?? 0,
      hiredDate: sk.hired_date,
    }));

    return { success: true, data: exportData };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'exportScorekepers') };
  }
}
