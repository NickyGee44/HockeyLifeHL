import { createAuthClient } from '@/lib/supabase/server';

export interface TeamCaptainAccessResult {
  authorized: boolean;
  error?: string;
  userId?: string;
  teamId?: string;
  leagueId?: string;
}

export async function verifyTeamLeadershipAccess(
  teamId: string
): Promise<TeamCaptainAccessResult> {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const { data: teamCaptain, error: teamCaptainError } = await supabase
    .from('teams')
    .select('id, league_id')
    .eq('id', teamId)
    .eq('captain_id', user.id)
    .maybeSingle();

  if (teamCaptainError) {
    return { authorized: false, error: 'Not authorized' };
  }

  if (teamCaptain?.id) {
    return {
      authorized: true,
      userId: user.id,
      teamId: teamCaptain.id,
      leagueId: teamCaptain.league_id,
    };
  }

  const { data: leadershipMembership, error: leadershipError } = await supabase
    .from('team_rosters')
    .select('team_id, league_id')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .eq('status', 'active')
    .in('leadership_role', ['captain', 'alternate_captain'])
    .maybeSingle();

  if (leadershipError || !leadershipMembership) {
    return { authorized: false, error: 'Not authorized' };
  }

  return {
    authorized: true,
    userId: user.id,
    teamId: leadershipMembership.team_id,
    leagueId: leadershipMembership.league_id,
  };
}

/**
 * League-sites captain-only actions must use teams.captain_id as the
 * authorization source of truth so app checks match RLS policies.
 */
export async function verifyTeamCaptainAccess(
  teamId: string
): Promise<TeamCaptainAccessResult> {
  const leadershipAccess = await verifyTeamLeadershipAccess(teamId);
  if (!leadershipAccess.authorized || !leadershipAccess.userId) {
    return leadershipAccess;
  }

  const supabase = await createAuthClient();
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, league_id')
    .eq('id', teamId)
    .eq('captain_id', leadershipAccess.userId)
    .maybeSingle();

  if (error || !team) {
    return { authorized: false, error: 'Not authorized' };
  }

  return leadershipAccess;
}
