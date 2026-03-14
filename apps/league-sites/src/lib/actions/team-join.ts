'use server';

import { createAuthClient as createClient } from '@/lib/supabase/server';
import { pickOperationalSeason } from '@/lib/seasons/operational';

export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'accepted_sub' | 'waitlist';

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  team: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
  status: JoinRequestStatus;
  message: string | null;
  requested_at: string;
  reviewed_at: string | null;
}

export interface TeamForJoin {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  division_name: string | null;
  roster_count: number;
}

async function resolveOperationalSeasonId(
  leagueId: string,
  explicitSeasonId?: string | null
): Promise<string | null> {
  if (explicitSeasonId) {
    return explicitSeasonId;
  }

  const supabase = await createClient();
  const { data: seasons, error } = await supabase
    .from('seasons')
    .select('id, status, start_date, end_date, created_at')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to resolve operational season:', error);
    return null;
  }

  return pickOperationalSeason(seasons || [])?.id || null;
}

async function getSeasonParticipationTeamIds(
  leagueId: string,
  seasonId: string
): Promise<string[]> {
  const supabase = await createClient();

  const [
    rosterResult,
    registrationResult,
    gameResult,
    joinRequestResult,
  ] = await Promise.all([
    supabase
      .from('team_rosters')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'active'),
    supabase
      .from('registration_submissions')
      .select('team_id, assigned_team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .not('submitted_at', 'is', null)
      .in('status', ['pending', 'approved', 'waitlisted']),
    supabase
      .from('games')
      .select('home_team_id, away_team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    supabase
      .from('team_join_requests')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
  ]);

  const teamIds = new Set<string>();

  (rosterResult.data || []).forEach((row) => {
    if (row.team_id) {
      teamIds.add(row.team_id);
    }
  });

  (registrationResult.data || []).forEach((row) => {
    if (row.assigned_team_id) {
      teamIds.add(row.assigned_team_id);
    } else if (row.team_id) {
      teamIds.add(row.team_id);
    }
  });

  (gameResult.data || []).forEach((row) => {
    if (row.home_team_id) {
      teamIds.add(row.home_team_id);
    }
    if (row.away_team_id) {
      teamIds.add(row.away_team_id);
    }
  });

  (joinRequestResult.data || []).forEach((row) => {
    if (row.team_id) {
      teamIds.add(row.team_id);
    }
  });

  return [...teamIds];
}

export async function getMyJoinRequests(
  leagueId: string,
  seasonId?: string | null
): Promise<TeamJoinRequest[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const resolvedSeasonId = await resolveOperationalSeasonId(leagueId, seasonId);
  if (!resolvedSeasonId) {
    return [];
  }

  const { data, error } = await supabase
    .from('team_join_requests')
    .select(`
      id,
      team_id,
      status,
      message,
      requested_at,
      reviewed_at,
      team:teams(id, name, slug, logo_url)
    `)
    .eq('player_id', user.id)
    .eq('league_id', leagueId)
    .eq('season_id', resolvedSeasonId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Failed to get join requests:', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    ...r,
    team: Array.isArray(r.team) ? r.team[0] : r.team,
  }));
}

export async function getTeamsForJoin(
  leagueId: string,
  seasonId?: string | null
): Promise<TeamForJoin[]> {
  const supabase = await createClient();
  const resolvedSeasonId = await resolveOperationalSeasonId(leagueId, seasonId);

  if (!resolvedSeasonId) {
    return [];
  }

  const teamIds = await getSeasonParticipationTeamIds(leagueId, resolvedSeasonId);

  if (teamIds.length === 0) {
    return [];
  }

  // Get teams with roster counts
  const { data: teams, error } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      slug,
      logo_url,
      division:divisions(name)
    `)
    .eq('league_id', leagueId)
    .in('id', teamIds)
    .eq('status', 'active')
    .order('name');

  if (error || !teams) {
    console.error('Failed to get teams:', error);
    return [];
  }

  // Get roster counts
  const { data: rosterCounts } = await supabase
    .from('team_rosters')
    .select('team_id')
    .in('team_id', teams.map((t: any) => t.id))
    .eq('season_id', resolvedSeasonId)
    .eq('status', 'active');

  const countMap: Record<string, number> = {};
  (rosterCounts || []).forEach((r: any) => {
    countMap[r.team_id] = (countMap[r.team_id] || 0) + 1;
  });

  return teams.map((t: any) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    logo_url: t.logo_url,
    division_name: Array.isArray(t.division) ? t.division[0]?.name : t.division?.name || null,
    roster_count: countMap[t.id] || 0,
  }));
}

export async function submitJoinRequest(
  teamId: string,
  leagueId: string,
  seasonId: string | null,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // If no seasonId provided, get the current active season
  const resolvedSeasonId = await resolveOperationalSeasonId(leagueId, seasonId);

  if (!resolvedSeasonId) {
    return { success: false, error: 'No current season found' };
  }

  // Check if already on a team in this season
  const { data: existingMembership } = await supabase
    .from('team_rosters')
    .select('id')
    .eq('player_id', user.id)
    .eq('league_id', leagueId)
    .eq('season_id', resolvedSeasonId)
    .eq('status', 'active')
    .limit(1);

  if (existingMembership && existingMembership.length > 0) {
    return { success: false, error: 'You are already on a team for the current season' };
  }

  // Check for existing pending request to this team
  const { data: existingRequest } = await supabase
    .from('team_join_requests')
    .select('id, status')
    .eq('player_id', user.id)
    .eq('team_id', teamId)
    .eq('season_id', resolvedSeasonId)
    .eq('status', 'pending')
    .limit(1);

  if (existingRequest && existingRequest.length > 0) {
    return { success: false, error: 'You already have a pending request to this team' };
  }

  // Submit the request
  const { error } = await supabase.from('team_join_requests').insert({
    team_id: teamId,
    player_id: user.id,
    league_id: leagueId,
    season_id: resolvedSeasonId,
    status: 'pending',
    message: message || null,
    requested_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to submit join request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cancelJoinRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('team_join_requests')
    .delete()
    .eq('id', requestId)
    .eq('player_id', user.id)
    .eq('status', 'pending');

  if (error) {
    console.error('Failed to cancel request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
