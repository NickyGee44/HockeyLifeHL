'use server';

import { createClient } from '@/lib/supabase/server';
import { linkEntitiesInText } from '@/lib/utils/entity-linker';

/**
 * Fetch teams and players for a league and apply smart entity linking to article text.
 * Replaces team/player names with markdown links.
 */
export async function applyEntityLinking(
  leagueId: string,
  text: string
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  const supabase = await createClient();

  try {
    // Get league slug for building URLs
    const { data: league } = await supabase
      .from('leagues')
      .select('slug')
      .eq('id', leagueId)
      .single();

    if (!league?.slug) {
      // No slug means no public site — return text as-is
      return { success: true, data: text };
    }

    // Fetch active teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, short_name')
      .eq('league_id', leagueId)
      .eq('status', 'active');

    // Fetch players (from team_rosters → profiles)
    const { data: playerData } = await supabase
      .from('team_rosters')
      .select('player_id, profiles:player_id(id, full_name)')
      .eq('league_id', leagueId)
      .eq('status', 'active');

    const teamEntities = (teams || []).map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.short_name || undefined,
    }));

    // Deduplicate players by ID
    const playerMap = new Map<string, { id: string; fullName: string }>();
    for (const row of playerData || []) {
      const profile = (row as any).profiles;
      if (profile?.id && profile?.full_name) {
        playerMap.set(profile.id, { id: profile.id, fullName: profile.full_name });
      }
    }
    const playerEntities = Array.from(playerMap.values());

    const linkedText = linkEntitiesInText(text, league.slug, teamEntities, playerEntities);
    return { success: true, data: linkedText };
  } catch {
    return { success: false, error: 'Failed to apply entity linking' };
  }
}
