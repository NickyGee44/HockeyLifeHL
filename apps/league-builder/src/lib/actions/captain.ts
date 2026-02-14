'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Types for roster import
export interface RosterImportConflict {
  playerId: string;
  playerName: string;
  reason: 'already_on_roster' | 'jersey_taken';
  jerseyNumber?: number;
}

export interface RosterImportResult {
  success: boolean;
  copiedCount?: number;
  skippedCount?: number;
  conflicts?: RosterImportConflict[];
  error?: string;
}

export interface PreviousSeasonPlayer {
  player_id: string;
  player_name: string;
  jersey_number: number | null;
  position: string | null;
  email: string | null;
}

// Types
export interface TeamJoinRequest {
  id: string;
  team_id: string;
  player_id: string;
  season_id: string;
  league_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  player?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
  };
}

export interface CaptainTeamOverview {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string | null;
  league_id: string;
  league_name: string | null;
  season_id: string | null;
  season_name: string | null;
  division_name: string | null;
  roster_count: number;
  max_roster_size: number | null;
  pending_requests_count: number;
  upcoming_games_count: number;
}

/**
 * Verify that the current user is the captain of the specified team.
 * Platform admins are granted access as a fallback.
 */
async function verifyCaptainAccess(teamId: string): Promise<{ authorized: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  // Check if user is the captain of this team
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, captain_id')
    .eq('id', teamId)
    .single();

  if (error || !team) {
    if (isDevelopment) {
      console.error('Error fetching team for captain verification:', sanitizeErrorForLogging(error));
    }
    return { authorized: false, error: 'Team not found' };
  }

  if (team.captain_id === user.id) {
    return { authorized: true };
  }

  // Fallback: platform admins can access any team's captain view
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.is_platform_admin === true) {
    return { authorized: true };
  }

  return { authorized: false, error: 'You must be the team captain to access this page' };
}

/**
 * Get all teams where the current user is the captain
 */
export async function getCaptainTeams() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get all teams where user is captain
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
        max_roster_size,
        league_id,
        leagues!inner(id, name),
        divisions:division_id(name)
      `)
      .eq('captain_id', user.id)
      .eq('status', 'active')
      .order('name');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching captain teams:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch your teams' };
    }

    if (!teams || teams.length === 0) {
      return { success: true, data: [] };
    }

    const teamIds = teams.map(t => t.id);

    // Get roster counts for each team
    const { data: rosterCounts } = await supabase
      .from('team_rosters')
      .select('team_id')
      .in('team_id', teamIds)
      .eq('status', 'active')
      .is('end_date', null);

    const rosterCountMap = new Map<string, number>();
    rosterCounts?.forEach(r => {
      rosterCountMap.set(r.team_id, (rosterCountMap.get(r.team_id) || 0) + 1);
    });

    // Get pending join requests count for each team
    const { data: pendingRequests } = await supabase
      .from('team_join_requests')
      .select('team_id')
      .in('team_id', teamIds)
      .eq('status', 'pending');

    const pendingCountMap = new Map<string, number>();
    pendingRequests?.forEach(r => {
      pendingCountMap.set(r.team_id, (pendingCountMap.get(r.team_id) || 0) + 1);
    });

    // Get current season for each league
    const leagueIds = [...new Set(teams.map(t => t.league_id))];
    const { data: currentSeasons } = await supabase
      .from('seasons')
      .select('id, name, league_id, start_date, end_date')
      .in('league_id', leagueIds)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString());

    const seasonMap = new Map(currentSeasons?.map(s => [s.league_id, s]) || []);

    // Get upcoming games count for each team
    const { data: upcomingGames } = await supabase
      .from('games')
      .select('home_team_id, away_team_id')
      .in('home_team_id', teamIds)
      .or(`away_team_id.in.(${teamIds.join(',')})`)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    const upcomingGamesMap = new Map<string, number>();
    upcomingGames?.forEach(g => {
      if (teamIds.includes(g.home_team_id)) {
        upcomingGamesMap.set(g.home_team_id, (upcomingGamesMap.get(g.home_team_id) || 0) + 1);
      }
      if (teamIds.includes(g.away_team_id)) {
        upcomingGamesMap.set(g.away_team_id, (upcomingGamesMap.get(g.away_team_id) || 0) + 1);
      }
    });

    const teamsWithStats: CaptainTeamOverview[] = teams.map(team => {
      const season = seasonMap.get(team.league_id);
      return {
        ...team,
        league_name: (team.leagues as any)?.name || null,
        season_id: season?.id || null,
        season_name: season?.name || null,
        division_name: (team.divisions as any)?.name || null,
        roster_count: rosterCountMap.get(team.id) || 0,
        pending_requests_count: pendingCountMap.get(team.id) || 0,
        upcoming_games_count: upcomingGamesMap.get(team.id) || 0,
      };
    });

    return { success: true, data: teamsWithStats };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getCaptainTeams:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get detailed captain dashboard data for a specific team
 */
export async function getCaptainDashboard(teamId: string) {
  // Verify captain access
  const access = await verifyCaptainAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Get team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        leagues!inner(id, name, organization_id),
        divisions:division_id(id, name),
        venues:home_venue_id(id, name, address)
      `)
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      if (isDevelopment) {
        console.error('Error fetching team:', sanitizeErrorForLogging(teamError));
      }
      return { error: 'Team not found' };
    }

    // Get roster count
    const { count: rosterCount } = await supabase
      .from('team_rosters')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active')
      .is('end_date', null);

    // Get pending requests count
    const { count: pendingRequestsCount } = await supabase
      .from('team_join_requests')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'pending');

    // Get current season
    const { data: currentSeason } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date')
      .eq('league_id', team.league_id)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .single();

    // Get upcoming games
    const { data: upcomingGamesRaw } = await supabase
      .from('games')
      .select(`
        id,
        scheduled_at,
        home_team_id,
        away_team_id,
        location,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url)
      `)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5);

    // Transform to expected Game type - there's no FK to venues, use location string
    const upcomingGames = (upcomingGamesRaw || []).map(g => ({
      ...g,
      venue: g.location ? { id: '', name: g.location, address: null } : undefined,
    }));

    return {
      success: true,
      data: {
        team: {
          ...team,
          league_name: (team.leagues as any)?.name || null,
          division_name: (team.divisions as any)?.name || null,
          venue_name: (team.venues as any)?.name || null,
        },
        roster_count: rosterCount || 0,
        pending_requests_count: pendingRequestsCount || 0,
        current_season: currentSeason || null,
        upcoming_games: upcomingGames || [],
      }
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getCaptainDashboard:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get pending join requests for a team
 */
export async function getTeamJoinRequests(teamId: string, status?: 'pending' | 'approved' | 'rejected') {
  // Verify captain access
  const access = await verifyCaptainAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    let query = supabase
      .from('team_join_requests')
      .select(`
        *,
        player:player_id(id, full_name, email, phone)
      `)
      .eq('team_id', teamId)
      .order('requested_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching join requests:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch join requests' };
    }

    return { success: true, data: requests || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamJoinRequests:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Approve a join request
 */
export async function approveJoinRequest(requestId: string, jerseyNumber?: number) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get the request details
    const { data: request, error: fetchError } = await supabase
      .from('team_join_requests')
      .select('*, teams!inner(captain_id)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      if (isDevelopment) {
        console.error('Error fetching join request:', sanitizeErrorForLogging(fetchError));
      }
      return { error: 'Join request not found' };
    }

    // Verify captain access
    if ((request.teams as any).captain_id !== user.id) {
      return { error: 'You must be the team captain to approve requests' };
    }

    if (request.status !== 'pending') {
      return { error: 'This request has already been processed' };
    }

    // Update the request status to approved
    const { error: updateError } = await supabase
      .from('team_join_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', requestId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error approving join request:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Failed to approve join request' };
    }

    // If jersey number provided, update the roster entry that was auto-created by trigger
    if (jerseyNumber) {
      const { error: jerseyError } = await supabase
        .from('team_rosters')
        .update({ jersey_number: jerseyNumber })
        .eq('team_id', request.team_id)
        .eq('player_id', request.player_id)
        .eq('season_id', request.season_id);

      if (jerseyError && isDevelopment) {
        console.error('Error setting jersey number:', sanitizeErrorForLogging(jerseyError));
        // Don't fail the whole operation if jersey number update fails
      }
    }

    revalidatePath(`/dashboard/captain/${request.team_id}`);
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in approveJoinRequest:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Reject a join request
 */
export async function rejectJoinRequest(requestId: string, _reason?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get the request details
    const { data: request, error: fetchError } = await supabase
      .from('team_join_requests')
      .select('*, teams!inner(captain_id)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      if (isDevelopment) {
        console.error('Error fetching join request:', sanitizeErrorForLogging(fetchError));
      }
      return { error: 'Join request not found' };
    }

    // Verify captain access
    if ((request.teams as any).captain_id !== user.id) {
      return { error: 'You must be the team captain to reject requests' };
    }

    if (request.status !== 'pending') {
      return { error: 'This request has already been processed' };
    }

    // Update the request status to rejected
    const { error: updateError } = await supabase
      .from('team_join_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', requestId);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error rejecting join request:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Failed to reject join request' };
    }

    revalidatePath(`/dashboard/captain/${request.team_id}`);
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in rejectJoinRequest:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get team roster (for captain view)
 */
export async function getCaptainTeamRoster(teamId: string) {
  // Verify captain access
  const access = await verifyCaptainAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    const { data: roster, error } = await supabase
      .from('team_rosters')
      .select(`
        *,
        player:player_id(id, full_name, email, phone)
      `)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .is('end_date', null)
      .order('jersey_number', { ascending: true, nullsFirst: false });

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching team roster:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch team roster' };
    }

    return { success: true, data: roster || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getCaptainTeamRoster:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Remove a player from the roster (captain action)
 */
export async function removePlayerFromRoster(teamId: string, playerId: string) {
  // Verify captain access
  const access = await verifyCaptainAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Soft delete by setting end_date and status
    const { error: updateError } = await supabase
      .from('team_rosters')
      .update({
        status: 'inactive',
        end_date: new Date().toISOString(),
      })
      .eq('team_id', teamId)
      .eq('player_id', playerId)
      .is('end_date', null);

    if (updateError) {
      if (isDevelopment) {
        console.error('Error removing player from roster:', sanitizeErrorForLogging(updateError));
      }
      return { error: 'Failed to remove player from roster' };
    }

    revalidatePath(`/dashboard/captain/${teamId}`);
    return { success: true };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in removePlayerFromRoster:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get previous seasons for a team's league (for roster import)
 */
export async function getTeamPreviousSeasons(teamId: string) {
  // Verify captain access
  const access = await verifyCaptainAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Get the team's league
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('league_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return { error: 'Team not found' };
    }

    // Get all seasons for this league that have ended
    const { data: seasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date')
      .eq('league_id', team.league_id)
      .lt('end_date', new Date().toISOString())
      .order('end_date', { ascending: false });

    if (seasonsError) {
      if (isDevelopment) {
        console.error('Error fetching previous seasons:', sanitizeErrorForLogging(seasonsError));
      }
      return { error: 'Failed to fetch previous seasons' };
    }

    return { success: true, data: seasons || [] };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamPreviousSeasons:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get roster from a previous season for import preview
 */
export async function getPreviousSeasonRoster(teamId: string, seasonId: string) {
  // Verify captain access
  const access = await verifyCaptainAccess(teamId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    const { data: roster, error } = await supabase
      .from('team_rosters')
      .select(`
        player_id,
        jersey_number,
        position,
        player:player_id(full_name, email)
      `)
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .eq('status', 'active');

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching previous season roster:', sanitizeErrorForLogging(error));
      }
      return { error: 'Failed to fetch previous season roster' };
    }

    // Transform to expected format
    const players: PreviousSeasonPlayer[] = (roster || []).map((entry: any) => ({
      player_id: entry.player_id,
      player_name: entry.player?.full_name || 'Unknown',
      jersey_number: entry.jersey_number,
      position: entry.position,
      email: entry.player?.email || null,
    }));

    return { success: true, data: players };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getPreviousSeasonRoster:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get current season for a team
 */
export async function getTeamCurrentSeason(teamId: string) {
  const supabase = await createClient();

  try {
    // Get the team's league
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('league_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return { error: 'Team not found' };
    }

    // Get current season
    const now = new Date().toISOString();
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date')
      .eq('league_id', team.league_id)
      .lte('start_date', now)
      .gte('end_date', now)
      .single();

    if (seasonError && seasonError.code !== 'PGRST116') {
      if (isDevelopment) {
        console.error('Error fetching current season:', sanitizeErrorForLogging(seasonError));
      }
      return { error: 'Failed to fetch current season' };
    }

    // If no current season, get the most recent upcoming season
    if (!season) {
      const { data: upcomingSeason } = await supabase
        .from('seasons')
        .select('id, name, start_date, end_date')
        .eq('league_id', team.league_id)
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(1)
        .single();

      return { success: true, data: upcomingSeason || null };
    }

    return { success: true, data: season };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getTeamCurrentSeason:', sanitizeErrorForLogging(error));
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Import players from a previous season to the current season
 */
export async function importPlayersFromPreviousSeason(params: {
  teamId: string;
  fromSeasonId: string;
  toSeasonId: string;
  selectedPlayerIds?: string[];
}): Promise<RosterImportResult> {
  const { teamId, fromSeasonId, toSeasonId, selectedPlayerIds } = params;

  // Verify captain access
  const access = await verifyCaptainAccess(teamId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Call the database function
    const { data, error } = await supabase.rpc('copy_roster_between_seasons', {
      p_team_id: teamId,
      p_from_season_id: fromSeasonId,
      p_to_season_id: toSeasonId,
      p_player_ids: selectedPlayerIds || undefined,
    });

    if (error) {
      if (isDevelopment) {
        console.error('Error importing roster:', sanitizeErrorForLogging(error));
      }
      return { success: false, error: 'Failed to import players' };
    }

    // The RPC returns Json, cast to expected shape
    const result = data as {
      success: boolean;
      error?: string;
      copiedCount?: number;
      skippedCount?: number;
      conflicts?: RosterImportConflict[];
    } | null;

    if (!result || !result.success) {
      return { success: false, error: result?.error || 'Import failed' };
    }

    revalidatePath(`/dashboard/captain/${teamId}`);

    return {
      success: true,
      copiedCount: result.copiedCount,
      skippedCount: result.skippedCount,
      conflicts: result.conflicts || [],
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in importPlayersFromPreviousSeason:', sanitizeErrorForLogging(error));
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}
