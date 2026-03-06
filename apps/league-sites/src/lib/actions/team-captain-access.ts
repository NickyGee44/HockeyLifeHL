import { createAuthClient } from '@/lib/supabase/server';

export interface TeamCaptainAccessResult {
  authorized: boolean;
  error?: string;
  userId?: string;
  teamId?: string;
  leagueId?: string;
}

/**
 * League-sites captain-only actions must use teams.captain_id as the
 * authorization source of truth so app checks match RLS policies.
 */
export async function verifyTeamCaptainAccess(
  teamId: string
): Promise<TeamCaptainAccessResult> {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const { data: team, error } = await supabase
    .from('teams')
    .select('id, league_id')
    .eq('id', teamId)
    .eq('captain_id', user.id)
    .maybeSingle();

  if (error || !team) {
    return { authorized: false, error: 'Not authorized' };
  }

  return {
    authorized: true,
    userId: user.id,
    teamId: team.id,
    leagueId: team.league_id,
  };
}
