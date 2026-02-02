'use server';

/**
 * Standings Server Actions
 *
 * Server actions for fetching and configuring standings.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { TeamStanding, StandingsConfig, TiebreakerType } from './types';

// ============================================================================
// FETCH STANDINGS
// ============================================================================

/**
 * Get calculated standings for a season.
 */
export async function getStandings(seasonId: string): Promise<TeamStanding[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('calculate_standings', {
    p_season_id: seasonId,
  });

  if (error) {
    console.error('Error fetching standings:', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    teamId: row.team_id as string,
    teamName: row.team_name as string,
    shortName: row.short_name as string,
    logoUrl: row.logo_url as string | null,
    divisionId: row.division_id as string | null,
    gamesPlayed: row.games_played as number,
    wins: row.wins as number,
    losses: row.losses as number,
    ties: row.ties as number,
    points: row.points as number,
    goalsFor: row.goals_for as number,
    goalsAgainst: row.goals_against as number,
    goalDiff: row.goal_diff as number,
    homeRecord: row.home_record as string,
    awayRecord: row.away_record as string,
    rank: row.rank as number,
    isPlayoffSpot: row.is_playoff_spot as boolean,
  }));
}

/**
 * Get standings grouped by division.
 */
export async function getStandingsByDivision(
  seasonId: string,
  leagueId: string
): Promise<{ divisionId: string | null; divisionName: string; teams: TeamStanding[] }[]> {
  const supabase = await createClient();

  // Get standings
  const standings = await getStandings(seasonId);

  // Get divisions
  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('league_id', leagueId)
    .order('name');

  // Group by division
  const divisionMap = new Map<string | null, TeamStanding[]>();

  for (const team of standings) {
    const key = team.divisionId;
    if (!divisionMap.has(key)) {
      divisionMap.set(key, []);
    }
    divisionMap.get(key)!.push(team);
  }

  // Build result with division names
  const result: { divisionId: string | null; divisionName: string; teams: TeamStanding[] }[] = [];

  // Add divisions with teams
  for (const division of divisions ?? []) {
    const teams = divisionMap.get(division.id) ?? [];
    if (teams.length > 0) {
      // Re-rank within division
      const rankedTeams = teams.map((t, i) => ({ ...t, rank: i + 1 }));
      result.push({
        divisionId: division.id,
        divisionName: division.name,
        teams: rankedTeams,
      });
    }
  }

  // Add teams without division
  const noDivisionTeams = divisionMap.get(null);
  if (noDivisionTeams && noDivisionTeams.length > 0) {
    result.push({
      divisionId: null,
      divisionName: 'Unassigned',
      teams: noDivisionTeams,
    });
  }

  return result;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get standings configuration for a season.
 */
export async function getStandingsConfig(seasonId: string): Promise<StandingsConfig | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('standings_config')
    .select('*')
    .eq('season_id', seasonId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    leagueId: data.league_id,
    seasonId: data.season_id,
    pointsWin: data.points_win,
    pointsLoss: data.points_loss,
    pointsTie: data.points_tie,
    tiebreakers: (data.tiebreakers as TiebreakerType[]) ?? ['goal_diff', 'goals_for', 'wins'],
    playoffTeamsPerDivision: data.playoff_teams_per_division ?? 4,
    playoffTeamsTotal: data.playoff_teams_total ?? 8,
    useDivisionPlayoffs: data.use_division_playoffs ?? true,
    showGoalDiff: data.show_goal_diff ?? true,
    showStreak: data.show_streak ?? true,
    showLast10: data.show_last_10 ?? true,
    showHomeAwaySplit: data.show_home_away_split ?? false,
    createdAt: new Date(data.created_at || Date.now()),
    updatedAt: new Date(data.updated_at || Date.now()),
  };
}

/**
 * Update standings configuration.
 */
export async function updateStandingsConfig(
  seasonId: string,
  leagueId: string,
  config: Partial<StandingsConfig>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const updateData: Record<string, unknown> = {};

  if (config.pointsWin !== undefined) updateData.points_win = config.pointsWin;
  if (config.pointsLoss !== undefined) updateData.points_loss = config.pointsLoss;
  if (config.pointsTie !== undefined) updateData.points_tie = config.pointsTie;
  if (config.tiebreakers !== undefined) updateData.tiebreakers = config.tiebreakers;
  if (config.playoffTeamsPerDivision !== undefined) updateData.playoff_teams_per_division = config.playoffTeamsPerDivision;
  if (config.playoffTeamsTotal !== undefined) updateData.playoff_teams_total = config.playoffTeamsTotal;
  if (config.useDivisionPlayoffs !== undefined) updateData.use_division_playoffs = config.useDivisionPlayoffs;
  if (config.showGoalDiff !== undefined) updateData.show_goal_diff = config.showGoalDiff;
  if (config.showStreak !== undefined) updateData.show_streak = config.showStreak;
  if (config.showLast10 !== undefined) updateData.show_last_10 = config.showLast10;
  if (config.showHomeAwaySplit !== undefined) updateData.show_home_away_split = config.showHomeAwaySplit;

  // Upsert config
  const { error } = await supabase
    .from('standings_config')
    .upsert(
      {
        season_id: seasonId,
        league_id: leagueId,
        ...updateData,
      },
      { onConflict: 'season_id' }
    );

  if (error) {
    console.error('Error updating standings config:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// REFRESH
// ============================================================================

/**
 * Manually refresh standings calculation.
 */
export async function refreshStandings(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('refresh_standings');

  if (error) {
    console.error('Error refreshing standings:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Generate CSV export of standings.
 */
export async function exportStandingsCSV(seasonId: string): Promise<string> {
  const standings = await getStandings(seasonId);

  const headers = ['Rank', 'Team', 'GP', 'W', 'L', 'T', 'PTS', 'GF', 'GA', 'DIFF', 'Home', 'Away'];
  const rows = standings.map((t) => [
    t.rank,
    t.teamName,
    t.gamesPlayed,
    t.wins,
    t.losses,
    t.ties,
    t.points,
    t.goalsFor,
    t.goalsAgainst,
    t.goalDiff,
    t.homeRecord,
    t.awayRecord,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csv;
}
