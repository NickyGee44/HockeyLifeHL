'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

// ==============================================================================
// TYPES
// ==============================================================================

export interface LeagueAward {
  id: string;
  league_id: string;
  season_id: string | null;
  player_id: string | null;
  team_id: string | null;
  award_name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueAwardWithDetails extends LeagueAward {
  player_name?: string | null;
  team_name?: string | null;
  season_name?: string | null;
}

export interface CreateAwardParams {
  leagueId: string;
  seasonId?: string;
  playerId?: string;
  teamId?: string;
  awardName: string;
  category: string;
  description?: string;
  imageUrl?: string;
}

export interface UpdateAwardParams {
  seasonId?: string | null;
  playerId?: string | null;
  teamId?: string | null;
  awardName?: string;
  category?: string;
  description?: string | null;
  imageUrl?: string | null;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==============================================================================
// READ OPERATIONS
// ==============================================================================

/**
 * Get all awards for a league, optionally filtered by season
 */
export async function getLeagueAwards(
  leagueId: string,
  seasonId?: string
): Promise<ActionResult<LeagueAwardWithDetails[]>> {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('league_awards')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data: awards, error } = await query;

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching awards:', error);
      }
      return { success: false, error: 'Failed to fetch awards' };
    }

    // Enrich with player, team, and season names
    const enrichedAwards = await Promise.all(
      (awards || []).map(async (award: any) => {
        let player_name: string | null = null;
        let team_name: string | null = null;
        let season_name: string | null = null;

        if (award.player_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', award.player_id)
            .single();
          player_name = profile?.full_name || null;
        }

        if (award.team_id) {
          const { data: team } = await supabase
            .from('teams')
            .select('name')
            .eq('id', award.team_id)
            .single();
          team_name = team?.name || null;
        }

        if (award.season_id) {
          const { data: season } = await supabase
            .from('seasons')
            .select('name')
            .eq('id', award.season_id)
            .single();
          season_name = season?.name || null;
        }

        return {
          ...award,
          player_name,
          team_name,
          season_name,
        } as LeagueAwardWithDetails;
      })
    );

    return { success: true, data: enrichedAwards };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getLeagueAwards:', error);
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// PLAYER QUERIES (for nominee selection)
// ==============================================================================

export interface LeaguePlayer {
  player_id: string;
  full_name: string;
  team_id: string;
  team_name: string;
}

/**
 * Get all players in a league for a given season (across all teams)
 */
export async function getLeaguePlayersForSeason(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<LeaguePlayer[]>> {
  const supabase = await createClient();

  try {
    // Get all active roster entries for this season across league teams
    const { data: rosters, error } = await (supabase
      .from('team_rosters') as any)
      .select('player_id, team_id')
      .eq('season_id', seasonId)
      .eq('status', 'active')
      .is('end_date', null);

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching league players:', error);
      }
      return { success: false, error: 'Failed to fetch players' };
    }

    if (!rosters || rosters.length === 0) {
      return { success: true, data: [] };
    }

    // Get unique player IDs and team IDs
    const playerIds = [...new Set(rosters.map((r: any) => r.player_id))] as string[];
    const teamIds = [...new Set(rosters.map((r: any) => r.team_id))] as string[];

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', playerIds);

    // Fetch teams (verify they belong to the league)
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds)
      .eq('league_id', leagueId);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
    const teamMap = new Map((teams || []).map((t: any) => [t.id, t.name]));

    const players: LeaguePlayer[] = rosters
      .filter((r: any) => profileMap.has(r.player_id) && teamMap.has(r.team_id))
      .map((r: any) => ({
        player_id: r.player_id,
        full_name: profileMap.get(r.player_id) || 'Unknown',
        team_id: r.team_id,
        team_name: teamMap.get(r.team_id) || 'Unknown',
      }));

    // Sort alphabetically
    players.sort((a, b) => a.full_name.localeCompare(b.full_name));

    // Deduplicate by player_id (in case a player appears on multiple rosters)
    const seen = new Set<string>();
    const unique = players.filter(p => {
      if (seen.has(p.player_id)) return false;
      seen.add(p.player_id);
      return true;
    });

    return { success: true, data: unique };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getLeaguePlayersForSeason:', error);
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all awards for a specific player (for profile display)
 */
export async function getPlayerAwards(
  playerId: string
): Promise<ActionResult<LeagueAwardWithDetails[]>> {
  const supabase = await createClient();

  try {
    const { data: awards, error } = await (supabase
      .from('league_awards') as any)
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isDevelopment) {
        console.error('Error fetching player awards:', error);
      }
      return { success: false, error: 'Failed to fetch player awards' };
    }

    // Enrich with team and season names
    const enrichedAwards = await Promise.all(
      (awards || []).map(async (award: any) => {
        let team_name: string | null = null;
        let season_name: string | null = null;

        if (award.team_id) {
          const { data: team } = await supabase
            .from('teams')
            .select('name')
            .eq('id', award.team_id)
            .single();
          team_name = team?.name || null;
        }

        if (award.season_id) {
          const { data: season } = await supabase
            .from('seasons')
            .select('name')
            .eq('id', award.season_id)
            .single();
          season_name = season?.name || null;
        }

        return {
          ...award,
          player_name: null,
          team_name,
          season_name,
        } as LeagueAwardWithDetails;
      })
    );

    return { success: true, data: enrichedAwards };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in getPlayerAwards:', error);
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Set the winner for an award (admin selects winner from nominees/players)
 */
export async function setAwardWinner(
  awardId: string,
  playerId: string,
  teamId: string
): Promise<ActionResult<LeagueAward>> {
  return updateAward(awardId, {
    playerId,
    teamId,
  });
}

// ==============================================================================
// CREATE OPERATIONS
// ==============================================================================

/**
 * Create a new league award
 */
export async function createAward(params: CreateAwardParams): Promise<ActionResult<LeagueAward>> {
  const { leagueId, seasonId, playerId, teamId, awardName, category, description, imageUrl } = params;

  // Verify access
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    const { data: award, error } = await (supabase
      .from('league_awards') as any)
      .insert({
        league_id: leagueId,
        season_id: seasonId || null,
        player_id: playerId || null,
        team_id: teamId || null,
        award_name: awardName,
        category,
        description: description || null,
        image_url: imageUrl || null,
      })
      .select()
      .single();

    if (error) {
      if (isDevelopment) {
        console.error('Error creating award:', error);
      }
      return { success: false, error: 'Failed to create award' };
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/awards`);
    return { success: true, data: award as LeagueAward };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in createAward:', error);
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// UPDATE OPERATIONS
// ==============================================================================

/**
 * Update an existing award
 */
export async function updateAward(
  awardId: string,
  updates: UpdateAwardParams
): Promise<ActionResult<LeagueAward>> {
  const supabase = await createClient();

  try {
    // Get award to verify league ownership
    const { data: existingAward, error: fetchError } = await (supabase
      .from('league_awards') as any)
      .select('league_id')
      .eq('id', awardId)
      .single();

    if (fetchError || !existingAward) {
      return { success: false, error: 'Award not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(existingAward.league_id);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Not authorized' };
    }

    // Build update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.awardName !== undefined) updateData.award_name = updates.awardName;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
    if (updates.seasonId !== undefined) updateData.season_id = updates.seasonId;
    if (updates.playerId !== undefined) updateData.player_id = updates.playerId;
    if (updates.teamId !== undefined) updateData.team_id = updates.teamId;

    const { data: award, error } = await (supabase
      .from('league_awards') as any)
      .update(updateData)
      .eq('id', awardId)
      .select()
      .single();

    if (error) {
      if (isDevelopment) {
        console.error('Error updating award:', error);
      }
      return { success: false, error: 'Failed to update award' };
    }

    revalidatePath(`/dashboard/leagues/${existingAward.league_id}/awards`);
    return { success: true, data: award as LeagueAward };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in updateAward:', error);
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// DELETE OPERATIONS
// ==============================================================================

/**
 * Delete an award
 */
export async function deleteAward(awardId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
    // Get award to verify league ownership
    const { data: award, error: fetchError } = await (supabase
      .from('league_awards') as any)
      .select('league_id')
      .eq('id', awardId)
      .single();

    if (fetchError || !award) {
      return { success: false, error: 'Award not found' };
    }

    // Verify access
    const access = await verifyLeagueOwnerAccess(award.league_id);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Not authorized' };
    }

    const { error } = await (supabase
      .from('league_awards') as any)
      .delete()
      .eq('id', awardId);

    if (error) {
      if (isDevelopment) {
        console.error('Error deleting award:', error);
      }
      return { success: false, error: 'Failed to delete award' };
    }

    revalidatePath(`/dashboard/leagues/${award.league_id}/awards`);
    return { success: true, data: undefined };
  } catch (error) {
    if (isDevelopment) {
      console.error('Unexpected error in deleteAward:', error);
    }
    return { success: false, error: 'An unexpected error occurred' };
  }
}
