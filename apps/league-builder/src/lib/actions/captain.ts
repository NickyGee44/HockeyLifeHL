'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';

const isDevelopment = process.env.NODE_ENV !== 'production';

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
 * Verify that the current user is the captain of the specified team
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

  if (team.captain_id !== user.id) {
    return { authorized: false, error: 'You must be the team captain to access this page' };
  }

  return { authorized: true };
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
      .gte('game_date', new Date().toISOString())
      .order('game_date', { ascending: true });

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
    const { data: upcomingGames } = await supabase
      .from('games')
      .select(`
        id,
        game_date,
        game_time,
        home_team_id,
        away_team_id,
        home_team:home_team_id(id, name, short_name, logo_url),
        away_team:away_team_id(id, name, short_name, logo_url),
        venue:venue_id(id, name, address)
      `)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .gte('game_date', new Date().toISOString())
      .order('game_date', { ascending: true })
      .limit(5);

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
export async function rejectJoinRequest(requestId: string, reason?: string) {
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
        player:player_id(id, full_name, email, phone),
        position:position_id(id, name, abbreviation)
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
