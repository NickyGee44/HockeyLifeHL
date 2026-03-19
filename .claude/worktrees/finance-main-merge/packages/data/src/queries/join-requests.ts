import type { SupabaseClientArg, TeamJoinRequest, TeamForJoin } from '../types';

export async function getMyJoinRequests(
  supabase: SupabaseClientArg,
  userId: string,
  leagueId: string,
): Promise<TeamJoinRequest[]> {
  const { data, error } = await supabase
    .from('team_join_requests')
    .select(`
      id,
      team_id,
      player_id,
      league_id,
      season_id,
      status,
      message,
      requested_at,
      reviewed_at,
      team:teams(id, name, slug, logo_url)
    `)
    .eq('player_id', userId)
    .eq('league_id', leagueId)
    .order('requested_at', { ascending: false });

  if (error || !data) return [];

  return (data || []).map((r: any) => ({
    ...r,
    team: Array.isArray(r.team) ? r.team[0] : r.team,
  }));
}

export async function getTeamsForJoin(
  supabase: SupabaseClientArg,
  leagueId: string,
): Promise<TeamForJoin[]> {
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

  if (error || !teams) return [];

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
  supabase: SupabaseClientArg,
  userId: string,
  teamId: string,
  leagueId: string,
  seasonId: string,
  message?: string,
): Promise<{ success: boolean; error?: string }> {
  // Check if already on a team in this league
  const { data: existingMembership } = await supabase
    .from('team_rosters')
    .select('id')
    .eq('player_id', userId)
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
    .eq('player_id', userId)
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .limit(1);

  if (existingRequest && existingRequest.length > 0) {
    return { success: false, error: 'You already have a pending request to this team' };
  }

  const { error } = await supabase.from('team_join_requests').insert({
    team_id: teamId,
    player_id: userId,
    league_id: leagueId,
    season_id: seasonId,
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

export async function cancelJoinRequest(
  supabase: SupabaseClientArg,
  userId: string,
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('team_join_requests')
    .delete()
    .eq('id', requestId)
    .eq('player_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error('Failed to cancel request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
