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
    let query = supabase
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
      (awards || []).map(async (award) => {
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
