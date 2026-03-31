'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Type definitions based on database schema enums
export type PlayerPosition = 'Forward' | 'Defense' | 'Goalie';
export type RosterStatus = 'active' | 'inactive' | 'injured' | 'suspended' | 'traded';
export type LeadershipRole = 'captain' | 'alternate_captain' | null;
export type StaffRole = 'Head Coach' | 'Assistant Coach' | 'Manager' | 'Trainer' | 'Equipment Manager' | 'Other';

interface AddPlayerToRosterParams {
  teamId: string;
  playerId: string;
  seasonId: string;
  jerseyNumber: number;
  position: PlayerPosition;
  leadershipRole?: LeadershipRole;
}

interface UpdateJerseyNumberParams {
  rosterId: string;
  newJerseyNumber: number;
}

interface AssignCaptainParams {
  teamId: string;
  playerId: string;
  seasonId: string;
  role: LeadershipRole;
}

interface UpdatePlayerStatusParams {
  rosterId: string;
  status: RosterStatus;
}

interface AddStaffMemberParams {
  teamId: string;
  personId: string;
  seasonId: string;
  role: StaffRole;
}

import { verifyCaptainOrAdminAccess } from './permissions';

/**
 * Add a player to team roster with jersey number validation
 */
export async function addPlayerToRoster(params: AddPlayerToRosterParams) {
  const { teamId, playerId, seasonId, jerseyNumber, position, leadershipRole } = params;

  // Verify access (captain or organization owner)
  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();

  try {
    // Check if jersey number is available using helper function
    const { data: jerseyAvailable, error: jerseyCheckError } = await supabase
      .rpc('is_jersey_available', {
        p_team_id: teamId,
        p_season_id: seasonId,
        p_jersey_number: jerseyNumber,
      });

    if (jerseyCheckError) {
      if (isDevelopment) {
        console.error('Error checking jersey availability:', jerseyCheckError);
      }
      return { error: 'Failed to validate jersey number' };
    }

    if (!jerseyAvailable) {
      return { error: `Jersey number ${jerseyNumber} is already in use` };
    }

    // Get team's division_id for the roster entry
    const { data: team } = await supabase
      .from('teams')
      .select('division_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return { error: 'Team not found' };
    }

    // If assigning captain role, check if there's already a captain
    if (leadershipRole === 'captain') {
      const { data: currentCaptain } = await supabase
        .rpc('get_team_captain', {
          p_team_id: teamId,
          p_season_id: seasonId,
        });

      if (currentCaptain && currentCaptain.length > 0) {
        return { error: 'Team already has a captain. Remove current captain first.' };
      }
    }

    // Insert roster entry (league_id auto-populated by trigger)
    const { data: roster, error: insertError } = await (supabase
      .from('team_rosters') as any)
      .insert({
        team_id: teamId,
        player_id: playerId,
        season_id: seasonId,
        division_id: team.division_id,
        jersey_number: jerseyNumber,
        position,
        status: 'active',
        leadership_role: leadershipRole || null,
        start_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      if (isDevelopment) {
        console.error('Error adding player to roster:', insertError);
      }

      // Handle specific constraint violations
      if (insertError.message.includes('already on another team in this division')) {
        return { error: 'Player is already on another team in this division this season' };
      }

      return { error: 'Failed to add player to roster' };
    }

    revalidatePath(`/teams/${teamId}`);
    revalidatePath(`/dashboard/teams/${teamId}`);
    revalidatePath(`/dashboard/captain/${teamId}`);
    return { success: true, data: roster };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in addPlayerToRoster:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update player's jersey number (creates new temporal record)
 */
export async function updateJerseyNumber(params: UpdateJerseyNumberParams) {
  const { rosterId, newJerseyNumber } = params;

  const supabase = await createClient();

  try {
    // Get current roster entry (avoid nested FK joins - use separate queries)
    const { data: currentRoster, error: fetchError } = await supabase
      .from('team_rosters')
      .select('*')
      .eq('id', rosterId)
      .single();

    if (fetchError || !currentRoster) {
      return { error: 'Roster entry not found' };
    }

    // Verify access (captain or organization owner) - this handles auth separately
    const access = await verifyCaptainOrAdminAccess(currentRoster.team_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    // Check if new jersey is available
    const { data: jerseyAvailable } = await supabase
      .rpc('is_jersey_available', {
        p_team_id: currentRoster.team_id,
        p_season_id: currentRoster.season_id,
        p_jersey_number: newJerseyNumber,
      });

    if (!jerseyAvailable) {
      return { error: `Jersey number ${newJerseyNumber} is already in use` };
    }

    // End current roster entry
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('team_rosters')
      .update({ end_date: now })
      .eq('id', rosterId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error ending current roster entry:', updateError);
      }
      return { error: 'Failed to update jersey number' };
    }

    // Create new roster entry with new jersey number (league_id auto-populated by trigger)
    const { data: newRoster, error: insertError } = await (supabase
      .from('team_rosters') as any)
      .insert({
        team_id: currentRoster.team_id,
        player_id: currentRoster.player_id,
        season_id: currentRoster.season_id,
        division_id: currentRoster.division_id,
        jersey_number: newJerseyNumber,
        position: currentRoster.position,
        status: currentRoster.status,
        leadership_role: currentRoster.leadership_role,
        start_date: now,
      })
      .select()
      .single();

    if (insertError) {
      if (isDevelopment) {
        console.error('Error creating new roster entry:', insertError);
      }
      return { error: 'Failed to create new roster entry' };
    }

    revalidatePath(`/teams/${currentRoster.team_id}`);
    return { success: true, data: newRoster };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in updateJerseyNumber:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Assign or remove captain/alternate captain designation
 */
export async function assignCaptain(params: AssignCaptainParams) {
  const { teamId, playerId, seasonId, role } = params;

  // Verify access (captain or organization owner)
  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // If assigning captain, check if there's already one
    if (role === 'captain') {
      const { data: currentCaptain } = await supabase
        .rpc('get_team_captain', {
          p_team_id: teamId,
          p_season_id: seasonId,
        });

      if (currentCaptain && currentCaptain.length > 0) {
        // Remove current captain designation
        await supabase
          .from('team_rosters')
          .update({ leadership_role: null })
          .eq('team_id', teamId)
          .eq('season_id', seasonId)
          .eq('leadership_role', 'captain')
          .is('end_date', null);
      }
    }

    // Update player's leadership role
    const { data: updated, error: updateError } = await supabase
      .from('team_rosters')
      .update({ leadership_role: role })
      .eq('team_id', teamId)
      .eq('player_id', playerId)
      .eq('season_id', seasonId)
      .is('end_date', null)
      .select()
      .single();

    if (updateError) {
      if (isDevelopment) {
        console.error('Error assigning captain:', updateError);
      }
      return { error: 'Failed to assign leadership role' };
    }

    revalidatePath(`/teams/${teamId}`);
    return { success: true, data: updated };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in assignCaptain:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update player's roster status (active, injured, suspended, etc.)
 */
export async function updatePlayerStatus(params: UpdatePlayerStatusParams) {
  const { rosterId, status } = params;

  const supabase = await createClient();

  try {
    // Get roster entry with team info
    const { data: roster, error: fetchError } = await supabase
      .from('team_rosters')
      .select('team_id')
      .eq('id', rosterId)
      .single();

    if (fetchError || !roster) {
      return { error: 'Roster entry not found' };
    }

    // Verify access (captain or organization owner)
    const access = await verifyCaptainOrAdminAccess(roster.team_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    // Update status
    const { data: updated, error: updateError } = await supabase
      .from('team_rosters')
      .update({ status })
      .eq('id', rosterId)
      .select()
      .single();

    if (updateError) {
      if (isDevelopment) {
        console.error('Error updating player status:', updateError);
      }
      return { error: 'Failed to update player status' };
    }

    revalidatePath(`/teams/${roster.team_id}`);
    return { success: true, data: updated };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in updatePlayerStatus:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Remove player from roster (sets end_date)
 */
export async function removePlayerFromRoster(rosterId: string) {
  const supabase = await createClient();

  try {
    // Get roster entry
    const { data: roster, error: fetchError } = await supabase
      .from('team_rosters')
      .select('team_id')
      .eq('id', rosterId)
      .single();

    if (fetchError || !roster) {
      return { error: 'Roster entry not found' };
    }

    // Verify access (captain or organization owner)
    const access = await verifyCaptainOrAdminAccess(roster.team_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    // Set end_date to now
    const { error: updateError } = await supabase
      .from('team_rosters')
      .update({ end_date: new Date().toISOString() })
      .eq('id', rosterId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error removing player from roster:', updateError);
      }
      return { error: 'Failed to remove player from roster' };
    }

    revalidatePath(`/teams/${roster.team_id}`);
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in removePlayerFromRoster:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Add staff member to team
 */
export async function addStaffMember(params: AddStaffMemberParams) {
  const { teamId, personId, seasonId, role } = params;

  // Verify access (captain or organization owner)
  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    const { data: staff, error: insertError } = await (supabase
      .from('team_staff') as any)
      .insert({
        team_id: teamId,
        user_id: personId,
        season_id: seasonId,
        role,
        start_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      if (isDevelopment) {
        console.error('Error adding staff member:', insertError);
      }
      return { error: 'Failed to add staff member' };
    }

    revalidatePath(`/teams/${teamId}`);
    return { success: true, data: staff };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in addStaffMember:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Remove staff member from team (sets end_date)
 */
export async function removeStaffMember(staffId: string) {
  const supabase = await createClient();

  try {
    // Get staff entry
    const { data: staff, error: fetchError } = await supabase
      .from('team_staff')
      .select('team_id')
      .eq('id', staffId)
      .single();

    if (fetchError || !staff) {
      return { error: 'Staff entry not found' };
    }

    // Verify access (captain or organization owner)
    const access = await verifyCaptainOrAdminAccess(staff.team_id);
    if (!access.authorized) {
      return { error: access.error || 'Not authorized' };
    }

    // Set end_date to now
    const { error: updateError } = await supabase
      .from('team_staff')
      .update({ end_date: new Date().toISOString() })
      .eq('id', staffId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error removing staff member:', updateError);
      }
      return { error: 'Failed to remove staff member' };
    }

    revalidatePath(`/teams/${staff.team_id}`);
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in removeStaffMember:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get current team roster (active players)
 */
export async function getTeamRoster(teamId: string, seasonId: string) {
  // Use service role — auth is verified by the caller (API route)
  const serviceClient = createServiceRoleClient();

  try {
    const { data: roster, error } = await serviceClient
      .rpc('get_team_roster', {
        p_team_id: teamId,
        p_season_id: seasonId,
      });

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching team roster:', error);
      }
      return { error: 'Failed to fetch team roster' };
    }

    return { success: true, data: roster || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamRoster:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get team staff members
 */
export async function getTeamStaff(teamId: string, seasonId: string) {
  const supabase = await createClient();

  try {
    const { data: staff, error } = await supabase
      .from('team_staff')
      .select(`
        *,
        profiles:person_id (
          id,
          full_name,
          email
        )
      `)
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .is('end_date', null)
      .order('role');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching team staff:', error);
      }
      return { error: 'Failed to fetch team staff' };
    }

    return { success: true, data: staff || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamStaff:', error);
    }
    return { error: 'An unexpected error occurred' };
  }
}
