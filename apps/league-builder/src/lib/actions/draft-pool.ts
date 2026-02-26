'use server';

import { createClient } from '@/lib/supabase/server';
import { addPlayersToDraftPool } from './draft';

interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

type PoolPlayer = {
  playerId: string;
  playerName: string;
  position?: string;
  skillLevel?: string;
  autoPickRank?: number;
};

// Map registration skill levels to draft pool A-D ratings
const SKILL_LEVEL_MAP: Record<string, string> = {
  beginner: 'D',
  intermediate: 'C',
  advanced: 'B',
  expert: 'A',
  A: 'A', B: 'B', C: 'C', D: 'D',
  a: 'A', b: 'B', c: 'C', d: 'D',
};

// Map player_ratings enum (A+/A/A-/B+/B/B-/C+/C/C-/D+/D/D-) to draft A/B/C/D
function ratingToSkillLevel(rating: string): string {
  if (rating.startsWith('A')) return 'A';
  if (rating.startsWith('B')) return 'B';
  if (rating.startsWith('D')) return 'D';
  return 'C'; // C+/C/C- and anything else
}

// Map team_rosters position ("Forward" | "Defense" | "Goalie") to draft position
const ROSTER_POSITION_MAP: Record<string, string> = {
  Forward: 'F',
  Defense: 'D',
  Goalie: 'G',
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
  C: 'C', LW: 'LW', RW: 'RW', D: 'D', G: 'G', F: 'C',
};

/** Fetch existing player IDs in draft pool to deduplicate */
async function getExistingPoolIds(draftId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('draft_pool')
    .select('player_id')
    .eq('draft_id', draftId);
  return new Set((data || []).map((p: { player_id: string }) => p.player_id));
}

/** Verify the calling user is authenticated */
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ─── Source 1: Current season registrations ──────────────────────────────────

/**
 * Populates the draft pool from approved registration submissions for this season.
 * Maps skill levels (beginner/intermediate/advanced/expert) to A/B/C/D ratings.
 */
export async function populateDraftPoolFromRegistrations(
  draftId: string,
  leagueId: string,
  seasonId: string
): Promise<ActionResult<{ addedCount: number; skippedCount: number }>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const supabase = await createClient();

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
      return { success: false, error: `Failed to fetch registrations: ${regError.message}` };
    }

    if (!registrations || registrations.length === 0) {
      return { success: true, data: { addedCount: 0, skippedCount: 0 } };
    }

    const existingIds = await getExistingPoolIds(draftId);
    const newPlayers: PoolPlayer[] = [];
    let skippedCount = 0;

    for (const reg of registrations) {
      if (existingIds.has(reg.player_id)) { skippedCount++; continue; }

      const profile = reg.profiles as any;
      newPlayers.push({
        playerId: reg.player_id,
        playerName: profile?.full_name || 'Unknown Player',
        position: reg.preferred_position
          ? POSITION_MAP[reg.preferred_position] || reg.preferred_position
          : undefined,
        skillLevel: reg.self_assessed_skill
          ? SKILL_LEVEL_MAP[reg.self_assessed_skill] || 'C'
          : 'C',
      });
    }

    if (newPlayers.length === 0) {
      return { success: true, data: { addedCount: 0, skippedCount } };
    }

    const result = await addPlayersToDraftPool(draftId, leagueId, newPlayers);
    if (!result.success) return { success: false, error: result.error };

    return {
      success: true,
      data: { addedCount: result.data?.addedCount || newPlayers.length, skippedCount },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to populate draft pool',
    };
  }
}

// ─── Source 2: Past season rosters ───────────────────────────────────────────

/**
 * Populates the draft pool from a past season's team rosters.
 * Uses player_ratings for that season if available, falls back to 'C'.
 */
export async function populateDraftPoolFromSeason(
  draftId: string,
  leagueId: string,
  fromSeasonId: string
): Promise<ActionResult<{ addedCount: number; skippedCount: number }>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const supabase = await createClient();

    // Get all players on any team in the league for that season
    const { data: rosters, error: rosterError } = await supabase
      .from('team_rosters')
      .select(`
        player_id,
        position,
        profiles:player_id (
          full_name
        )
      `)
      .eq('league_id', leagueId)
      .eq('season_id', fromSeasonId)
      .is('end_date', null);

    if (rosterError) {
      return { success: false, error: `Failed to fetch roster: ${rosterError.message}` };
    }

    if (!rosters || rosters.length === 0) {
      return { success: true, data: { addedCount: 0, skippedCount: 0 } };
    }

    // Fetch player ratings for this season (for skill level)
    const playerIds = [...new Set(rosters.map((r) => r.player_id))];
    const { data: ratingsData } = await supabase
      .from('player_ratings')
      .select('player_id, rating')
      .eq('league_id', leagueId)
      .eq('season_id', fromSeasonId)
      .in('player_id', playerIds);

    const ratingsByPlayer = new Map<string, string>(
      (ratingsData || []).map((r) => [r.player_id, r.rating])
    );

    const existingIds = await getExistingPoolIds(draftId);
    const seen = new Set<string>();
    const newPlayers: PoolPlayer[] = [];
    let skippedCount = 0;

    for (const r of rosters) {
      if (existingIds.has(r.player_id)) { skippedCount++; continue; }
      if (seen.has(r.player_id)) continue; // deduplicate within roster
      seen.add(r.player_id);

      const profile = r.profiles as any;
      const rawRating = ratingsByPlayer.get(r.player_id);
      const skillLevel = rawRating ? ratingToSkillLevel(rawRating) : 'C';
      const position = r.position
        ? ROSTER_POSITION_MAP[r.position] || r.position
        : undefined;

      newPlayers.push({
        playerId: r.player_id,
        playerName: profile?.full_name || 'Unknown Player',
        position,
        skillLevel,
      });
    }

    if (newPlayers.length === 0) {
      return { success: true, data: { addedCount: 0, skippedCount } };
    }

    const result = await addPlayersToDraftPool(draftId, leagueId, newPlayers);
    if (!result.success) return { success: false, error: result.error };

    return {
      success: true,
      data: { addedCount: result.data?.addedCount || newPlayers.length, skippedCount },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to populate from season',
    };
  }
}

// ─── Source 3: All-time league history ───────────────────────────────────────

/**
 * Populates the draft pool from all players who ever played in this league.
 * Deduplicates by player_id and uses their most recent player_rating if available.
 */
export async function populateDraftPoolFromHistory(
  draftId: string,
  leagueId: string
): Promise<ActionResult<{ addedCount: number; skippedCount: number }>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const supabase = await createClient();

    // Get all historical roster entries (unique players)
    const { data: rosters, error: rosterError } = await supabase
      .from('team_rosters')
      .select(`
        player_id,
        position,
        season_id,
        profiles:player_id (
          full_name
        )
      `)
      .eq('league_id', leagueId)
      .order('season_id', { ascending: false }); // most recent first so we get latest position

    if (rosterError) {
      return { success: false, error: `Failed to fetch history: ${rosterError.message}` };
    }

    if (!rosters || rosters.length === 0) {
      return { success: true, data: { addedCount: 0, skippedCount: 0 } };
    }

    // Get most recent player_ratings for each player in this league
    const { data: ratingsData } = await supabase
      .from('player_ratings')
      .select('player_id, rating, season_id')
      .eq('league_id', leagueId)
      .order('season_id', { ascending: false });

    // Keep only most recent rating per player
    const ratingsByPlayer = new Map<string, string>();
    for (const r of ratingsData || []) {
      if (!ratingsByPlayer.has(r.player_id)) {
        ratingsByPlayer.set(r.player_id, r.rating);
      }
    }

    const existingIds = await getExistingPoolIds(draftId);
    const seen = new Set<string>();
    const newPlayers: PoolPlayer[] = [];
    let skippedCount = 0;

    for (const r of rosters) {
      if (existingIds.has(r.player_id)) { skippedCount++; continue; }
      if (seen.has(r.player_id)) continue;
      seen.add(r.player_id);

      const profile = r.profiles as any;
      const rawRating = ratingsByPlayer.get(r.player_id);
      const skillLevel = rawRating ? ratingToSkillLevel(rawRating) : 'C';
      const position = r.position
        ? ROSTER_POSITION_MAP[r.position] || r.position
        : undefined;

      newPlayers.push({
        playerId: r.player_id,
        playerName: profile?.full_name || 'Unknown Player',
        position,
        skillLevel,
      });
    }

    if (newPlayers.length === 0) {
      return { success: true, data: { addedCount: 0, skippedCount } };
    }

    const result = await addPlayersToDraftPool(draftId, leagueId, newPlayers);
    if (!result.success) return { success: false, error: result.error };

    return {
      success: true,
      data: { addedCount: result.data?.addedCount || newPlayers.length, skippedCount },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to populate from history',
    };
  }
}
