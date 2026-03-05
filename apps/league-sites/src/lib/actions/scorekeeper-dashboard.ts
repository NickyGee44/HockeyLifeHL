'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const SCOREKEEPER_SESSION_COOKIE = 'sk_session';

// =============================================================================
// Types
// =============================================================================

export interface ScorekeeperDashboardData {
  scorekeeper: {
    id: string;
    displayName: string;
    email: string | null;
    leagueId: string;
    leagueName: string;
    totalAssignments: number;
    completedAssignments: number;
  };
  upcomingGames: DashboardGame[];
  completedGames: DashboardGame[];
  pendingSwapRequests: SwapRequestData[];
  incomingSwapRequests: SwapRequestData[];
}

export interface DashboardGame {
  id: string;
  scheduledAt: string;
  status: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  venueName: string | null;
}

export interface SwapRequestData {
  id: string;
  gameId: string;
  reason: string | null;
  status: string;
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
  };
}

export interface ScheduleGame extends DashboardGame {
  weekNumber: number;
  dayOfWeek: string;
  hasSwapRequest: boolean;
}

// =============================================================================
// Session helper: get league_scorekeeper from session token
// =============================================================================

async function getLeagueScorekeeperFromSession(): Promise<{
  leagueScorekeeperId: string;
  leagueId: string;
  sessionId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SCOREKEEPER_SESSION_COOKIE)?.value;

  if (!token) return null;

  const normalizedToken = token.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (!normalizedToken) return null;

  const supabase = createServiceRoleClient();

  // Look up session and get league_scorekeeper_id
  const { data: session, error } = await (supabase as any)
    .from('scorekeeper_sessions')
    .select('id, league_id, league_scorekeeper_id, is_active, expires_at')
    .eq('token', normalizedToken)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !session) return null;

  const expiresAtMs = new Date(session.expires_at as string).getTime();
  if (expiresAtMs <= Date.now()) return null;

  // If we have a league_scorekeeper_id, use it directly
  if (session.league_scorekeeper_id) {
    return {
      leagueScorekeeperId: session.league_scorekeeper_id,
      leagueId: session.league_id,
      sessionId: session.id,
    };
  }

  // Fallback: find league_scorekeeper by scorekeeper_id from session
  const { data: sessionWithSk } = await (supabase as any)
    .from('scorekeeper_sessions')
    .select('scorekeeper_id')
    .eq('id', session.id)
    .single();

  if (sessionWithSk?.scorekeeper_id) {
    const { data: leagueSk } = await (supabase as any)
      .from('league_scorekeepers')
      .select('id')
      .eq('league_id', session.league_id)
      .eq('scorekeeper_id', sessionWithSk.scorekeeper_id)
      .eq('is_active', true)
      .maybeSingle();

    if (leagueSk) {
      return {
        leagueScorekeeperId: leagueSk.id,
        leagueId: session.league_id,
        sessionId: session.id,
      };
    }
  }

  return null;
}

// =============================================================================
// Get Scorekeeper Dashboard Data
// =============================================================================

export async function getScorekeeperDashboard(): Promise<{
  success: boolean;
  data?: ScorekeeperDashboardData;
  error?: string;
}> {
  try {
    const sessionInfo = await getLeagueScorekeeperFromSession();
    if (!sessionInfo) {
      return { success: false, error: 'No valid scorekeeper session found' };
    }

    const supabase = createServiceRoleClient();
    const { leagueScorekeeperId, leagueId } = sessionInfo;

    // Get scorekeeper profile data
    const { data: scorekeeper, error: skError } = await (supabase as any)
      .from('league_scorekeepers')
      .select(`
        id,
        display_name,
        email,
        league_id,
        total_assignments,
        completed_assignments,
        scorekeeper_id,
        leagues!league_scorekeepers_league_id_fkey(name)
      `)
      .eq('id', leagueScorekeeperId)
      .single();

    if (skError || !scorekeeper) {
      return { success: false, error: 'Scorekeeper profile not found' };
    }

    // Get the scorekeeper_id (user profile) to find game assignments
    const scorekeeperId = scorekeeper.scorekeeper_id;

    // Get assigned games via game_scorekeeper_assignments
    const { data: assignments } = await (supabase as any)
      .from('game_scorekeeper_assignments')
      .select(`
        game_id,
        games!inner(
          id,
          scheduled_at,
          status,
          home_score,
          away_score,
          location,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        )
      `)
      .eq('scorekeeper_id', scorekeeperId)
      .eq('league_id', leagueId);

    const allGames: DashboardGame[] = (assignments || []).map((a: any) => ({
      id: a.games.id,
      scheduledAt: a.games.scheduled_at,
      status: a.games.status || 'scheduled',
      homeTeamName: a.games.home_team?.name || 'Home',
      awayTeamName: a.games.away_team?.name || 'Away',
      homeScore: a.games.home_score || 0,
      awayScore: a.games.away_score || 0,
      venueName: a.games.location || null,
    }));
    const upcomingGames = allGames
      .filter(g => g.status === 'scheduled' || g.status === 'in_progress')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const completedGames = allGames
      .filter(g => g.status === 'completed' || g.status === 'final')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 10);

    // Get swap requests
    const { data: outgoingSwaps } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .select(`
        id, game_id, reason, status, created_at, resolved_at,
        requesting_sk:league_scorekeepers!scorekeeper_swap_requests_requesting_scorekeeper_id_fkey(id, display_name),
        accepting_sk:league_scorekeepers!scorekeeper_swap_requests_accepting_scorekeeper_id_fkey(id, display_name),
        games!inner(
          scheduled_at,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        )
      `)
      .eq('requesting_scorekeeper_id', leagueScorekeeperId)
      .eq('status', 'pending');

    const { data: incomingSwaps } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .select(`
        id, game_id, reason, status, created_at, resolved_at,
        requesting_sk:league_scorekeepers!scorekeeper_swap_requests_requesting_scorekeeper_id_fkey(id, display_name),
        accepting_sk:league_scorekeepers!scorekeeper_swap_requests_accepting_scorekeeper_id_fkey(id, display_name),
        games!inner(
          league_id,
          scheduled_at,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        )
      `)
      .eq('status', 'pending')
      .eq('games.league_id', leagueId)
      .neq('requesting_scorekeeper_id', leagueScorekeeperId);

    const formatSwap = (s: any): SwapRequestData => ({
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
      },
    });

    const leagueData = scorekeeper.leagues as any;

    return {
      success: true,
      data: {
        scorekeeper: {
          id: scorekeeper.id,
          displayName: scorekeeper.display_name || 'Scorekeeper',
          email: scorekeeper.email,
          leagueId: scorekeeper.league_id,
          leagueName: leagueData?.name || 'League',
          totalAssignments: scorekeeper.total_assignments || 0,
          completedAssignments: scorekeeper.completed_assignments || 0,
        },
        upcomingGames,
        completedGames,
        pendingSwapRequests: (outgoingSwaps || []).map(formatSwap),
        incomingSwapRequests: (incomingSwaps || []).map(formatSwap),
      },
    };
  } catch (error) {
    console.error('getScorekeeperDashboard error:', error);
    return { success: false, error: 'Failed to load dashboard data' };
  }
}

// =============================================================================
// Get Scorekeeper Schedule
// =============================================================================

export async function getScorekeeperSchedule(): Promise<{
  success: boolean;
  games?: ScheduleGame[];
  error?: string;
}> {
  try {
    const sessionInfo = await getLeagueScorekeeperFromSession();
    if (!sessionInfo) {
      return { success: false, error: 'No valid scorekeeper session found' };
    }

    const supabase = createServiceRoleClient();
    const { leagueScorekeeperId, leagueId } = sessionInfo;

    // Get scorekeeper's user profile id
    const { data: sk } = await (supabase as any)
      .from('league_scorekeepers')
      .select('scorekeeper_id')
      .eq('id', leagueScorekeeperId)
      .single();

    if (!sk) {
      return { success: false, error: 'Scorekeeper not found' };
    }

    // Get all assigned games
    const { data: assignments, error } = await (supabase as any)
      .from('game_scorekeeper_assignments')
      .select(`
        game_id,
        games!inner(
          id,
          scheduled_at,
          status,
          home_score,
          away_score,
          location,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        )
      `)
      .eq('scorekeeper_id', sk.scorekeeper_id)
      .eq('league_id', leagueId);

    if (error) {
      console.error('getScorekeeperSchedule error:', error);
      return { success: false, error: 'Failed to load schedule' };
    }

    // Get swap requests for this scorekeeper's games
    const { data: swapRequests } = await (supabase as any)
      .from('scorekeeper_swap_requests')
      .select('game_id, status')
      .eq('requesting_scorekeeper_id', leagueScorekeeperId)
      .in('status', ['pending', 'accepted']);

    const swapGameIds = new Set((swapRequests || []).map((sr: any) => sr.game_id));

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const games: ScheduleGame[] = (assignments || []).map((a: any) => {
      const scheduledDate = new Date(a.games.scheduled_at);
      const startOfYear = new Date(scheduledDate.getFullYear(), 0, 1);
      const daysDiff = Math.floor((scheduledDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.ceil((daysDiff + startOfYear.getDay() + 1) / 7);

      return {
        id: a.games.id,
        scheduledAt: a.games.scheduled_at,
        status: a.games.status || 'scheduled',
        homeTeamName: a.games.home_team?.name || 'Home',
        awayTeamName: a.games.away_team?.name || 'Away',
        homeScore: a.games.home_score || 0,
        awayScore: a.games.away_score || 0,
        venueName: a.games.location || null,
        weekNumber,
        dayOfWeek: days[scheduledDate.getDay()],
        hasSwapRequest: swapGameIds.has(a.games.id),
      };
    });

    return { success: true, games };
  } catch (error) {
    console.error('getScorekeeperSchedule error:', error);
    return { success: false, error: 'Failed to load schedule' };
  }
}

// =============================================================================
// Mark Unavailable for a Game
// =============================================================================

export async function markUnavailable(gameId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const sessionInfo = await getLeagueScorekeeperFromSession();
    if (!sessionInfo) {
      return { success: false, error: 'No valid scorekeeper session found' };
    }

    const supabase = createServiceRoleClient();

    // Get game details for the availability window
    const { data: game } = await (supabase as any)
      .from('games')
      .select('scheduled_at, league_id')
      .eq('id', gameId)
      .single();

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    // Get scorekeeper user id
    const { data: sk } = await (supabase as any)
      .from('league_scorekeepers')
      .select('scorekeeper_id')
      .eq('id', sessionInfo.leagueScorekeeperId)
      .single();

    if (!sk) {
      return { success: false, error: 'Scorekeeper not found' };
    }

    // Create unavailability window (1 hour before to 3 hours after scheduled time)
    const scheduledAt = new Date(game.scheduled_at);
    const startTime = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
    const endTime = new Date(scheduledAt.getTime() + 3 * 60 * 60 * 1000);

    const { error } = await (supabase as any)
      .from('scorekeeper_availability')
      .insert({
        league_id: game.league_id,
        scorekeeper_id: sk.scorekeeper_id,
        availability_type: 'unavailable',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: `Marked unavailable for game ${gameId}`,
        created_by: sk.scorekeeper_id,
      });

    if (error) {
      console.error('markUnavailable error:', error);
      return { success: false, error: 'Failed to mark unavailable' };
    }

    return { success: true };
  } catch (error) {
    console.error('markUnavailable error:', error);
    return { success: false, error: 'Failed to mark unavailable' };
  }
}
