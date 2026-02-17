'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

// ==============================================================================
// TYPES
// ==============================================================================

export interface TeamStats {
  teamId: string;
  teamName: string;
  shortName: string;
  logoUrl: string | null;
  divisionId: string | null;
  divisionName: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

export interface DivisionHealth {
  divisionId: string;
  divisionName: string;
  skillLevel: string | null;
  teamCount: number;
  avgPoints: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  avgGoalDiff: number;
  stdDevGoalDiff: number;
  healthScore: 'good' | 'warning' | 'poor';
  teams: TeamStats[];
  outliers: OutlierTeam[];
}

export interface OutlierTeam {
  team: TeamStats;
  deviation: number;
  suggestion: 'move_up' | 'move_down';
}

export interface ProposedMove {
  teamId: string;
  teamName: string;
  fromDivisionId: string;
  fromDivisionName: string;
  toDivisionId: string;
  toDivisionName: string;
}

export interface SwapSuggestion {
  teamA: TeamStats;
  teamB: TeamStats;
  divisionA: { id: string; name: string };
  divisionB: { id: string; name: string };
  reason: string;
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==============================================================================
// HELPER: STATISTICS
// ==============================================================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

function healthScore(stdDevGoalDiff: number, teamCount: number): 'good' | 'warning' | 'poor' {
  if (teamCount < 2) return 'good';
  // High standard deviation in goal diff = poor competitive balance
  if (stdDevGoalDiff > 15) return 'poor';
  if (stdDevGoalDiff > 8) return 'warning';
  return 'good';
}

// ==============================================================================
// FETCH DIVISION HEALTH
// ==============================================================================

export async function getDivisionHealthStats(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<DivisionHealth[]>> {
  const supabase = await createClient();

  try {
    // Get divisions
    const { data: divisions, error: divError } = await supabase
      .from('divisions')
      .select('id, name, skill_level')
      .eq('league_id', leagueId)
      .order('name');

    if (divError) {
      if (isDevelopment) console.error('Error fetching divisions:', sanitizeErrorForLogging(divError));
      return { success: false, error: 'Failed to fetch divisions' };
    }

    if (!divisions || divisions.length === 0) {
      return { success: true, data: [] };
    }

    // Get standings via RPC
    const { data: standingsData, error: standingsError } = await supabase.rpc('calculate_standings', {
      p_season_id: seasonId,
    });

    if (standingsError) {
      if (isDevelopment) console.error('Error fetching standings:', sanitizeErrorForLogging(standingsError));
      return { success: false, error: 'Failed to fetch standings' };
    }

    // Map standings to team stats
    const allTeamStats: TeamStats[] = (standingsData ?? []).map((row: Record<string, unknown>) => ({
      teamId: row.team_id as string,
      teamName: row.team_name as string,
      shortName: row.short_name as string,
      logoUrl: row.logo_url as string | null,
      divisionId: row.division_id as string | null,
      divisionName: null, // Will fill in below
      gamesPlayed: row.games_played as number,
      wins: row.wins as number,
      losses: row.losses as number,
      ties: row.ties as number,
      points: row.points as number,
      goalsFor: row.goals_for as number,
      goalsAgainst: row.goals_against as number,
      goalDiff: row.goal_diff as number,
    }));

    // Build division health data
    const divisionHealthList: DivisionHealth[] = divisions.map((div) => {
      const divTeams = allTeamStats
        .filter((t) => t.divisionId === div.id)
        .map((t) => ({ ...t, divisionName: div.name }));

      const goalDiffs = divTeams.map((t) => t.goalDiff);
      const points = divTeams.map((t) => t.points);
      const gf = divTeams.map((t) => t.goalsFor);
      const ga = divTeams.map((t) => t.goalsAgainst);

      const avgGD = mean(goalDiffs);
      const sdGD = stdDev(goalDiffs);

      // Find outliers: teams >1 standard deviation from division mean goal diff
      const outliers: OutlierTeam[] = [];
      if (sdGD > 0 && divTeams.length >= 3) {
        for (const team of divTeams) {
          const deviation = (team.goalDiff - avgGD) / sdGD;
          if (Math.abs(deviation) > 1) {
            outliers.push({
              team,
              deviation,
              suggestion: deviation > 0 ? 'move_up' : 'move_down',
            });
          }
        }
        // Sort by absolute deviation descending
        outliers.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
      }

      return {
        divisionId: div.id,
        divisionName: div.name,
        skillLevel: div.skill_level,
        teamCount: divTeams.length,
        avgPoints: Math.round(mean(points) * 10) / 10,
        avgGoalsFor: Math.round(mean(gf) * 10) / 10,
        avgGoalsAgainst: Math.round(mean(ga) * 10) / 10,
        avgGoalDiff: Math.round(avgGD * 10) / 10,
        stdDevGoalDiff: Math.round(sdGD * 10) / 10,
        healthScore: healthScore(sdGD, divTeams.length),
        teams: divTeams,
        outliers,
      };
    });

    return { success: true, data: divisionHealthList };
  } catch (error) {
    if (isDevelopment) console.error('Unexpected error:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// GET AFFECTED FUTURE GAMES
// ==============================================================================

export async function getAffectedFutureGames(
  teamId: string,
  fromDivisionId: string
): Promise<ActionResult<number>> {
  const supabase = await createClient();

  try {
    const now = new Date().toISOString();

    // Count future scheduled games in the same division that involve this team
    const { count, error } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('division_id', fromDivisionId)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .gte('scheduled_at', now)
      .in('status', ['scheduled']);

    if (error) {
      if (isDevelopment) console.error('Error counting affected games:', sanitizeErrorForLogging(error));
      return { success: false, error: 'Failed to count affected games' };
    }

    return { success: true, data: count || 0 };
  } catch (error) {
    if (isDevelopment) console.error('Unexpected error:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ==============================================================================
// EXECUTE DIVISION MOVES
// ==============================================================================

export type ScheduleAdjustment = 'keep' | 'update_division' | 'cancel_regen';

export async function executeDivisionMoves(
  leagueId: string,
  moves: ProposedMove[],
  scheduleAdjustment: ScheduleAdjustment = 'keep'
): Promise<ActionResult<{ moved: number; gamesUpdated: number }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();
  let moved = 0;

  try {
    for (const move of moves) {
      const { error } = await supabase
        .from('teams')
        .update({
          division_id: move.toDivisionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', move.teamId)
        .eq('league_id', leagueId);

      if (error) {
        if (isDevelopment) console.error('Error moving team:', sanitizeErrorForLogging(error));
        return { success: false, error: `Failed to move ${move.teamName}` };
      }
      moved++;
    }

    // Handle schedule adjustment
    let gamesUpdated = 0;
    if (scheduleAdjustment !== 'keep') {
      const now = new Date().toISOString();

      for (const move of moves) {
        if (scheduleAdjustment === 'update_division') {
          // Update future scheduled games: set division_id to team's new division
          const { data: updatedGames, error: gameError } = await supabase
            .from('games')
            .update({
              division_id: move.toDivisionId,
              updated_at: now,
            })
            .eq('division_id', move.fromDivisionId)
            .or(`home_team_id.eq.${move.teamId},away_team_id.eq.${move.teamId}`)
            .gte('scheduled_at', now)
            .in('status', ['scheduled'])
            .select('id');

          if (gameError) {
            if (isDevelopment) console.error('Error updating game divisions:', sanitizeErrorForLogging(gameError));
          } else {
            gamesUpdated += updatedGames?.length || 0;
          }
        } else if (scheduleAdjustment === 'cancel_regen') {
          // Cancel future scheduled games for moved teams
          const { data: cancelledGames, error: gameError } = await supabase
            .from('games')
            .update({
              status: 'cancelled' as const,
              cancellation_reason: 'Division shuffle - team moved',
              cancelled_at: now,
              updated_at: now,
            })
            .eq('division_id', move.fromDivisionId)
            .or(`home_team_id.eq.${move.teamId},away_team_id.eq.${move.teamId}`)
            .gte('scheduled_at', now)
            .in('status', ['scheduled'])
            .select('id');

          if (gameError) {
            if (isDevelopment) console.error('Error cancelling games:', sanitizeErrorForLogging(gameError));
          } else {
            gamesUpdated += cancelledGames?.length || 0;
          }
        }
      }
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/divisions`);
    revalidatePath(`/dashboard/leagues/${leagueId}/teams`);
    revalidatePath(`/dashboard/leagues/${leagueId}/schedule`);
    return { success: true, data: { moved, gamesUpdated } };
  } catch (error) {
    if (isDevelopment) console.error('Unexpected error:', sanitizeErrorForLogging(error));
    return { success: false, error: 'An unexpected error occurred' };
  }
}

