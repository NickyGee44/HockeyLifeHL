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
}

export interface GameOfficial {
  id: string;
  game_id: string;
  name: string;
  role: string;
  jersey_number: string | null;
  created_at: string;
  updated_at: string;
}

type StructuredRefereeRow = {
  id: string;
  display_name: string;
  max_games_per_week: number | null;
  preferred_days: number[] | null;
  total_assignments: number;
  can_referee: boolean;
  can_linesman: boolean;
};

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

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Assign a referee to a game via game_officials table
 */
export async function assignRefereeToGame(params: {
  gameId: string;
  leagueId: string;
  refereeName: string;
  role?: string;
  jerseyNumber?: string;
}): Promise<{ success: boolean; data?: GameOfficial; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();

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

  const { data, error } = await (supabase
    .from('game_officials') as any)
    .insert({
      game_id: params.gameId,
      name: params.refereeName,
      role: params.role || 'referee',
      jersey_number: params.jerseyNumber || null,
    })
    .select()
    .single();

  if (error) {
    if (isDevelopment) console.error('Error assigning referee:', error);
    return { success: false, error: 'Failed to assign referee' };
  }

  revalidatePath(`/dashboard/leagues/${params.leagueId}`);
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
    .select('id, game_id')
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

  revalidatePath(`/dashboard/leagues/${params.leagueId}`);
  return { success: true };
}

/**
 * Bulk assign a referee to multiple games
 */
export async function bulkAssignRefereeToGames(params: {
  leagueId: string;
  refereeName: string;
  gameIds: string[];
  role?: string;
}): Promise<{ success: boolean; assigned: number; skipped: number; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, assigned: 0, skipped: 0, error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();
  let assigned = 0;
  let skipped = 0;

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
        name: params.refereeName,
        role: params.role || 'referee',
      });

    if (error) {
      if (isDevelopment) console.error('Error in bulk assign:', error);
      skipped++;
    } else {
      assigned++;
    }
  }

  revalidatePath(`/dashboard/leagues/${params.leagueId}`);
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
        assigned_by: user.id,
        assignment_status: 'confirmed',
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

  revalidatePath(`/dashboard/leagues/${params.leagueId}`);
  return { success: true, data: result };
}
