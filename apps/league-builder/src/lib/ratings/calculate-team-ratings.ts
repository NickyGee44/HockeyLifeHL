// @ts-nocheck — new tables pending migration; regenerate types after running migrations
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Enums } from '@hockey-life/database/types';
import type { TeamRatingRecord } from './types';

type PlayerGrade = Enums<'player_rating'>;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function inverseNormalize(value: number, min: number, max: number): number {
  return 1 - normalize(value, min, max);
}

function percentileToGrade(percentile: number): PlayerGrade {
  if (percentile >= 95) return 'A+';
  if (percentile >= 90) return 'A';
  if (percentile >= 85) return 'A-';
  if (percentile >= 80) return 'B+';
  if (percentile >= 75) return 'B';
  if (percentile >= 70) return 'B-';
  if (percentile >= 65) return 'C+';
  if (percentile >= 60) return 'C';
  if (percentile >= 55) return 'C-';
  if (percentile >= 50) return 'D+';
  if (percentile >= 45) return 'D';
  return 'D-';
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function takeTopAverage(values: number[], minCount: number, share: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  const count = Math.min(sorted.length, Math.max(minCount, Math.ceil(sorted.length * share)));
  return avg(sorted.slice(0, count));
}

export async function calculateTeamRatings(
  supabase: SupabaseClient<Database>,
  leagueId: string,
  seasonId: string
): Promise<{ records: TeamRatingRecord[] }> {
  const [teamsRes, contextRatingsRes, standingsRes] = await Promise.all([
    supabase
      .from('teams')
      .select('id, division_id, status')
      .eq('league_id', leagueId)
      .neq('status', 'inactive'),
    supabase
      .from('player_rating_contexts' as any)
      .select('player_id, team_id, overall_percentile, confidence_score, trust_score, position, stats_json')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('snapshot_kind', 'season_latest'),
    supabase
      .from('standings_calculated')
      .select('team_id, games_played, points, goals_for, goals_against')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
  ]);

  if (teamsRes.error) throw teamsRes.error;
  if (contextRatingsRes.error) throw contextRatingsRes.error;
  if (standingsRes.error) throw standingsRes.error;

  const standingsByTeam = new Map<string, {
    gamesPlayed: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
  }>();
  for (const row of standingsRes.data ?? []) {
    if (!row.team_id) continue;
    standingsByTeam.set(row.team_id, {
      gamesPlayed: Number(row.games_played ?? 0),
      points: Number(row.points ?? 0),
      goalsFor: Number(row.goals_for ?? 0),
      goalsAgainst: Number(row.goals_against ?? 0),
    });
  }

  const ratingsByTeam = new Map<string, Array<{
    overall: number;
    confidence: number;
    trust: number;
    position: 'skater' | 'goalie';
    offense: number;
    defense: number;
  }>>();

  for (const row of contextRatingsRes.data ?? []) {
    if (!row.team_id) continue;
    const stats = (row.stats_json ?? {}) as Record<string, unknown>;
    const list = ratingsByTeam.get(row.team_id) ?? [];
    list.push({
      overall: Number(row.overall_percentile ?? 0),
      confidence: Number(row.confidence_score ?? 0),
      trust: Math.max(1, Number(row.trust_score ?? 0)),
      position: (row.position as 'skater' | 'goalie') ?? 'skater',
      offense: Number(stats.offense_score ?? row.overall_percentile ?? 0),
      defense: Number(stats.defense_score ?? row.overall_percentile ?? 0),
    });
    ratingsByTeam.set(row.team_id, list);
  }

  const gaaByTeam: number[] = [];
  const pointsPctValues: number[] = [];
  const goalDiffPerGameValues: number[] = [];
  for (const row of standingsByTeam.values()) {
    if (row.gamesPlayed <= 0) continue;
    gaaByTeam.push(row.goalsAgainst / row.gamesPlayed);
    pointsPctValues.push(row.points / (row.gamesPlayed * 2));
    goalDiffPerGameValues.push((row.goalsFor - row.goalsAgainst) / row.gamesPlayed);
  }

  const gaaMin = Math.min(...gaaByTeam, 1);
  const gaaMax = Math.max(...gaaByTeam, 5);
  const pointsPctMin = Math.min(...pointsPctValues, 0);
  const pointsPctMax = Math.max(...pointsPctValues, 1);
  const goalDiffPerGameMin = Math.min(...goalDiffPerGameValues, -3);
  const goalDiffPerGameMax = Math.max(...goalDiffPerGameValues, 3);

  const now = new Date().toISOString();
  const records: TeamRatingRecord[] = [];

  for (const team of teamsRes.data ?? []) {
    const rosterRatings = ratingsByTeam.get(team.id) ?? [];
    const skaters = rosterRatings.filter((entry) => entry.position === 'skater');
    const goalies = rosterRatings.filter((entry) => entry.position === 'goalie');
    const overall = avg(rosterRatings.map((entry) => entry.overall));
    const offense = takeTopAverage(skaters.map((entry) => entry.offense), 4, 0.55);
    const rosterDefense = takeTopAverage(skaters.map((entry) => entry.defense), 4, 0.65);
    const goaltendingBase = goalies.length > 0
      ? avg(goalies.map((entry) => (entry.overall * 0.55) + (entry.defense * 0.45)))
      : 0;
    const depthFactor = takeTopAverage(rosterRatings.map((entry) => entry.overall), 6, 0.85);
    const trustCoverage = avg(rosterRatings.map((entry) => clamp(entry.trust / 12, 0, 1))) * 100;
    const confidenceCoverage = avg(rosterRatings.map((entry) => entry.confidence));

    const standing = standingsByTeam.get(team.id);
    const gamesPlayed = standing?.gamesPlayed ?? 0;
    const points = standing?.points ?? 0;
    const goalsFor = standing?.goalsFor ?? 0;
    const goalsAgainst = standing?.goalsAgainst ?? 0;

    const pointsPct = gamesPlayed > 0 ? points / (gamesPlayed * 2) : 0;
    const goalDiffPerGame = gamesPlayed > 0 ? (goalsFor - goalsAgainst) / gamesPlayed : 0;
    const recordFactor = round2((normalize(pointsPct, pointsPctMin, pointsPctMax) * 70) + (normalize(goalDiffPerGame, goalDiffPerGameMin, goalDiffPerGameMax) * 30));
    const gaa = gamesPlayed > 0 ? goalsAgainst / gamesPlayed : gaaMax;
    const teamDefenseFactor = inverseNormalize(gaa, gaaMin, gaaMax) * 100;
    const goaltending = round2(goalies.length > 0 ? goaltendingBase : teamDefenseFactor);
    const defense = round2(goalies.length > 0
      ? (rosterDefense * 0.55) + (goaltending * 0.2) + (teamDefenseFactor * 0.25)
      : (rosterDefense * 0.7) + (teamDefenseFactor * 0.3));

    const rosterStrength = round2((overall * 0.5) + (depthFactor * 0.2) + (trustCoverage * 0.15) + (confidenceCoverage * 0.15));
    const overallPercentile = round2(clamp(
      (offense * 0.28) +
      (defense * 0.24) +
      (goaltending * 0.18) +
      (recordFactor * 0.18) +
      (rosterStrength * 0.12),
      0,
      100
    ));

    records.push({
      team_id: team.id,
      season_id: seasonId,
      league_id: leagueId,
      division_id: team.division_id,
      overall_grade: percentileToGrade(overallPercentile),
      overall_percentile: overallPercentile,
      offense_rating: round2(offense),
      defense_rating: defense,
      goaltending_rating: round2(goaltending),
      record_factor: recordFactor,
      roster_count: rosterRatings.length,
      calculated_at: now,
    });
  }

  if (records.length > 0) {
    const { error: upsertError } = await supabase
      .from('team_ratings' as any)
      .upsert(records as any, { onConflict: 'team_id,season_id' });
    if (upsertError) throw upsertError;
  }

  return { records };
}
