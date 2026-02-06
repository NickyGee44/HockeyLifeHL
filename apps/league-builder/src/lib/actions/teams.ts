'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { verifyCaptainOrAdminAccess, verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

/** Sanitize input for use in PostgREST filter strings to prevent filter injection */
function sanitizeFilterInput(input: string): string {
  return input.replace(/[,.()"\\]/g, '');
}

// Types
export type TeamStatus = 'active' | 'inactive' | 'pending';

export interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  captain_id: string | null;
  league_id: string;
  division_id: string | null;
  home_venue_id: string | null;
  status: TeamStatus | null;
  max_roster_size: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TeamWithStats extends Team {
  roster_count: number;
  captain_name: string | null;
  division_name: string | null;
  venue_name: string | null;
}

export interface CreateTeamParams {
  leagueId: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  divisionId?: string;
  homeVenueId?: string;
  maxRosterSize?: number;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface UpdateTeamParams {
  teamId: string;
  name?: string;
  shortName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  divisionId?: string | null;
  homeVenueId?: string | null;
  status?: TeamStatus;
  maxRosterSize?: number;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  logoUrl?: string | null;
}

// NOTE: Helper functions moved to permissions.ts
// Use verifyLeagueOwnerAccess() and verifyCaptainOrAdminAccess() instead

/**
 * Get all teams for a league with stats
 */
export async function getLeagueTeams(leagueId: string, options?: { status?: TeamStatus; search?: string }) {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('teams')
      .select(`
        *,
        divisions:division_id (name),
        venues:home_venue_id (name),
        captain:captain_id (full_name)
      `)
      .eq('league_id', leagueId)
      .order('name');

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.search) {
      const safeSearch = sanitizeFilterInput(options.search);
      query = query.or(`name.ilike.%${safeSearch}%,short_name.ilike.%${safeSearch}%`);
    }

    const { data: teams, error } = await query;

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching league teams:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch teams' };
    }

    // Get roster counts for each team
    const teamIds = teams?.map(t => t.id) || [];
    const { data: rosterCounts } = await supabase
      .from('team_rosters')
      .select('team_id')
      .in('team_id', teamIds)
      .is('end_date', null);

    const countMap = new Map<string, number>();
    rosterCounts?.forEach(r => {
      countMap.set(r.team_id, (countMap.get(r.team_id) || 0) + 1);
    });

    const teamsWithStats = teams?.map(team => ({
      ...team,
      roster_count: countMap.get(team.id) || 0,
      captain_name: (team.captain as any)?.full_name || null,
      division_name: (team.divisions as any)?.name || null,
      venue_name: (team.venues as any)?.name || null,
    })) || [];

    return { success: true, data: teamsWithStats };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getLeagueTeams:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single team with full details
 */
export async function getTeam(teamId: string) {
  const supabase = await createClient();

  try {
    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        leagues!inner(id, name, organization_id, organizations!inner(owner_user_id)),
        divisions:division_id (id, name),
        venues:home_venue_id (id, name, address),
        captain:captain_id (id, full_name, email)
      `)
      .eq('id', teamId)
      .single();

    if (error || !team) {
      if (isDevelopment) {
        console.error('Error fetching team:', sanitizeErrorForLogging(error));
      }
      return { error: 'Team not found' };
    }

    // Get roster count
    const { count: rosterCount } = await supabase
      .from('team_rosters')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .is('end_date', null);

    return {
      success: true,
      data: {
        ...team,
        roster_count: rosterCount || 0,
        captain_name: (team.captain as any)?.full_name || null,
        division_name: (team.divisions as any)?.name || null,
        venue_name: (team.venues as any)?.name || null,
      }
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeam:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Create a new team
 */
export async function createTeam(params: CreateTeamParams) {
  const {
    leagueId,
    name,
    shortName,
    primaryColor,
    secondaryColor,
    divisionId,
    homeVenueId,
    maxRosterSize = 20,
    contactEmail,
    contactPhone,
    notes
  } = params;

  // Verify access (organization owner only for creating teams)
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Check for duplicate team name in league
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .eq('name', name)
      .single();

    if (existingTeam) {
      return { error: 'A team with this name already exists in the league' };
    }

    // Create team
    const { data: team, error: insertError } = await supabase
      .from('teams')
      .insert({
        league_id: leagueId,
        name,
        short_name: shortName,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        division_id: divisionId || null,
        home_venue_id: homeVenueId || null,
        max_roster_size: maxRosterSize,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        notes: notes || null,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      if (isDevelopment) {
        console.error('Error creating team:', sanitizeErrorForLogging(insertError));
      }
      return { error: 'Failed to create team' };
    }

    revalidatePath(`/dashboard/leagues/${leagueId}`);
    revalidatePath('/dashboard/teams');
    return { success: true, data: team };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in createTeam:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing team
 */
export async function updateTeam(params: UpdateTeamParams) {
  const { teamId, ...updates } = params;

  // Verify access (captain or organization owner)
  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Build update object
    const updateData: Record<string, any> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.shortName !== undefined) updateData.short_name = updates.shortName;
    if (updates.primaryColor !== undefined) updateData.primary_color = updates.primaryColor;
    if (updates.secondaryColor !== undefined) updateData.secondary_color = updates.secondaryColor;
    if (updates.divisionId !== undefined) updateData.division_id = updates.divisionId;
    if (updates.homeVenueId !== undefined) updateData.home_venue_id = updates.homeVenueId;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.maxRosterSize !== undefined) updateData.max_roster_size = updates.maxRosterSize;
    if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;

    updateData.updated_at = new Date().toISOString();

    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      if (isDevelopment) {
        console.error('Error updating team:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Failed to update team' };
    }

    revalidatePath(`/dashboard/teams/${teamId}`);
    revalidatePath('/dashboard/teams');
    return { success: true, data: team };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in updateTeam:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a team (soft delete by setting status to inactive)
 */
export async function deleteTeam(teamId: string) {
  // Verify access (captain or organization owner)
  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized || !access.team) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Check for active roster members
    const { count: rosterCount } = await supabase
      .from('team_rosters')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .is('end_date', null);

    if (rosterCount && rosterCount > 0) {
      return { error: 'Cannot delete team with active roster members. Remove all players first.' };
    }

    // Set status to inactive instead of hard delete
    const { error: updateError } = await supabase
      .from('teams')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', teamId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error deleting team:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Failed to delete team' };
    }

    revalidatePath(`/dashboard/leagues/${access.team.league_id}`);
    revalidatePath('/dashboard/teams');
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in deleteTeam:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Assign or update team captain
 */
export async function assignTeamCaptain(teamId: string, captainId: string | null) {
  // Verify access (captain or organization owner)
  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // If assigning a captain, verify they're on the roster
    if (captainId) {
      const { data: rosterEntry } = await supabase
        .from('team_rosters')
        .select('id')
        .eq('team_id', teamId)
        .eq('player_id', captainId)
        .is('end_date', null)
        .single();

      if (!rosterEntry) {
        return { error: 'Selected player is not on the team roster' };
      }
    }

    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update({ captain_id: captainId, updated_at: new Date().toISOString() })
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      if (isDevelopment) {
        console.error('Error assigning captain:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Failed to assign captain' };
    }

    revalidatePath(`/dashboard/teams/${teamId}`);
    return { success: true, data: team };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in assignTeamCaptain:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update team status
 */
export async function updateTeamStatus(teamId: string, status: TeamStatus) {
  // Verify access (captain or organization owner)
  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      if (isDevelopment) {
        console.error('Error updating team status:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Failed to update team status' };
    }

    revalidatePath(`/dashboard/teams/${teamId}`);
    revalidatePath('/dashboard/teams');
    return { success: true, data: team };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in updateTeamStatus:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Upload team logo to Supabase storage
 */
export async function uploadTeamLogo(teamId: string, file: File) {
  // Verify access (captain or organization owner)
  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' };
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { error: 'File too large. Maximum size is 2MB' };
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${teamId}-${Date.now()}.${ext}`;
    const path = `team-logos/${filename}`;

    // Upload to storage (use team-logos bucket as defined in migrations)
    const { error: uploadError } = await supabase.storage
      .from('team-logos')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      if (isDevelopment) {
        console.error('Error uploading logo:', sanitizeErrorForLogging(uploadError));
      }
      return { error: 'Failed to upload logo' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('team-logos')
      .getPublicUrl(path);

    // Update team with new logo URL
    const { error: updateError } = await supabase
      .from('teams')
      .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', teamId);

    if (updateError) {
      // Try to clean up uploaded file
      await supabase.storage.from('team-logos').remove([path]);
      return { error: 'Failed to update team with logo URL' };
    }

    revalidatePath(`/dashboard/teams/${teamId}`);
    return { success: true, data: { url: urlData.publicUrl } };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in uploadTeamLogo:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get teams for the current user (across all leagues)
 */
export async function getUserTeams(options?: { status?: TeamStatus; search?: string }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get organizations owned by user first (avoid FK join RLS issues)
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_user_id', user.id);

    if (!orgs || orgs.length === 0) {
      return { success: true, data: [] };
    }

    const orgIds = orgs.map(o => o.id);

    // Get all leagues in user's organizations
    const { data: leagues } = await supabase
      .from('leagues')
      .select('id, name')
      .in('organization_id', orgIds);

    if (!leagues || leagues.length === 0) {
      return { success: true, data: [] };
    }

    const leagueIds = leagues.map(l => l.id);
    const leagueMap = new Map(leagues.map(l => [l.id, l.name]));

    // Get teams without FK joins
    let query = supabase
      .from('teams')
      .select(`
        *,
        divisions:division_id (name)
      `)
      .in('league_id', leagueIds)
      .order('name');

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.search) {
      const safeSearch = sanitizeFilterInput(options.search);
      query = query.or(`name.ilike.%${safeSearch}%,short_name.ilike.%${safeSearch}%`);
    }

    const { data: teams, error } = await query;

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching user teams:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch teams' };
    }

    // Get roster counts
    const teamIds = teams?.map(t => t.id) || [];
    const { data: rosterCounts } = await supabase
      .from('team_rosters')
      .select('team_id')
      .in('team_id', teamIds)
      .is('end_date', null);

    const countMap = new Map<string, number>();
    rosterCounts?.forEach(r => {
      countMap.set(r.team_id, (countMap.get(r.team_id) || 0) + 1);
    });

    // Fetch captain info separately to avoid FK join RLS issues
    const captainIds = teams?.filter(t => t.captain_id).map(t => t.captain_id).filter((id): id is string => id !== null) || [];
    const captainMap = new Map<string, string>();
    if (captainIds.length > 0) {
      const { data: captains } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', captainIds);
      captains?.forEach(c => captainMap.set(c.id, c.full_name || ''));
    }

    const teamsWithStats = teams?.map(team => ({
      ...team,
      roster_count: countMap.get(team.id) || 0,
      captain_name: team.captain_id ? captainMap.get(team.captain_id) || null : null,
      division_name: (team.divisions as any)?.name || null,
      league_name: leagueMap.get(team.league_id) || null,
    })) || [];

    return { success: true, data: teamsWithStats };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getUserTeams:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get available divisions for a league
 */
export async function getLeagueDivisions(leagueId: string) {
  const supabase = await createClient();

  try {
    const { data: divisions, error } = await supabase
      .from('divisions')
      .select('id, name')
      .eq('league_id', leagueId)
      .order('name');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching divisions:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch divisions' };
    }

    return { success: true, data: divisions || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getLeagueDivisions:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get available venues for a league
 */
export async function getLeagueVenues(leagueId: string) {
  const supabase = await createClient();

  try {
    const { data: venues, error } = await supabase
      .from('venues')
      .select('id, name, address')
      .eq('league_id', leagueId)
      .order('name');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching venues:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch venues' };
    }

    return { success: true, data: venues || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getLeagueVenues:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}
