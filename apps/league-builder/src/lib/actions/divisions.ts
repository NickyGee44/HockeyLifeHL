'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

// ==============================================================================
// TYPES
// ==============================================================================

export interface Division {
  id: string;
  league_id: string;
  name: string;
  description: string | null;
  skill_level: string | null;
  max_teams: number | null;
  game_duration_minutes: number;
  period_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface DivisionWithTeamCount extends Division {
  team_count: number;
}

export interface CreateDivisionParams {
  leagueId: string;
  name: string;
  description?: string;
  skillLevel?: string;
  maxTeams?: number;
  gameDurationMinutes?: number;
  periodCount?: number;
}

export interface UpdateDivisionParams {
  divisionId: string;
  name?: string;
  description?: string | null;
  skillLevel?: string | null;
  maxTeams?: number | null;
  gameDurationMinutes?: number;
  periodCount?: number;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==============================================================================
// READ OPERATIONS
// ==============================================================================

/**
 * Get all divisions for a league with team counts
 */
export async function getDivisions(leagueId: string): Promise<ActionResult<DivisionWithTeamCount[]>> {
  const supabase = await createClient();

  try {
    // Get divisions with teams joined
    const { data: divisions, error } = await supabase
      .from('divisions')
      .select(`
        *,
        teams:teams(count)
      `)
      .eq('league_id', leagueId)
      .order('name');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching divisions:', sanitizeErrorForLogging(error));
      }
      return { success: false, error: 'Failed to fetch divisions' };
    }

    // Transform to include team count
    const divisionsWithCount = (divisions || []).map(div => ({
      ...div,
      team_count: (div.teams as any)?.[0]?.count || 0,
      teams: undefined, // Remove the nested teams array
    })) as DivisionWithTeamCount[];

    return { success: true, data: divisionsWithCount };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getDivisions:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single division by ID
 */
export async function getDivision(divisionId: string): Promise<ActionResult<DivisionWithTeamCount>> {
  const supabase = await createClient();

  try {
    const { data: division, error } = await supabase
      .from('divisions')
      .select(`
        *,
        teams:teams(count)
      `)
      .eq('id', divisionId)
      .single();

    if (error || !division) {
      if (isDevelopment) {
        console.error('Error fetching division:', sanitizeErrorForLogging(error));
      }
      return { success: false, error: 'Division not found' };
    }

    return {
      success: true,
      data: {
        ...division,
        team_count: (division.teams as any)?.[0]?.count || 0,
        teams: undefined,
      } as DivisionWithTeamCount,
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getDivision:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get teams in a specific division
 */
export async function getDivisionTeams(divisionId: string): Promise<ActionResult<any[]>> {
  const supabase = await createClient();

  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        short_name,
        logo_url,
        primary_color,
        secondary_color,
        status,
        captain_id
      `)
      .eq('division_id', divisionId)
      .order('name');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching division teams:', sanitizeErrorForLogging(error));
      }
      return { success: false, error: 'Failed to fetch teams' };
    }

    // Fetch captain details separately to avoid FK join issues
    const teamsWithCaptains = await Promise.all(
      (teams || []).map(async (team) => {
        if (team.captain_id) {
          const { data: captain } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', team.captain_id)
            .single();
          return { ...team, captain: captain || null };
        }
        return { ...team, captain: null };
      })
    );

    return { success: true, data: teamsWithCaptains };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getDivisionTeams:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get unassigned teams (teams not in any division) for a league
 */
export async function getUnassignedTeams(leagueId: string): Promise<ActionResult<any[]>> {
  const supabase = await createClient();

  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        short_name,
        logo_url,
        primary_color,
        secondary_color,
        status,
        captain_id
      `)
      .eq('league_id', leagueId)
      .is('division_id', null)
      .eq('status', 'active')
      .order('name');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching unassigned teams:', sanitizeErrorForLogging(error));
      }
      return { success: false, error: 'Failed to fetch unassigned teams' };
    }

    // Fetch captain details separately to avoid FK join issues
    const teamsWithCaptains = await Promise.all(
      (teams || []).map(async (team) => {
        if (team.captain_id) {
          const { data: captain } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', team.captain_id)
            .single();
          return { ...team, captain: captain || null };
        }
        return { ...team, captain: null };
      })
    );

    return { success: true, data: teamsWithCaptains };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getUnassignedTeams:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// CREATE OPERATIONS
// ==============================================================================

/**
 * Create a new division in a league
 */
export async function createDivision(params: CreateDivisionParams): Promise<ActionResult<Division>> {
  const {
    leagueId,
    name,
    description,
    skillLevel,
    maxTeams,
    gameDurationMinutes = 60,
    periodCount = 3,
  } = params;

  // Verify access
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Check for duplicate division name in league
    const { data: existingDivision } = await supabase
      .from('divisions')
      .select('id')
      .eq('league_id', leagueId)
      .eq('name', name)
      .single();

    if (existingDivision) {
      return { success: false, error: 'A division with this name already exists in the league' };
    }

    // Create division
    const { data: division, error: insertError } = await supabase
      .from('divisions')
      .insert({
        league_id: leagueId,
        name,
        description: description || null,
        skill_level: skillLevel || null,
        max_teams: maxTeams || null,
        game_duration_minutes: gameDurationMinutes,
        period_count: periodCount,
      })
      .select()
      .single();

    if (insertError) {
      if (isDevelopment) {
        console.error('Error creating division:', sanitizeErrorForLogging(insertError));
      }
      return { success: false, error: 'Failed to create division' };
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/divisions`);
    return { success: true, data: division as Division };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in createDivision:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// UPDATE OPERATIONS
// ==============================================================================

/**
 * Update an existing division
 */
export async function updateDivision(params: UpdateDivisionParams): Promise<ActionResult<Division>> {
  const { divisionId, ...updates } = params;

  const supabase = await createClient();

  try {
    // Get division to verify league ownership
    const { data: division, error: fetchError } = await supabase
      .from('divisions')
      .select('league_id')
      .eq('id', divisionId)
      .single();

    if (fetchError || !division) {
      return { success: false, error: 'Division not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(division.league_id);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Not authorized' };
    }

    // Check for duplicate name if name is being updated
    if (updates.name) {
      const { data: existingDivision } = await supabase
        .from('divisions')
        .select('id')
        .eq('league_id', division.league_id)
        .eq('name', updates.name)
        .neq('id', divisionId)
        .single();

      if (existingDivision) {
        return { success: false, error: 'A division with this name already exists in the league' };
      }
    }

    // Build update object
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.skillLevel !== undefined) updateData.skill_level = updates.skillLevel;
    if (updates.maxTeams !== undefined) updateData.max_teams = updates.maxTeams;
    if (updates.gameDurationMinutes !== undefined) updateData.game_duration_minutes = updates.gameDurationMinutes;
    if (updates.periodCount !== undefined) updateData.period_count = updates.periodCount;

    const { data: updatedDivision, error: updateError } = await supabase
      .from('divisions')
      .update(updateData)
      .eq('id', divisionId)
      .select()
      .single();

    if (updateError) {
      if (isDevelopment) {
        console.error('Error updating division:', sanitizeErrorForLogging(updateError));
      }
      return { success: false, error: 'Failed to update division' };
    }

    revalidatePath(`/dashboard/leagues/${division.league_id}/divisions`);
    return { success: true, data: updatedDivision as Division };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in updateDivision:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// DELETE OPERATIONS
// ==============================================================================

/**
 * Delete a division
 * Teams will have their division_id set to NULL (handled by FK ON DELETE SET NULL)
 */
export async function deleteDivision(divisionId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
    // Get division to verify league ownership
    const { data: division, error: fetchError } = await supabase
      .from('divisions')
      .select('league_id')
      .eq('id', divisionId)
      .single();

    if (fetchError || !division) {
      return { success: false, error: 'Division not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(division.league_id);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Not authorized' };
    }

    // Delete division (teams will be unassigned automatically via FK constraint)
    const { error: deleteError } = await supabase
      .from('divisions')
      .delete()
      .eq('id', divisionId);

    if (deleteError) {
      if (isDevelopment) {
        console.error('Error deleting division:', sanitizeErrorForLogging(deleteError));
      }
      return { success: false, error: 'Failed to delete division' };
    }

    revalidatePath(`/dashboard/leagues/${division.league_id}/divisions`);
    return { success: true, data: undefined };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in deleteDivision:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// TEAM ASSIGNMENT OPERATIONS
// ==============================================================================

/**
 * Assign a single team to a division
 */
export async function assignTeamToDivision(
  teamId: string,
  divisionId: string | null
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
    // Get team to verify league ownership
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('league_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return { success: false, error: 'Team not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(team.league_id);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Not authorized' };
    }

    // If divisionId is provided, verify it belongs to the same league
    if (divisionId) {
      const { data: division, error: divError } = await supabase
        .from('divisions')
        .select('league_id, max_teams')
        .eq('id', divisionId)
        .single();

      if (divError || !division) {
        return { success: false, error: 'Division not found' };
      }

      if (division.league_id !== team.league_id) {
        return { success: false, error: 'Division does not belong to the same league as the team' };
      }

      // Check max_teams constraint
      if (division.max_teams) {
        const { count: currentTeamCount } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('division_id', divisionId);

        if (currentTeamCount && currentTeamCount >= division.max_teams) {
          return { success: false, error: `Division is full (max ${division.max_teams} teams)` };
        }
      }
    }

    // Update team's division
    const { error: updateError } = await supabase
      .from('teams')
      .update({ division_id: divisionId, updated_at: new Date().toISOString() })
      .eq('id', teamId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error assigning team to division:', sanitizeErrorForLogging(updateError));
      }
      return { success: false, error: 'Failed to assign team to division' };
    }

    revalidatePath(`/dashboard/leagues/${team.league_id}/divisions`);
    revalidatePath(`/dashboard/leagues/${team.league_id}/teams`);
    return { success: true, data: undefined };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in assignTeamToDivision:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Bulk assign teams to a division
 */
export async function bulkAssignTeamsToDivision(
  teamIds: string[],
  divisionId: string | null,
  leagueId: string
): Promise<ActionResult<{ assigned: number; failed: string[] }>> {
  // Verify access
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();
  const failed: string[] = [];
  let assigned = 0;

  try {
    // If divisionId is provided, verify it belongs to the league
    if (divisionId) {
      const { data: division, error: divError } = await supabase
        .from('divisions')
        .select('league_id, max_teams')
        .eq('id', divisionId)
        .single();

      if (divError || !division) {
        return { success: false, error: 'Division not found' };
      }

      if (division.league_id !== leagueId) {
        return { success: false, error: 'Division does not belong to this league' };
      }

      // Check max_teams constraint
      if (division.max_teams) {
        const { count: currentTeamCount } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('division_id', divisionId);

        const availableSpots = division.max_teams - (currentTeamCount || 0);
        if (teamIds.length > availableSpots) {
          return {
            success: false,
            error: `Division only has ${availableSpots} available spots (max ${division.max_teams} teams)`
          };
        }
      }
    }

    // Verify all teams belong to the league
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, league_id')
      .in('id', teamIds);

    if (teamsError) {
      return { success: false, error: 'Failed to verify teams' };
    }

    const invalidTeams = teams?.filter(t => t.league_id !== leagueId) || [];
    if (invalidTeams.length > 0) {
      return {
        success: false,
        error: `Some teams do not belong to this league: ${invalidTeams.map(t => t.id).join(', ')}`
      };
    }

    // Update all teams
    const { error: updateError } = await supabase
      .from('teams')
      .update({ division_id: divisionId, updated_at: new Date().toISOString() })
      .in('id', teamIds)
      .eq('league_id', leagueId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error bulk assigning teams:', sanitizeErrorForLogging(updateError));
      }
      return { success: false, error: 'Failed to assign teams to division' };
    }

    assigned = teamIds.length;

    revalidatePath(`/dashboard/leagues/${leagueId}/divisions`);
    revalidatePath(`/dashboard/leagues/${leagueId}/teams`);
    return { success: true, data: { assigned, failed } };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in bulkAssignTeamsToDivision:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Move a team from one division to another
 */
export async function moveTeamBetweenDivisions(
  teamId: string,
  fromDivisionId: string | null,
  toDivisionId: string | null
): Promise<ActionResult<void>> {
  // This is essentially the same as assignTeamToDivision
  return assignTeamToDivision(teamId, toDivisionId);
}

/**
 * Reassign all teams from one division to another (useful when deleting a division)
 */
export async function reassignDivisionTeams(
  fromDivisionId: string,
  toDivisionId: string | null
): Promise<ActionResult<{ reassigned: number }>> {
  const supabase = await createClient();

  try {
    // Get the source division to verify league ownership
    const { data: fromDivision, error: divError } = await supabase
      .from('divisions')
      .select('league_id')
      .eq('id', fromDivisionId)
      .single();

    if (divError || !fromDivision) {
      return { success: false, error: 'Source division not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(fromDivision.league_id);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Not authorized' };
    }

    // If toDivisionId is provided, verify it belongs to the same league
    if (toDivisionId) {
      const { data: toDivision, error: toError } = await supabase
        .from('divisions')
        .select('league_id')
        .eq('id', toDivisionId)
        .single();

      if (toError || !toDivision) {
        return { success: false, error: 'Target division not found' };
      }

      if (toDivision.league_id !== fromDivision.league_id) {
        return { success: false, error: 'Target division must be in the same league' };
      }
    }

    // Get count of teams to reassign
    const { count: teamCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('division_id', fromDivisionId);

    // Reassign all teams
    const { error: updateError } = await supabase
      .from('teams')
      .update({ division_id: toDivisionId, updated_at: new Date().toISOString() })
      .eq('division_id', fromDivisionId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error reassigning division teams:', sanitizeErrorForLogging(updateError));
      }
      return { success: false, error: 'Failed to reassign teams' };
    }

    revalidatePath(`/dashboard/leagues/${fromDivision.league_id}/divisions`);
    revalidatePath(`/dashboard/leagues/${fromDivision.league_id}/teams`);
    return { success: true, data: { reassigned: teamCount || 0 } };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in reassignDivisionTeams:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}
