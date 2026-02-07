'use server';

import { createAuthClient as createClient } from '@/lib/supabase/server';

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

export async function getMyJoinRequests(leagueId: string): Promise<TeamJoinRequest[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

export async function getTeamsForJoin(leagueId: string): Promise<TeamForJoin[]> {
  const supabase = await createClient();

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
  let resolvedSeasonId = seasonId;
  if (!resolvedSeasonId) {
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('id')
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    resolvedSeasonId = seasonData?.id || null;
  }

  if (!resolvedSeasonId) {
    return { success: false, error: 'No active season found' };
  }

  // Check if already on a team in this league
  const { data: existingMembership } = await supabase
    .from('team_rosters')
    .select('id')
    .eq('player_id', user.id)
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .limit(1);

  if (existingMembership && existingMembership.length > 0) {
    return { success: false, error: 'You are already on a team in this league' };
  }

  // Check for existing pending request to this team
  const { data: existingRequest } = await supabase
    .from('team_join_requests')
    .select('id, status')
    .eq('player_id', user.id)
    .eq('team_id', teamId)
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
