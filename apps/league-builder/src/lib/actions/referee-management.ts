'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

// ============================================================================
// TYPES
// ============================================================================

export interface LeagueReferee {
  id: string;
  league_id: string;
  name: string;
  role_title: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  bio: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  total_assignments: number;
}

export interface GameOfficial {
  id: string;
  game_id: string;
  name: string;
  role: string;
  jersey_number: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all referees for a league (staff with role_title containing 'referee')
 */
export async function getLeagueReferees(leagueId: string): Promise<{
  success: boolean;
  data?: { referees: LeagueReferee[] };
  error?: string;
}> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  // Fetch staff with referee-like role titles
  const { data: staff, error: staffError } = await (supabase
    .from('league_staff') as any)
    .select('*')
    .eq('league_id', leagueId)
    .ilike('role_title', '%referee%')
    .order('display_order', { ascending: true });

  if (staffError) {
    if (isDevelopment) console.error('Error fetching referees:', staffError);
    return { success: false, error: 'Failed to fetch referees' };
  }

  // Get assignment counts from game_officials
  const refereeNames = (staff || []).map((s: any) => s.name);
  const assignmentCounts: Record<string, number> = {};

  if (refereeNames.length > 0) {
    const { data: officials } = await (supabase
      .from('game_officials') as any)
      .select('name')
      .in('name', refereeNames);

    if (officials) {
      for (const official of officials) {
        assignmentCounts[official.name] = (assignmentCounts[official.name] || 0) + 1;
      }
    }
  }

  const referees: LeagueReferee[] = (staff || []).map((s: any) => ({
    ...s,
    total_assignments: assignmentCounts[s.name] || 0,
  }));

  return { success: true, data: { referees } };
}

/**
 * Get game officials for a specific game
 */
export async function getGameOfficials(gameId: string): Promise<{
  success: boolean;
  data?: GameOfficial[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('game_officials') as any)
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isDevelopment) console.error('Error fetching game officials:', error);
    return { success: false, error: 'Failed to fetch game officials' };
  }

  return { success: true, data: data || [] };
}

/**
 * Get all game officials for a league (across all games in all seasons)
 */
export async function getLeagueGameOfficials(leagueId: string): Promise<{
  success: boolean;
  data?: Array<GameOfficial & { game: { id: string; scheduled_at: string; status: string } }>;
  error?: string;
}> {
  const supabase = await createClient();

  // Get all games for this league
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, scheduled_at, status, season:seasons!inner(league_id)')
    .eq('seasons.league_id' as any, leagueId);

  if (gamesError || !games) {
    if (isDevelopment) console.error('Error fetching league games:', gamesError);
    return { success: false, error: 'Failed to fetch league games' };
  }

  const gameIds = games.map((g: any) => g.id);
  if (gameIds.length === 0) {
    return { success: true, data: [] };
  }

  const { data: officials, error: officialsError } = await (supabase
    .from('game_officials') as any)
    .select('*')
    .in('game_id', gameIds);

  if (officialsError) {
    if (isDevelopment) console.error('Error fetching officials:', officialsError);
    return { success: false, error: 'Failed to fetch officials' };
  }

  const gameMap = new Map(games.map((g: any) => [g.id, { id: g.id, scheduled_at: g.scheduled_at, status: g.status }]));

  const result = (officials || []).map((o: any) => ({
    ...o,
    game: gameMap.get(o.game_id) || { id: o.game_id, scheduled_at: '', status: 'unknown' },
  }));

  return { success: true, data: result };
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Assign a referee to a game via game_officials table
 */
export async function assignRefereeToGame(params: {
  gameId: string;
  leagueId: string;
  refereeName: string;
  role?: string;
  jerseyNumber?: string;
}): Promise<{ success: boolean; data?: GameOfficial; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  // Check if this referee is already assigned to this game
  const { data: existing } = await (supabase
    .from('game_officials') as any)
    .select('id')
    .eq('game_id', params.gameId)
    .eq('name', params.refereeName)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Referee is already assigned to this game' };
  }

  const { data, error } = await (supabase
    .from('game_officials') as any)
    .insert({
      game_id: params.gameId,
      name: params.refereeName,
      role: params.role || 'referee',
      jersey_number: params.jerseyNumber || null,
    })
    .select()
    .single();

  if (error) {
    if (isDevelopment) console.error('Error assigning referee:', error);
    return { success: false, error: 'Failed to assign referee' };
  }

  revalidatePath(`/dashboard/leagues/${params.leagueId}`);
  return { success: true, data };
}

/**
 * Remove a referee assignment from a game
 */
export async function removeRefereeFromGame(params: {
  officialId: string;
  leagueId: string;
}): Promise<{ success: boolean; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  const { error } = await (supabase
    .from('game_officials') as any)
    .delete()
    .eq('id', params.officialId);

  if (error) {
    if (isDevelopment) console.error('Error removing referee:', error);
    return { success: false, error: 'Failed to remove referee' };
  }

  revalidatePath(`/dashboard/leagues/${params.leagueId}`);
  return { success: true };
}

/**
 * Bulk assign a referee to multiple games
 */
export async function bulkAssignRefereeToGames(params: {
  leagueId: string;
  refereeName: string;
  gameIds: string[];
  role?: string;
}): Promise<{ success: boolean; assigned: number; skipped: number; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, assigned: 0, skipped: 0, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();
  let assigned = 0;
  let skipped = 0;

  for (const gameId of params.gameIds) {
    // Check for existing assignment
    const { data: existing } = await (supabase
      .from('game_officials') as any)
      .select('id')
      .eq('game_id', gameId)
      .eq('name', params.refereeName)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await (supabase
      .from('game_officials') as any)
      .insert({
        game_id: gameId,
        name: params.refereeName,
        role: params.role || 'referee',
      });

    if (error) {
      if (isDevelopment) console.error('Error in bulk assign:', error);
      skipped++;
    } else {
      assigned++;
    }
  }

  revalidatePath(`/dashboard/leagues/${params.leagueId}`);
  return { success: true, assigned, skipped };
}
