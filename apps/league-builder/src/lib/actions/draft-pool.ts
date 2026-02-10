'use server';

import { createClient } from '@/lib/supabase/server';
import { addPlayersToDraftPool } from './draft';

interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// Map registration skill levels to draft pool A-D ratings
const SKILL_LEVEL_MAP: Record<string, string> = {
  beginner: 'D',
  intermediate: 'C',
  advanced: 'B',
  expert: 'A',
  // Also handle if already in A-D format
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
};

// Map registration positions to draft pool positions
const POSITION_MAP: Record<string, string> = {
  Forward: 'C',
  Center: 'C',
  'Left Wing': 'LW',
  'Right Wing': 'RW',
  Defense: 'D',
  Goalie: 'G',
  Goaltender: 'G',
  // Handle short forms
  C: 'C',
  LW: 'LW',
  RW: 'RW',
  D: 'D',
  G: 'G',
  F: 'C',
};

/**
 * Populates the draft pool from approved registration submissions.
 * Maps skill levels (beginner/intermediate/advanced/expert) to A/B/C/D ratings.
 * Deduplicates against existing pool entries.
 */
export async function populateDraftPoolFromRegistrations(
  draftId: string,
  leagueId: string,
  seasonId: string
): Promise<ActionResult<{ addedCount: number; skippedCount: number }>> {
  try {
    const supabase = await createClient();

    // Verify user has access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Fetch approved registrations for this league + season
    const { data: registrations, error: regError } = await supabase
      .from('registration_submissions')
      .select(`
        id,
        player_id,
        preferred_position,
        self_assessed_skill,
        profiles:player_id (
          full_name
        )
      `)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'approved');

    if (regError) {
      console.error('Error fetching registrations:', regError);
      return { success: false, error: `Failed to fetch registrations: ${regError.message}` };
    }

    if (!registrations || registrations.length === 0) {
      return {
        success: true,
        data: { addedCount: 0, skippedCount: 0 },
      };
    }

    // Fetch existing pool entries to deduplicate
    const { data: existingPool } = await (supabase as any)
      .from('draft_pool')
      .select('player_id')
      .eq('draft_id', draftId);

    const existingPlayerIds = new Set(
      (existingPool || []).map((p: { player_id: string }) => p.player_id)
    );

    // Map registrations to draft pool entries, skipping duplicates
    const newPlayers: Array<{
      playerId: string;
      playerName: string;
      position?: string;
      skillLevel?: string;
      autoPickRank?: number;
    }> = [];

    let skippedCount = 0;

    for (const reg of registrations) {
      if (existingPlayerIds.has(reg.player_id)) {
        skippedCount++;
        continue;
      }

      const profile = reg.profiles as any;
      const playerName = profile?.full_name || 'Unknown Player';
      const position = reg.preferred_position
        ? POSITION_MAP[reg.preferred_position] || reg.preferred_position
        : undefined;
      const skillLevel = reg.self_assessed_skill
        ? SKILL_LEVEL_MAP[reg.self_assessed_skill] || 'C'
        : 'C';

      newPlayers.push({
        playerId: reg.player_id,
        playerName,
        position,
        skillLevel,
      });
    }

    if (newPlayers.length === 0) {
      return {
        success: true,
        data: { addedCount: 0, skippedCount },
      };
    }

    // Use existing addPlayersToDraftPool action
    const result = await addPlayersToDraftPool(draftId, leagueId, newPlayers);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        addedCount: result.data?.addedCount || newPlayers.length,
        skippedCount,
      },
    };
  } catch (error) {
    console.error('populateDraftPoolFromRegistrations error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to populate draft pool',
    };
  }
}
