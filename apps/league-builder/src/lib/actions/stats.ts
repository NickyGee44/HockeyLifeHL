'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Recalculate all season stats (player + goalie) for a given season.
 * Requires the caller to be an owner or admin of the league that owns the season.
 */
export async function recalculateSeasonStats(seasonId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate input
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(seasonId)) {
      return { success: false, error: 'Invalid season ID' };
    }

    // Verify auth - user must be admin/owner of the league
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get season's league_id
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id, league_id')
      .eq('id', seasonId)
      .single();

    if (seasonError || !season) {
      return { success: false, error: 'Season not found' };
    }

    // Verify user is admin/owner of the league
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', season.league_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Use service role client to call the RPC
    const serviceClient = await createServiceRoleClient();
    const { error: rpcError } = await serviceClient.rpc('recalculate_all_season_stats', {
      p_season_id: seasonId,
    });

    if (rpcError) {
      console.error('Failed to recalculate season stats:', rpcError);
      return { success: false, error: 'Failed to recalculate stats' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Recalculate season stats error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
