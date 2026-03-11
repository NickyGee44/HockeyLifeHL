// @ts-nocheck — new tables pending migration; regenerate types after running migrations
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@hockey-life/database/types';
import type {
  DivisionBalanceResult,
  DivisionRecommendation,
  DivisionTeamBalance,
} from './types';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, value) => sum + ((value - m) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function divisionSortKey(name: string): number {
  const normalized = name.toLowerCase();
  if (/(elite|expert|pro|advanced|tier\s*1|\ba\b)/.test(normalized)) return 100;
  if (/(intermediate|tier\s*2|\bb\b)/.test(normalized)) return 75;
  if (/(beginner|development|tier\s*3|\bc\b)/.test(normalized)) return 50;
  if (/(novice|rec|tier\s*4|\bd\b)/.test(normalized)) return 25;
  return 40;
}

export async function calculateDivisionBalance(
  supabase: SupabaseClient<Database>,
  leagueId: string,
  seasonId: string
): Promise<DivisionBalanceResult> {
  const [teamRatingsRes, divisionsRes] = await Promise.all([
    supabase
      .from('team_ratings' as any)
      .select('team_id, division_id, overall_percentile, overall_grade, roster_count, teams(name)')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    supabase
      .from('divisions')
      .select('id, name, skill_level')
      .eq('league_id', leagueId),
  ]);

  if (teamRatingsRes.error) throw teamRatingsRes.error;
  if (divisionsRes.error) throw divisionsRes.error;

  const divisions = (divisionsRes.data ?? []).map((division) => ({
    id: division.id,
    name: division.name,
    skill: division.skill_level,
  }));

  const divisionNameById = new Map<string, string>();
  for (const division of divisions) {
    divisionNameById.set(division.id, division.name);
  }

  const sortedDivisionIds = [...divisions]
    .sort((a, b) => {
      const scoreDiff = divisionSortKey(b.name) - divisionSortKey(a.name);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    })
    .map((division) => division.id);

  const tierByDivision = new Map<string, number>();
  sortedDivisionIds.forEach((divisionId, idx) => {
    tierByDivision.set(divisionId, idx + 1);
  });

  const rows = (teamRatingsRes.data ?? []) as Array<{
    team_id: string;
    division_id: string | null;
    overall_percentile: number | null;
    overall_grade: string | null;
    roster_count: number | null;
    teams: { name: string } | { name: string }[] | null;
  }>;

  const grouped = new Map<string, Array<{
    teamId: string;
    teamName: string;
    overallPercentile: number;
    overallGrade: string;
    rosterCount: number;
  }>>();

  for (const row of rows) {
    const divisionKey = row.division_id ?? 'unassigned';
    const teams = grouped.get(divisionKey) ?? [];
    const teamName = Array.isArray(row.teams)
      ? (row.teams[0]?.name ?? 'Unknown Team')
      : (row.teams?.name ?? 'Unknown Team');

    teams.push({
      teamId: row.team_id,
      teamName,
      overallPercentile: Number(row.overall_percentile ?? 0),
      overallGrade: row.overall_grade ?? 'D-',
      rosterCount: Number(row.roster_count ?? 0),
    });

    grouped.set(divisionKey, teams);
  }

  const divisionsOutput: DivisionBalanceResult['divisions'] = [];
  const recommendations: DivisionRecommendation[] = [];

  for (const [divisionKey, teams] of grouped.entries()) {
    const values = teams.map((team) => team.overallPercentile);
    const m = mean(values);
    const sd = stdDev(values);

    const teamsWithFlags: DivisionTeamBalance[] = teams
      .map((team) => {
        const zScore = sd === 0 ? 0 : (team.overallPercentile - m) / sd;
        let flag: 'above' | 'below' | null = null;
        if (zScore >= 1) flag = 'above';
        if (zScore <= -1) flag = 'below';

        return {
          teamId: team.teamId,
          teamName: team.teamName,
          overallPercentile: round2(team.overallPercentile),
          overallGrade: team.overallGrade as any,
          zScore: round2(zScore),
          flag,
        };
      })
      .sort((a, b) => b.overallPercentile - a.overallPercentile);

    const divisionId = divisionKey === 'unassigned' ? null : divisionKey;
    const divisionName = divisionId ? (divisionNameById.get(divisionId) ?? 'Unknown Division') : 'Unassigned';

    divisionsOutput.push({
      divisionId,
      divisionName,
      mean: round2(m),
      stdDev: round2(sd),
      teams: teamsWithFlags,
    });
  }

  divisionsOutput.sort((a, b) => {
    const tierA = a.divisionId ? (tierByDivision.get(a.divisionId) ?? 999) : 999;
    const tierB = b.divisionId ? (tierByDivision.get(b.divisionId) ?? 999) : 999;
    return tierA - tierB;
  });

  for (let index = 0; index < divisionsOutput.length; index++) {
    const division = divisionsOutput[index];
    if (!division.divisionId || division.teams.length < 3) continue;

    for (const team of division.teams) {
      if (!team.flag) continue;

      const targetDivision = team.flag === 'above'
        ? divisionsOutput[index - 1] ?? null
        : divisionsOutput[index + 1] ?? null;

      if (!targetDivision?.divisionId || targetDivision.teams.length < 3) {
        continue;
      }

      const currentGap = team.flag === 'above'
        ? team.overallPercentile - division.mean
        : division.mean - team.overallPercentile;
      const targetGap = Math.abs(team.overallPercentile - targetDivision.mean);
      const targetAllowance = Math.max(6, targetDivision.stdDev * 1.25);
      const isDominantMismatch = Math.abs(team.zScore) >= 1 && currentGap >= 6;
      const fitsAdjacentDivision = targetGap <= targetAllowance;

      if (!isDominantMismatch || !fitsAdjacentDivision) {
        continue;
      }

      const direction = team.flag === 'above' ? 'move_up' : 'move_down';
      const impact = round2(Math.max(4, (currentGap * 0.7) + (Math.max(0, targetAllowance - targetGap) * 0.4)));

      recommendations.push({
        teamId: team.teamId,
        teamName: team.teamName,
        fromDivisionId: division.divisionId,
        fromDivisionName: division.divisionName,
        toDivisionId: targetDivision.divisionId,
        toDivisionName: targetDivision.divisionName,
        direction,
        reason:
          direction === 'move_up'
            ? `${team.teamName} is ${currentGap.toFixed(1)} points above the ${division.divisionName} average and sits within ${targetGap.toFixed(1)} points of the ${targetDivision.divisionName} average.`
            : `${team.teamName} is ${currentGap.toFixed(1)} points below the ${division.divisionName} average and sits within ${targetGap.toFixed(1)} points of the ${targetDivision.divisionName} average.`,
        impact,
      });
    }
  }

  const avgStdDev = mean(divisionsOutput.map((division) => division.stdDev));
  const outlierPenalty = recommendations.length * 3;
  const baseScore = 100 - (avgStdDev * 1.8) - outlierPenalty;
  const balanceScore = round2(clamp(baseScore, 0, 100));

  return {
    leagueId,
    seasonId,
    balanceScore,
    divisions: divisionsOutput,
    recommendations,
    calculatedAt: new Date().toISOString(),
  };
}
