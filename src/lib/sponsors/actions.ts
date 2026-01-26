"use server";

import { createClient } from "@/lib/supabase/server";

export type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string;
  tier: string;
  is_active?: boolean; // Optional since RPC functions only return active sponsors
  placement_preference?: string[]; // Added from RPC return type
};

/**
 * Get all active platform-wide sponsors
 */
export async function getPlatformSponsors(): Promise<{ sponsors: Sponsor[] }> {
  try {
    const supabase = await createClient();

    // Use the RPC for consistent ordering and logic
    const { data, error } = await supabase.rpc('get_active_platform_sponsors');

    if (error) {
      console.error('Error fetching platform sponsors via RPC:', error);
      
      // Fallback to direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from('platform_sponsors')
        .select('*')
        .eq('is_active', true)
        .order('tier');

      if (directError) {
        return { sponsors: [] };
      }
      return { sponsors: directData || [] };
    }

    return { sponsors: data || [] };
  } catch (error) {
    console.error('Failed to get platform sponsors:', error);
    return { sponsors: [] };
  }
}

/**
 * Get all active sponsors for a specific league
 */
export async function getLeagueSponsors(leagueId: string): Promise<{ sponsors: Sponsor[] }> {
  try {
    const supabase = await createClient();

    // Use the RPC for consistent ordering and logic
    const { data, error } = await supabase.rpc('get_active_league_sponsors', {
      check_league_id: leagueId
    });

    if (error) {
      console.error('Error fetching league sponsors via RPC:', error);

      // Fallback to direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from('league_sponsors')
        .select('*')
        .eq('league_id', leagueId)
        .eq('is_active', true)
        .order('tier');

      if (directError) {
        return { sponsors: [] };
      }
      return { sponsors: directData || [] };
    }

    return { sponsors: data || [] };
  } catch (error) {
    console.error('Failed to get league sponsors:', error);
    return { sponsors: [] };
  }
}
