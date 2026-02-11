'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const SCOREKEEPER_SESSION_COOKIE = 'sk_session';

// =============================================================================
// Types
// =============================================================================

export interface SwapRequest {
  id: string;
  gameId: string;
  reason: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  resolvedAt: string | null;
  requestingScorekeeper: {
    id: string;
    displayName: string;
  };
  acceptingScorekeeper: {
    id: string;
    displayName: string;
  } | null;
  game: {
    scheduledAt: string;
    homeTeamName: string;
    awayTeamName: string;
    venueName: string | null;
  };
}

export interface AvailableSwapGame {
  swapRequestId: string;
  gameId: string;
  scheduledAt: string;
  homeTeamName: string;
  awayTeamName: string;
  venueName: string | null;
  requestingScorekeeper: {
    id: string;
    displayName: string;
  };
  reason: string | null;
}

// =============================================================================
// Session helper
// =============================================================================

async function getLeagueScorekeeperFromSession(): Promise<{
  leagueScorekeeperId: string;
  leagueId: string;
  scorekeeperId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SCOREKEEPER_SESSION_COOKIE)?.value;

  if (!token) return null;

  const normalizedToken = token.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (!normalizedToken) return null;

  const supabase = createServiceRoleClient();

  const { data: session } = await (supabase as any)
    .from('scorekeeper_sessions')
    .select('id, league_id, league_scorekeeper_id, scorekeeper_id, is_active, expires_at')
    .eq('token', normalizedToken)
    .eq('is_active', true)
    .maybeSingle();

  if (!session) return null;

  const expiresAtMs = new Date(session.expires_at as string).getTime();
  if (expiresAtMs <= Date.now()) return null;

  if (session.league_scorekeeper_id) {
    // Get the user-level scorekeeper_id from league_scorekeepers
    const { data: lsk } = await (supabase as any)
      .from('league_scorekeepers')
      .select('scorekeeper_id')
      .eq('id', session.league_scorekeeper_id)
      .single();

    return {
      leagueScorekeeperId: session.league_scorekeeper_id,
      leagueId: session.league_id,
      scorekeeperId: lsk?.scorekeeper_id || session.scorekeeper_id || '',
    };
  }

  // Fallback: look up by scorekeeper_id
  if (session.scorekeeper_id) {
    const { data: lsk } = await (supabase as any)
      .from('league_scorekeepers')
      .select('id')
      .eq('league_id', session.league_id)
      .eq('scorekeeper_id', session.scorekeeper_id)
      .eq('is_active', true)
      .maybeSingle();

    if (lsk) {
      return {
        leagueScorekeeperId: lsk.id,
        leagueId: session.league_id,
        scorekeeperId: session.scorekeeper_id,
      };
    }
  }

  return null;
}

// =============================================================================
// Request a Swap
// =============================================================================

export async function requestSwap(
  gameId: string,
  reason: string
): Promise<{ success: boolean; swapRequestId?: string; error?: string }> {
  try {
    if (!gameId) {
      return { success: false, error: 'Game ID is required' };
    }

    const sessionInfo = await getLeagueScorekeeperFromSession();
    if (!sessionInfo) {
      return { success: false, error: 'No valid scorekeeper session found' };
    }

    const supabase = createServiceRoleClient();

    // Verify the scorekeeper is actually assigned to this game
    const { data: assignment } = await (supabase as any)
      .from('game_scorekeeper_assignments')
      .select('id')
      .eq('game_id', gameId)
      .eq('scorekeeper_id', sessionInfo.scorekeeperId)
      .eq('league_id', sessionInfo.leagueId)
      .maybeSingle();

    if (!assignment) {
      return { success: false, error: 'You are not assigned to this game' };
    }

    // Check for existing pending swap request
    const { data: existing } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .select('id')
      .eq('game_id', gameId)
      .eq('requesting_scorekeeper_id', sessionInfo.leagueScorekeeperId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'You already have a pending swap request for this game' };
    }

    // Create the swap request
    const { data: swapRequest, error } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .insert({
        game_id: gameId,
        requesting_scorekeeper_id: sessionInfo.leagueScorekeeperId,
        reason: reason.trim() || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('requestSwap error:', error);
      return { success: false, error: 'Failed to create swap request' };
    }

    return { success: true, swapRequestId: swapRequest.id };
  } catch (error) {
    console.error('requestSwap error:', error);
    return { success: false, error: 'Failed to create swap request' };
  }
}

// =============================================================================
// Accept a Swap
// =============================================================================

export async function acceptSwap(
  swapRequestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!swapRequestId) {
      return { success: false, error: 'Swap request ID is required' };
    }

    const sessionInfo = await getLeagueScorekeeperFromSession();
    if (!sessionInfo) {
      return { success: false, error: 'No valid scorekeeper session found' };
    }

    const supabase = createServiceRoleClient();

    // Get the swap request
    const { data: swapReq } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .select('id, game_id, requesting_scorekeeper_id, status')
      .eq('id', swapRequestId)
      .eq('status', 'pending')
      .single();

    if (!swapReq) {
      return { success: false, error: 'Swap request not found or no longer pending' };
    }

    // Cannot accept your own swap request
    if (swapReq.requesting_scorekeeper_id === sessionInfo.leagueScorekeeperId) {
      return { success: false, error: 'You cannot accept your own swap request' };
    }

    // Get the requesting scorekeeper's user profile id
    const { data: requestingSk } = await (supabase as any)
      .from('league_scorekeepers')
      .select('scorekeeper_id')
      .eq('id', swapReq.requesting_scorekeeper_id)
      .single();

    if (!requestingSk) {
      return { success: false, error: 'Requesting scorekeeper not found' };
    }

    // Update the swap request
    const { error: updateError } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .update({
        accepting_scorekeeper_id: sessionInfo.leagueScorekeeperId,
        status: 'accepted',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', swapRequestId);

    if (updateError) {
      console.error('acceptSwap update error:', updateError);
      return { success: false, error: 'Failed to update swap request' };
    }

    // Reassign the game to the accepting scorekeeper
    const { error: reassignError } = await (supabase as any)
      .from('game_scorekeeper_assignments')
      .update({
        scorekeeper_id: sessionInfo.scorekeeperId,
        assigned_at: new Date().toISOString(),
      })
      .eq('game_id', swapReq.game_id)
      .eq('scorekeeper_id', requestingSk.scorekeeper_id);

    if (reassignError) {
      console.error('acceptSwap reassign error:', reassignError);
      return { success: false, error: 'Failed to reassign game' };
    }

    return { success: true };
  } catch (error) {
    console.error('acceptSwap error:', error);
    return { success: false, error: 'Failed to accept swap' };
  }
}

// =============================================================================
// Decline a Swap
// =============================================================================

export async function declineSwap(
  swapRequestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!swapRequestId) {
      return { success: false, error: 'Swap request ID is required' };
    }

    const sessionInfo = await getLeagueScorekeeperFromSession();
    if (!sessionInfo) {
      return { success: false, error: 'No valid scorekeeper session found' };
    }

    const supabase = createServiceRoleClient();

    // Verify the swap request exists and is pending
    const { data: swapReq } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .select('id, requesting_scorekeeper_id, status')
      .eq('id', swapRequestId)
      .eq('status', 'pending')
      .single();

    if (!swapReq) {
      return { success: false, error: 'Swap request not found or no longer pending' };
    }

    // Update to declined
    const { error } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .update({
        status: 'declined',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', swapRequestId);

    if (error) {
      console.error('declineSwap error:', error);
      return { success: false, error: 'Failed to decline swap request' };
    }

    return { success: true };
  } catch (error) {
    console.error('declineSwap error:', error);
    return { success: false, error: 'Failed to decline swap' };
  }
}

// =============================================================================
// Get My Swap Requests (all statuses)
// =============================================================================

export async function getMySwapRequests(): Promise<{
  success: boolean;
  requests?: SwapRequest[];
  error?: string;
}> {
  try {
    const sessionInfo = await getLeagueScorekeeperFromSession();
    if (!sessionInfo) {
      return { success: false, error: 'No valid scorekeeper session found' };
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .select(`
        id, game_id, reason, status, created_at, resolved_at,
        requesting_sk:league_scorekeepers!scorekeeper_swap_requests_requesting_scorekeeper_id_fkey(id, display_name),
        accepting_sk:league_scorekeepers!scorekeeper_swap_requests_accepting_scorekeeper_id_fkey(id, display_name),
        games!inner(
          scheduled_at,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name),
          venue:venues(name)
        )
      `)
      .or(`requesting_scorekeeper_id.eq.${sessionInfo.leagueScorekeeperId},accepting_scorekeeper_id.eq.${sessionInfo.leagueScorekeeperId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('getMySwapRequests error:', error);
      return { success: false, error: 'Failed to load swap requests' };
    }

    const requests: SwapRequest[] = (data || []).map((s: any) => ({
      id: s.id,
      gameId: s.game_id,
      reason: s.reason,
      status: s.status,
      createdAt: s.created_at,
      resolvedAt: s.resolved_at,
      requestingScorekeeper: {
        id: s.requesting_sk?.id || '',
        displayName: s.requesting_sk?.display_name || 'Unknown',
      },
      acceptingScorekeeper: s.accepting_sk ? {
        id: s.accepting_sk.id,
        displayName: s.accepting_sk.display_name || 'Unknown',
      } : null,
      game: {
        scheduledAt: s.games?.scheduled_at || '',
        homeTeamName: s.games?.home_team?.name || 'Home',
        awayTeamName: s.games?.away_team?.name || 'Away',
        venueName: s.games?.venue?.name || null,
      },
    }));

    return { success: true, requests };
  } catch (error) {
    console.error('getMySwapRequests error:', error);
    return { success: false, error: 'Failed to load swap requests' };
  }
}

// =============================================================================
// Get Available Swap Games (games from other scorekeepers requesting swaps)
// =============================================================================

export async function getAvailableSwapGames(): Promise<{
  success: boolean;
  games?: AvailableSwapGame[];
  error?: string;
}> {
  try {
    const sessionInfo = await getLeagueScorekeeperFromSession();
    if (!sessionInfo) {
      return { success: false, error: 'No valid scorekeeper session found' };
    }

    const supabase = createServiceRoleClient();

    // Get pending swap requests from OTHER scorekeepers in the same league
    const { data, error } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .select(`
        id, game_id, reason,
        requesting_sk:league_scorekeepers!scorekeeper_swap_requests_requesting_scorekeeper_id_fkey(id, display_name, league_id),
        games!inner(
          scheduled_at,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name),
          venue:venues(name)
        )
      `)
      .eq('status', 'pending')
      .neq('requesting_scorekeeper_id', sessionInfo.leagueScorekeeperId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getAvailableSwapGames error:', error);
      return { success: false, error: 'Failed to load available swaps' };
    }

    // Filter to same league
    const games: AvailableSwapGame[] = (data || [])
      .filter((s: any) => s.requesting_sk?.league_id === sessionInfo.leagueId)
      .map((s: any) => ({
        swapRequestId: s.id,
        gameId: s.game_id,
        scheduledAt: s.games?.scheduled_at || '',
        homeTeamName: s.games?.home_team?.name || 'Home',
        awayTeamName: s.games?.away_team?.name || 'Away',
        venueName: s.games?.venue?.name || null,
        requestingScorekeeper: {
          id: s.requesting_sk?.id || '',
          displayName: s.requesting_sk?.display_name || 'Unknown',
        },
        reason: s.reason,
      }));

    return { success: true, games };
  } catch (error) {
    console.error('getAvailableSwapGames error:', error);
    return { success: false, error: 'Failed to load available swaps' };
  }
}
