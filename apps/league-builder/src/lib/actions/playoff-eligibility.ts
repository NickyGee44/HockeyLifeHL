'use server';

import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface EligibilityPlayer {
  player_id: string;
  team_id: string;
  full_name: string | null;
  jersey_number: number | null;
  games_played: number;
  total_team_games: number;
  games_played_pct: number;
  is_eligible: boolean;
  min_games_pct: number | null;
  min_games: number | null;
}

/**
 * Fetches playoff eligibility data for a season (optionally filtered by team).
 */
export async function getPlayoffEligibility(
  seasonId: string,
  teamId?: string
): Promise<ActionResult<EligibilityPlayer[]>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // RPC function created by migration - cast needed until types are regenerated
    const { data, error } = await (supabase.rpc as any)('get_playoff_eligibility', {
      p_season_id: seasonId,
      p_team_id: teamId ?? null,
    });

    if (error) {
      console.error('get_playoff_eligibility error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data ?? []) as EligibilityPlayer[] };
  } catch (err) {
    console.error('getPlayoffEligibility error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Updates season-level playoff eligibility settings.
 */
export async function updateSeasonEligibilitySettings(
  seasonId: string,
  minGamesPct: number | null,
  minGames: number | null
): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify the user has admin access to this season's league
    const { data: season } = await supabase
      .from('seasons')
      .select('league_id')
      .eq('id', seasonId)
      .single();

    if (!season) {
      return { success: false, error: 'Season not found' };
    }

    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', season.league_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) {
      return { success: false, error: 'Not authorized' };
    }

    // Columns created by migration - cast needed until types are regenerated
    const { error } = await supabase
      .from('seasons')
      .update({
        playoff_eligibility_min_games_pct: minGamesPct,
        playoff_eligibility_min_games: minGames,
      } as any)
      .eq('id', seasonId);

    if (error) {
      console.error('updateSeasonEligibilitySettings error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (err) {
    console.error('updateSeasonEligibilitySettings error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Updates the manual games-played override for a specific roster entry.
 */
export async function updateGamesPlayedOverride(
  rosterId: string,
  gamesPlayedOverride: number | null
): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get roster entry to verify league access
    const { data: roster } = await supabase
      .from('team_rosters')
      .select('league_id')
      .eq('id', rosterId)
      .single();

    if (!roster) {
      return { success: false, error: 'Roster entry not found' };
    }

    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', roster.league_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) {
      return { success: false, error: 'Not authorized' };
    }

    // Column created by migration - cast needed until types are regenerated
    const { error } = await supabase
      .from('team_rosters')
      .update({ games_played_override: gamesPlayedOverride } as any)
      .eq('id', rosterId);

    if (error) {
      console.error('updateGamesPlayedOverride error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (err) {
    console.error('updateGamesPlayedOverride error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
