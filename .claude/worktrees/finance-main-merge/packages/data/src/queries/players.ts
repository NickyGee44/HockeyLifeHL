import type { SupabaseClientArg, Player } from '../types';

export async function getPlayerProfile(
  supabase: SupabaseClientArg,
  playerId: string,
): Promise<Player | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, position')
    .eq('id', playerId)
    .single();

  if (profileError || !profile) return null;

  // Get team rosters for this player
  const { data: rosters } = await supabase
    .from('team_rosters')
    .select('*, teams(*, division:divisions(*))')
    .eq('player_id', playerId)
    .limit(1);

  const roster = rosters?.[0];
  const team = roster ? (Array.isArray(roster.teams) ? roster.teams[0] : roster.teams) : undefined;

  return {
    id: roster?.id || `profile-${playerId}`,
    player_id: playerId,
    team_id: roster?.team_id || '',
    jersey_number: roster?.jersey_number || null,
    position: roster?.position || profile.position || null,
    leadership_role: roster?.leadership_role || null,
    is_goalie: roster?.is_goalie || false,
    is_captain: roster?.leadership_role === 'captain',
    is_alternate: roster?.leadership_role === 'alternate_captain',
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    },
    team: team ? { ...team, league_id: team.league_id } : undefined,
  } as Player;
}

/**
 * Get the full profile of the currently authenticated user
 */
export async function getCurrentPlayerProfile(
  supabase: SupabaseClientArg,
  userId: string,
): Promise<{
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  position: string | null;
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email, position')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Update player profile
 */
export async function updatePlayerProfile(
  supabase: SupabaseClientArg,
  userId: string,
  updates: { full_name?: string; avatar_url?: string; position?: string },
) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error ? new Error(error.message) : null };
}
