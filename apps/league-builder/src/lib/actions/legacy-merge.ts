'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const isDevelopment = process.env.NODE_ENV !== 'production';

// ============================================================================
// TYPES
// ============================================================================

export interface LegacyCandidate {
  id: string;
  fullName: string;
  teams: Array<{ teamName: string; seasonName: string }>;
  stats: {
    gamesPlayed: number;
    goals: number;
    assists: number;
    points: number;
  };
}

export interface LegacyMergeStatus {
  hasPendingMatches: boolean;
  matchCount: number;
  isMerged: boolean;
}

// ============================================================================
// CHECK LEGACY MERGE STATUS
// ============================================================================

/**
 * Check if the current user has pending legacy profile matches.
 * Called after login to determine if disambiguation is needed.
 */
export async function checkLegacyMergeStatus(): Promise<LegacyMergeStatus> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { hasPendingMatches: false, matchCount: 0, isMerged: false };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('pending_legacy_match_ids, legacy_merge_completed_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { hasPendingMatches: false, matchCount: 0, isMerged: false };
  }

  const matchIds = (profile as any).pending_legacy_match_ids as string[] | null;
  const mergedAt = (profile as any).legacy_merge_completed_at as string | null;

  return {
    hasPendingMatches: Array.isArray(matchIds) && matchIds.length > 0,
    matchCount: Array.isArray(matchIds) ? matchIds.length : 0,
    isMerged: !!mergedAt,
  };
}

// ============================================================================
// GET LEGACY CANDIDATES
// ============================================================================

/**
 * Fetch the legacy profile candidates for the current user with
 * differentiating info (teams, stats) for disambiguation.
 */
export async function getLegacyCandidates(): Promise<
  { success: true; data: LegacyCandidate[] } | { success: false; error: string }
> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get the pending match IDs from the user's profile
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('pending_legacy_match_ids')
    .eq('id', user.id)
    .single();

  const matchIds = (profile as any)?.pending_legacy_match_ids as string[] | null;

  if (!matchIds || matchIds.length === 0) {
    return { success: true, data: [] };
  }

  // Fetch each legacy profile with team/stat context
  const candidates: LegacyCandidate[] = [];

  for (const legacyId of matchIds) {
    // Get basic profile info
    const { data: legacyProfile } = await serviceSupabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', legacyId)
      .single();

    if (!legacyProfile) continue;

    // Get teams played on via team_rosters
    const { data: rosters } = await serviceSupabase
      .from('team_rosters')
      .select('teams:team_id(name), seasons:season_id(name)')
      .eq('player_id', legacyId) as any;

    const teams = (rosters || []).map((r: any) => ({
      teamName: r.teams?.name || 'Unknown Team',
      seasonName: r.seasons?.name || 'Unknown Season',
    }));

    // Get aggregated stats from player_stats
    const { data: stats } = await serviceSupabase
      .from('player_stats')
      .select('games_played, goals, assists, points')
      .eq('player_id', legacyId) as any;

    const aggregatedStats = (stats || []).reduce(
      (acc: any, s: any) => ({
        gamesPlayed: acc.gamesPlayed + (s.games_played || 0),
        goals: acc.goals + (s.goals || 0),
        assists: acc.assists + (s.assists || 0),
        points: acc.points + (s.points || 0),
      }),
      { gamesPlayed: 0, goals: 0, assists: 0, points: 0 }
    );

    candidates.push({
      id: legacyProfile.id,
      fullName: legacyProfile.full_name || 'Unknown',
      teams,
      stats: aggregatedStats,
    });
  }

  return { success: true, data: candidates };
}

// ============================================================================
// CLAIM LEGACY PROFILE
// ============================================================================

/**
 * Merge a specific legacy profile into the current user's profile.
 * Called when the user selects "This is me" in the disambiguation UI.
 */
export async function claimLegacyProfile(
  legacyProfileId: string
): Promise<{ success: true; totalReassigned: number } | { success: false; error: string }> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify this legacy ID is actually in the user's pending matches
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('pending_legacy_match_ids')
    .eq('id', user.id)
    .single();

  const matchIds = (profile as any)?.pending_legacy_match_ids as string[] | null;

  if (!matchIds || !matchIds.includes(legacyProfileId)) {
    return { success: false, error: 'This legacy profile is not in your pending matches' };
  }

  // Execute the atomic merge via RPC (cast needed until types are regenerated after migration)
  const { data, error } = await (serviceSupabase.rpc as any)('merge_legacy_profile', {
    p_new_profile_id: user.id,
    p_legacy_profile_id: legacyProfileId,
  });

  if (error) {
    if (isDevelopment) {
      console.error('[legacy-merge] RPC error:', error.message);
    }
    return { success: false, error: 'Failed to merge legacy profile' };
  }

  const result = data as any;
  if (!result?.success) {
    return { success: false, error: result?.error || 'Merge failed' };
  }

  if (isDevelopment) {
    console.info('[legacy-merge] Merged legacy profile %s into %s (%d records)',
      legacyProfileId, user.id, result.total_reassigned);
  }

  return { success: true, totalReassigned: result.total_reassigned || 0 };
}

// ============================================================================
// DISMISS LEGACY MATCH
// ============================================================================

/**
 * Clear pending legacy matches — user says "none of these are me".
 */
export async function dismissLegacyMatch(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await serviceSupabase
    .from('profiles')
    .update({
      pending_legacy_match_ids: [],
    } as any)
    .eq('id', user.id);

  if (error) {
    return { success: false, error: 'Failed to dismiss matches' };
  }

  return { success: true };
}
