// @ts-nocheck — new tables pending migration; regenerate types after running migrations
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Enums } from '@hockey-life/database/types';
import type {
  PlayerRatingContextRecord,
  PlayerRatingRecord,
  RatingCalculationSummary,
} from './types';

type PlayerGrade = Enums<'player_rating'>;

type DivisionInfo = {
  id: string;
  name: string;
  skill_level: string | null;
};

type RosterInfo = {
  player_id: string;
  team_id: string;
  division_id: string | null;
  is_goalie: boolean | null;
  position: string | null;
  end_date: string | null;
  start_date: string;
};

type MetricGroup = 'offense' | 'defense' | 'availability' | 'goalie';

type AdaptiveMetric<T> = {
  key: string;
  label: string;
  group: MetricGroup;
  weight: number;
  direction?: 'high' | 'low';
  getValue: (candidate: T) => number;
  isAvailable?: (cohort: T[]) => boolean;
  isAvailableForCandidate?: (candidate: T) => boolean;
};

type CandidateContextBase = {
  contextKey: string;
  playerId: string;
  teamId: string | null;
  divisionId: string | null;
  gamesPlayed: number;
  attendanceRate: number;
};

type PlayerContextAggregate = {
  contextKey: string;
  playerId: string;
  teamId: string | null;
  divisionId: string | null;
  position: 'skater' | 'goalie';
  gamesPlayed: number;
  pointsPerGame: number;
  attendanceRate: number;
  compositeScore: number;
  offensiveComponent: number;
  defensiveComponent: number;
  rawPercentile: number;
  overallPercentile: number;
  confidenceScore: number;
  trustScore: number;
  rating: PlayerGrade;
  stats: Record<string, unknown>;
};

const MIN_GAMES_FOR_RATING = 5;
const MIN_PLAYERS_FOR_DIVISION_RATING = 3;

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

function percentileFromRank(rank: number, total: number): number {
  if (total <= 1) return 50;
  return round2(clamp(((total - rank - 1) / (total - 1)) * 100, 0, 100));
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

function deriveDivisionSortScore(skillLevel: string | null): number {
  if (!skillLevel) return 0;
  const normalized = skillLevel.toLowerCase();
  if (/(elite|expert|pro|advanced|tier\s*1|a\+|\ba\b)/.test(normalized)) return 100;
  if (/(high|intermediate|tier\s*2|\bb\b)/.test(normalized)) return 75;
  if (/(development|beginner|tier\s*3|\bc\b)/.test(normalized)) return 50;
  if (/(novice|rec|tier\s*4|\bd\b)/.test(normalized)) return 25;
  return 40;
}

function buildDivisionTiers(divisions: DivisionInfo[]): Map<string, number> {
  const sorted = [...divisions].sort((a, b) => {
    const scoreDiff = deriveDivisionSortScore(b.skill_level) - deriveDivisionSortScore(a.skill_level);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });

  const tierMap = new Map<string, number>();
  sorted.forEach((division, idx) => {
    tierMap.set(division.id, clamp(idx + 1, 1, 4));
  });
  return tierMap;
}

function divisionWeightAndFloor(tier: number): { weight: number; floor: number } {
  switch (tier) {
    case 1:
      return { weight: 1, floor: 60 };
    case 2:
      return { weight: 0.85, floor: 40 };
    case 3:
      return { weight: 0.75, floor: 25 };
    default:
      return { weight: 0.65, floor: 10 };
  }
}

function weightedAverage(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return 50;
  return values.reduce((sum, entry) => sum + (entry.value * entry.weight), 0) / totalWeight;
}

function hasPositiveSignal(values: number[]): boolean {
  return values.some((value) => Number.isFinite(value) && value > 0);
}

function resolveActiveMetrics<T>(cohort: T[], candidate: T, metrics: AdaptiveMetric<T>[]) {
  const totalMetricWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  const active = metrics.filter((metric) => {
    if (metric.isAvailable && !metric.isAvailable(cohort)) return false;
    if (metric.isAvailableForCandidate) return metric.isAvailableForCandidate(candidate);
    return true;
  });
  const totalWeight = active.reduce((sum, metric) => sum + metric.weight, 0);
  return {
    active,
    coverage: totalMetricWeight > 0 ? totalWeight / totalMetricWeight : 0,
  };
}

function buildMetricBreakdown<T extends CandidateContextBase>(
  candidate: T,
  cohort: T[],
  metrics: AdaptiveMetric<T>[]
) {
  const { active, coverage } = resolveActiveMetrics(cohort, candidate, metrics);
  const activeWeight = active.reduce((sum, metric) => sum + metric.weight, 0);

  const breakdown = active.map((metric) => {
    const comparableCohort = metric.isAvailableForCandidate
      ? cohort.filter((entry) => metric.isAvailableForCandidate?.(entry))
      : cohort;
    const values = comparableCohort.map((entry) => metric.getValue(entry));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rawValue = metric.getValue(candidate);
    const normalizedScore = (metric.direction === 'low'
      ? inverseNormalize(rawValue, min, max)
      : normalize(rawValue, min, max)) * 100;
    const appliedWeight = activeWeight > 0 ? metric.weight / activeWeight : 0;

    return {
      key: metric.key,
      label: metric.label,
      group: metric.group,
      rawValue: round2(rawValue),
      normalizedScore: round2(normalizedScore),
      appliedWeight: round2(appliedWeight * 100),
    };
  });

  const offense = weightedAverage(
    breakdown
      .filter((metric) => metric.group === 'offense')
      .map((metric) => ({ value: metric.normalizedScore, weight: metric.appliedWeight }))
  );
  const defense = weightedAverage(
    breakdown
      .filter((metric) => metric.group === 'defense' || metric.group === 'goalie')
      .map((metric) => ({ value: metric.normalizedScore, weight: metric.appliedWeight }))
  );
  const composite = weightedAverage(
    breakdown.map((metric) => ({ value: metric.normalizedScore, weight: metric.appliedWeight }))
  );

  const gamesConfidence = clamp((candidate.gamesPlayed - MIN_GAMES_FOR_RATING + 3) / 12, 0.25, 1);
  const confidence = round2(((gamesConfidence * 0.6) + (coverage * 0.4)) * 100);

  return {
    compositeScore: round2(composite),
    offensiveComponent: round2(offense),
    defensiveComponent: round2(defense),
    confidenceScore: confidence,
    metricCoverage: round2(coverage * 100),
    breakdown,
  };
}

function rosterContextKey(playerId: string, teamId: string | null): string {
  return `${playerId}::${teamId ?? 'no-team'}`;
}

function isGoalieFromRoster(roster: RosterInfo | null): boolean {
  if (!roster) return false;
  if (roster.is_goalie === true) return true;
  return (roster.position || '').toLowerCase() === 'goalie';
}

export async function calculatePlayerRatings(
  supabase: SupabaseClient<Database>,
  leagueId: string,
  seasonId: string
): Promise<{ summary: RatingCalculationSummary; records: PlayerRatingRecord[] }> {
  const [divisionsRes, rostersRes, teamGamesRes, skaterStatsRes, goalieStatsRes] = await Promise.all([
    supabase.from('divisions').select('id, name, skill_level').eq('league_id', leagueId),
    supabase
      .from('team_rosters')
      .select('player_id, team_id, division_id, is_goalie, position, end_date, start_date')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    supabase
      .from('standings_calculated')
      .select('team_id, games_played')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    supabase
      .from('player_stats')
      .select(`
        player_id,
        team_id,
        game_id,
        goals,
        assists,
        plus_minus,
        penalty_minutes,
        shots,
        game_winning_goals,
        power_play_goals,
        power_play_assists,
        short_handed_goals,
        short_handed_assists
      `)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    supabase
      .from('goalie_stats')
      .select('player_id, team_id, game_id, saves, shots_against, goals_against, game_result, shutout')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
  ]);

  if (divisionsRes.error) throw divisionsRes.error;
  if (rostersRes.error) throw rostersRes.error;
  if (teamGamesRes.error) throw teamGamesRes.error;
  if (skaterStatsRes.error) throw skaterStatsRes.error;
  if (goalieStatsRes.error) throw goalieStatsRes.error;

  const divisions = (divisionsRes.data ?? []) as DivisionInfo[];
  const rosters = (rostersRes.data ?? []) as RosterInfo[];
  const divisionTierMap = buildDivisionTiers(divisions);

  const rosterByContext = new Map<string, RosterInfo>();
  const rostersByPlayer = new Map<string, RosterInfo[]>();
  for (const row of rosters) {
    const key = rosterContextKey(row.player_id, row.team_id);
    const existing = rosterByContext.get(key);
    if (!existing || (!row.end_date && existing.end_date) || row.start_date > existing.start_date) {
      rosterByContext.set(key, row);
    }
    const playerRows = rostersByPlayer.get(row.player_id) ?? [];
    playerRows.push(row);
    rostersByPlayer.set(row.player_id, playerRows);
  }

  const teamGamesPlayed = new Map<string, number>();
  for (const row of teamGamesRes.data ?? []) {
    if (!row.team_id) continue;
    teamGamesPlayed.set(row.team_id, Number(row.games_played ?? 0));
  }

  const skaterAggregate = new Map<string, {
    playerId: string;
    teamId: string | null;
    games: Set<string>;
    goals: number;
    assists: number;
    points: number;
    plusMinus: number;
    pim: number;
    shots: number;
    gameWinningGoals: number;
    specialTeamsPoints: number;
  }>();

  for (const row of skaterStatsRes.data ?? []) {
    const key = rosterContextKey(row.player_id, row.team_id);
    const entry = skaterAggregate.get(key) ?? {
      playerId: row.player_id,
      teamId: row.team_id,
      games: new Set<string>(),
      goals: 0,
      assists: 0,
      points: 0,
      plusMinus: 0,
      pim: 0,
      shots: 0,
      gameWinningGoals: 0,
      specialTeamsPoints: 0,
    };
    entry.games.add(row.game_id);
    entry.goals += Number(row.goals ?? 0);
    entry.assists += Number(row.assists ?? 0);
    entry.points += Number(row.goals ?? 0) + Number(row.assists ?? 0);
    entry.plusMinus += Number(row.plus_minus ?? 0);
    entry.pim += Number(row.penalty_minutes ?? 0);
    entry.shots += Number(row.shots ?? 0);
    entry.gameWinningGoals += Number(row.game_winning_goals ?? 0);
    entry.specialTeamsPoints +=
      Number(row.power_play_goals ?? 0) +
      Number(row.power_play_assists ?? 0) +
      Number(row.short_handed_goals ?? 0) +
      Number(row.short_handed_assists ?? 0);
    skaterAggregate.set(key, entry);
  }

  const goalieAggregate = new Map<string, {
    playerId: string;
    teamId: string | null;
    games: Set<string>;
    saves: number;
    shotsAgainst: number;
    goalsAgainst: number;
    wins: number;
    shutouts: number;
  }>();

  for (const row of goalieStatsRes.data ?? []) {
    const key = rosterContextKey(row.player_id, row.team_id);
    const entry = goalieAggregate.get(key) ?? {
      playerId: row.player_id,
      teamId: row.team_id,
      games: new Set<string>(),
      saves: 0,
      shotsAgainst: 0,
      goalsAgainst: 0,
      wins: 0,
      shutouts: 0,
    };
    entry.games.add(row.game_id);
    entry.saves += Number(row.saves ?? 0);
    entry.shotsAgainst += Number(row.shots_against ?? 0);
    entry.goalsAgainst += Number(row.goals_against ?? 0);
    if ((row.game_result || '').toLowerCase().startsWith('w')) entry.wins += 1;
    if (row.shutout) entry.shutouts += 1;
    goalieAggregate.set(key, entry);
  }

  const skaterCandidates: Array<CandidateContextBase & {
    playerId: string;
    teamId: string | null;
    divisionId: string | null;
    pointsPerGame: number;
    plusMinusPerGame: number;
    pimPerGame: number;
    goals: number;
    assists: number;
    points: number;
    shots: number;
    goalsPerGame: number;
    assistsPerGame: number;
    shotsPerGame: number;
    gameWinningGoals: number;
    gameWinningGoalsPerGame: number;
    specialTeamsPoints: number;
    specialTeamsPointsPerGame: number;
  }> = [];

  for (const [contextKey, agg] of skaterAggregate.entries()) {
    const roster = rosterByContext.get(contextKey)
      ?? rostersByPlayer.get(agg.playerId)?.find((row) => row.team_id === agg.teamId)
      ?? null;
    if (isGoalieFromRoster(roster)) continue;

    const gamesPlayed = agg.games.size;
    if (gamesPlayed < MIN_GAMES_FOR_RATING) continue;

    const teamId = agg.teamId ?? roster?.team_id ?? null;
    const divisionId = roster?.division_id ?? null;
    const teamGames = teamId ? (teamGamesPlayed.get(teamId) ?? 0) : 0;

    skaterCandidates.push({
      contextKey,
      playerId: agg.playerId,
      teamId,
      divisionId,
      gamesPlayed,
      attendanceRate: teamGames > 0 ? gamesPlayed / teamGames : 0,
      pointsPerGame: agg.points / gamesPlayed,
      plusMinusPerGame: agg.plusMinus / gamesPlayed,
      pimPerGame: agg.pim / gamesPlayed,
      goals: agg.goals,
      assists: agg.assists,
      points: agg.points,
      shots: agg.shots,
      goalsPerGame: agg.goals / gamesPlayed,
      assistsPerGame: agg.assists / gamesPlayed,
      shotsPerGame: agg.shots / gamesPlayed,
      gameWinningGoals: agg.gameWinningGoals,
      gameWinningGoalsPerGame: agg.gameWinningGoals / gamesPlayed,
      specialTeamsPoints: agg.specialTeamsPoints,
      specialTeamsPointsPerGame: agg.specialTeamsPoints / gamesPlayed,
    });
  }

  const goalieCandidates: Array<CandidateContextBase & {
    playerId: string;
    teamId: string | null;
    divisionId: string | null;
    savePct: number;
    gaa: number;
    winPct: number;
    wins: number;
    saves: number;
    shotsAgainst: number;
    goalsAgainst: number;
    shutouts: number;
    savePctAvailable: boolean;
    shotsAgainstPerGame: number;
    shutoutRate: number;
  }> = [];

  for (const [contextKey, agg] of goalieAggregate.entries()) {
    const roster = rosterByContext.get(contextKey)
      ?? rostersByPlayer.get(agg.playerId)?.find((row) => row.team_id === agg.teamId)
      ?? null;
    const markedGoalie = isGoalieFromRoster(roster);
    if (!markedGoalie && Array.from(skaterAggregate.values()).some((entry) => entry.playerId === agg.playerId)) {
      continue;
    }

    const gamesPlayed = agg.games.size;
    if (gamesPlayed < MIN_GAMES_FOR_RATING) continue;

    const teamId = agg.teamId ?? roster?.team_id ?? null;
    const divisionId = roster?.division_id ?? null;
    const teamGames = teamId ? (teamGamesPlayed.get(teamId) ?? 0) : 0;

    goalieCandidates.push({
      contextKey,
      playerId: agg.playerId,
      teamId,
      divisionId,
      gamesPlayed,
      attendanceRate: teamGames > 0 ? gamesPlayed / teamGames : 0,
      savePct: agg.shotsAgainst > 0 ? agg.saves / agg.shotsAgainst : 0,
      gaa: gamesPlayed > 0 ? agg.goalsAgainst / gamesPlayed : 0,
      winPct: gamesPlayed > 0 ? agg.wins / gamesPlayed : 0,
      wins: agg.wins,
      saves: agg.saves,
      shotsAgainst: agg.shotsAgainst,
      goalsAgainst: agg.goalsAgainst,
      shutouts: agg.shutouts,
      savePctAvailable: agg.shotsAgainst > 0,
      shotsAgainstPerGame: gamesPlayed > 0 ? agg.shotsAgainst / gamesPlayed : 0,
      shutoutRate: gamesPlayed > 0 ? agg.shutouts / gamesPlayed : 0,
    });
  }

  const skatersByDivision = new Map<string, typeof skaterCandidates>();
  for (const player of skaterCandidates) {
    const key = player.divisionId ?? 'unassigned';
    const list = skatersByDivision.get(key) ?? [];
    list.push(player);
    skatersByDivision.set(key, list);
  }

  const goaliesByDivision = new Map<string, typeof goalieCandidates>();
  for (const player of goalieCandidates) {
    const key = player.divisionId ?? 'unassigned';
    const list = goaliesByDivision.get(key) ?? [];
    list.push(player);
    goaliesByDivision.set(key, list);
  }

  const contextAggregates: PlayerContextAggregate[] = [];
  const allDivisionKeys = new Set([...skatersByDivision.keys(), ...goaliesByDivision.keys()]);

  for (const divisionKey of allDivisionKeys) {
    const divisionId = divisionKey === 'unassigned' ? null : divisionKey;
    const tier = divisionId ? (divisionTierMap.get(divisionId) ?? 4) : 4;
    const tierPolicy = divisionWeightAndFloor(tier);
    const divisionContexts: PlayerContextAggregate[] = [];
    const divSkaters = skatersByDivision.get(divisionKey) ?? [];
    const divGoalies = goaliesByDivision.get(divisionKey) ?? [];

    if (divSkaters.length > 0) {
      const skaterMetrics: AdaptiveMetric<(typeof divSkaters)[number]>[] = [
        { key: 'points_per_game', label: 'Points per game', group: 'offense', weight: 0.32, getValue: (player) => player.pointsPerGame },
        { key: 'goals_per_game', label: 'Goals per game', group: 'offense', weight: 0.1, getValue: (player) => player.goalsPerGame, isAvailable: (cohort) => hasPositiveSignal(cohort.map((player) => player.goals)) },
        { key: 'assists_per_game', label: 'Assists per game', group: 'offense', weight: 0.1, getValue: (player) => player.assistsPerGame, isAvailable: (cohort) => hasPositiveSignal(cohort.map((player) => player.assists)) },
        { key: 'shot_generation', label: 'Shots per game', group: 'offense', weight: 0.08, getValue: (player) => player.shotsPerGame, isAvailable: (cohort) => hasPositiveSignal(cohort.map((player) => player.shots)) },
        { key: 'two_way_impact', label: 'Plus/minus per game', group: 'defense', weight: 0.14, getValue: (player) => player.plusMinusPerGame },
        { key: 'discipline', label: 'Penalty minutes per game', group: 'defense', weight: 0.08, direction: 'low', getValue: (player) => player.pimPerGame, isAvailable: (cohort) => hasPositiveSignal(cohort.map((player) => player.pimPerGame)) },
        { key: 'special_teams', label: 'Special-teams points per game', group: 'offense', weight: 0.1, getValue: (player) => player.specialTeamsPointsPerGame, isAvailable: (cohort) => hasPositiveSignal(cohort.map((player) => player.specialTeamsPoints)) },
        { key: 'clutch_scoring', label: 'Game-winning goals per game', group: 'offense', weight: 0.03, getValue: (player) => player.gameWinningGoalsPerGame, isAvailable: (cohort) => hasPositiveSignal(cohort.map((player) => player.gameWinningGoals)) },
        { key: 'attendance', label: 'Attendance rate', group: 'availability', weight: 0.05, getValue: (player) => player.attendanceRate },
      ];

      for (const player of divSkaters) {
        const scoring = buildMetricBreakdown(player, divSkaters, skaterMetrics);
        divisionContexts.push({
          contextKey: player.contextKey,
          playerId: player.playerId,
          teamId: player.teamId,
          divisionId: player.divisionId,
          position: 'skater',
          gamesPlayed: player.gamesPlayed,
          pointsPerGame: round2(player.pointsPerGame),
          attendanceRate: round2(player.attendanceRate),
          compositeScore: scoring.compositeScore,
          offensiveComponent: scoring.offensiveComponent,
          defensiveComponent: scoring.defensiveComponent,
          rawPercentile: 0,
          overallPercentile: 0,
          confidenceScore: scoring.confidenceScore,
          trustScore: 0,
          rating: 'D-',
          stats: {
            goals: player.goals,
            assists: player.assists,
            points: player.points,
            shots: player.shots,
            plusMinusPerGame: round2(player.plusMinusPerGame),
            pimPerGame: round2(player.pimPerGame),
            goalsPerGame: round2(player.goalsPerGame),
            assistsPerGame: round2(player.assistsPerGame),
            shotsPerGame: round2(player.shotsPerGame),
            specialTeamsPoints: player.specialTeamsPoints,
            specialTeamsPointsPerGame: round2(player.specialTeamsPointsPerGame),
            gameWinningGoals: player.gameWinningGoals,
            gameWinningGoalsPerGame: round2(player.gameWinningGoalsPerGame),
            metricCoverage: scoring.metricCoverage,
            breakdown: scoring.breakdown,
          },
        });
      }
    }

    if (divGoalies.length > 0) {
      const goalieMetrics: AdaptiveMetric<(typeof divGoalies)[number]>[] = [
        { key: 'save_percentage', label: 'Save percentage', group: 'goalie', weight: 0.3, getValue: (player) => player.savePct, isAvailable: (cohort) => cohort.some((player) => player.savePctAvailable), isAvailableForCandidate: (player) => player.savePctAvailable },
        { key: 'goals_against_average', label: 'Goals against per game', group: 'goalie', weight: 0.24, direction: 'low', getValue: (player) => player.gaa },
        { key: 'win_rate', label: 'Win rate', group: 'goalie', weight: 0.2, getValue: (player) => player.winPct },
        { key: 'shutout_rate', label: 'Shutout rate', group: 'goalie', weight: 0.08, getValue: (player) => player.shutoutRate, isAvailable: (cohort) => hasPositiveSignal(cohort.map((player) => player.shutouts)) },
        { key: 'workload', label: 'Shots against per game', group: 'goalie', weight: 0.08, getValue: (player) => player.shotsAgainstPerGame, isAvailable: (cohort) => cohort.some((player) => player.shotsAgainst > 0), isAvailableForCandidate: (player) => player.shotsAgainst > 0 },
        { key: 'attendance', label: 'Attendance rate', group: 'availability', weight: 0.1, getValue: (player) => player.attendanceRate },
      ];

      for (const player of divGoalies) {
        const scoring = buildMetricBreakdown(player, divGoalies, goalieMetrics);
        divisionContexts.push({
          contextKey: player.contextKey,
          playerId: player.playerId,
          teamId: player.teamId,
          divisionId: player.divisionId,
          position: 'goalie',
          gamesPlayed: player.gamesPlayed,
          pointsPerGame: 0,
          attendanceRate: round2(player.attendanceRate),
          compositeScore: scoring.compositeScore,
          offensiveComponent: round2(clamp(player.winPct, 0, 1) * 100),
          defensiveComponent: scoring.defensiveComponent,
          rawPercentile: 0,
          overallPercentile: 0,
          confidenceScore: scoring.confidenceScore,
          trustScore: 0,
          rating: 'D-',
          stats: {
            saves: player.saves,
            shotsAgainst: player.shotsAgainst,
            goalsAgainst: player.goalsAgainst,
            savePct: round2(player.savePct),
            gaa: round2(player.gaa),
            winPct: round2(player.winPct),
            wins: player.wins,
            shutouts: player.shutouts,
            shutoutRate: round2(player.shutoutRate),
            shotsAgainstPerGame: round2(player.shotsAgainstPerGame),
            metricCoverage: scoring.metricCoverage,
            breakdown: scoring.breakdown,
          },
        });
      }
    }

    if (divisionContexts.length < MIN_PLAYERS_FOR_DIVISION_RATING) {
      for (const player of divisionContexts) {
        player.rawPercentile = 50;
        player.overallPercentile = 50;
        player.rating = percentileToGrade(50);
        player.trustScore = round2((player.gamesPlayed * player.confidenceScore) / 100);
      }
      contextAggregates.push(...divisionContexts);
      continue;
    }

    const sorted = [...divisionContexts].sort((a, b) => b.compositeScore - a.compositeScore);
    sorted.forEach((player, idx) => {
      const rawPercentile = percentileFromRank(idx, sorted.length);
      const weightedPercentile = clamp(Math.max(rawPercentile * tierPolicy.weight, tierPolicy.floor), 0, 100);
      player.rawPercentile = rawPercentile;
      player.overallPercentile = round2(weightedPercentile);
      player.rating = percentileToGrade(player.overallPercentile);
      const tierTrustBoost = tierPolicy.weight * 100;
      player.trustScore = round2(((player.gamesPlayed * player.confidenceScore) / 100) * (tierTrustBoost / 100));
    });

    contextAggregates.push(...divisionContexts);
  }

  const contextsByPlayer = new Map<string, PlayerContextAggregate[]>();
  for (const context of contextAggregates) {
    const list = contextsByPlayer.get(context.playerId) ?? [];
    list.push(context);
    contextsByPlayer.set(context.playerId, list);
  }

  const now = new Date().toISOString();

  const contextRecords: PlayerRatingContextRecord[] = contextAggregates.map((context) => ({
    league_id: leagueId,
    season_id: seasonId,
    player_id: context.playerId,
    team_id: context.teamId,
    division_id: context.divisionId,
    rating: context.rating,
    games_played: context.gamesPlayed,
    attendance_rate: round2(context.attendanceRate),
    points_per_game: round2(context.pointsPerGame),
    raw_percentile: round2(context.rawPercentile),
    overall_percentile: round2(context.overallPercentile),
    confidence_score: round2(context.confidenceScore),
    trust_score: round2(context.trustScore),
    position: context.position,
    snapshot_kind: 'season_latest',
    stats_json: {
      ...context.stats,
      composite_score: context.compositeScore,
      offense_score: context.offensiveComponent,
      defense_score: context.defensiveComponent,
      ratingConfidence: context.confidenceScore,
      trustScore: context.trustScore,
      snapshotKind: 'season_latest',
      scope: 'league_season_team_context',
    },
    calculated_at: now,
  }));

  const records: PlayerRatingRecord[] = Array.from(contextsByPlayer.entries()).map(([playerId, playerContexts]) => {
    const weighted = playerContexts.map((context) => ({
      value: context.overallPercentile,
      weight: Math.max(1, context.trustScore),
    }));
    const weightedRaw = playerContexts.map((context) => ({
      value: context.rawPercentile,
      weight: Math.max(1, context.trustScore),
    }));
    const weightedPpg = playerContexts.map((context) => ({
      value: context.pointsPerGame,
      weight: Math.max(1, context.gamesPlayed),
    }));
    const totalGames = playerContexts.reduce((sum, context) => sum + context.gamesPlayed, 0);
    const attendance = weightedAverage(
      playerContexts.map((context) => ({ value: context.attendanceRate, weight: Math.max(1, context.gamesPlayed) }))
    );
    const primaryContext = [...playerContexts].sort((a, b) => b.trustScore - a.trustScore || b.gamesPlayed - a.gamesPlayed)[0];
    const overallPercentile = round2(weightedAverage(weighted));
    const rawPercentile = round2(weightedAverage(weightedRaw));
    const confidenceScore = round2(weightedAverage(
      playerContexts.map((context) => ({ value: context.confidenceScore, weight: Math.max(1, context.gamesPlayed) }))
    ));
    const totalTrust = round2(playerContexts.reduce((sum, context) => sum + context.trustScore, 0));
    const contextSummary = playerContexts
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .map((context) => ({
        teamId: context.teamId,
        divisionId: context.divisionId,
        gamesPlayed: context.gamesPlayed,
        rating: context.rating,
        overallPercentile: context.overallPercentile,
        rawPercentile: context.rawPercentile,
        confidenceScore: context.confidenceScore,
        trustScore: context.trustScore,
        position: context.position,
      }));

    return {
      league_id: leagueId,
      season_id: seasonId,
      player_id: playerId,
      division_id: primaryContext?.divisionId ?? null,
      rating: percentileToGrade(overallPercentile),
      games_played: totalGames,
      attendance_rate: round2(attendance),
      points_per_game: round2(weightedAverage(weightedPpg)),
      raw_percentile: rawPercentile,
      overall_percentile: overallPercentile,
      position: primaryContext?.position ?? 'skater',
      stats_json: {
        ...(primaryContext?.stats ?? {}),
        composite_score: round2(weightedAverage(playerContexts.map((context) => ({ value: context.compositeScore, weight: Math.max(1, context.trustScore) })))),
        offense_score: round2(weightedAverage(playerContexts.map((context) => ({ value: context.offensiveComponent, weight: Math.max(1, context.trustScore) })))),
        defense_score: round2(weightedAverage(playerContexts.map((context) => ({ value: context.defensiveComponent, weight: Math.max(1, context.trustScore) })))),
        ratingConfidence: confidenceScore,
        trustScore: totalTrust,
        contextCount: playerContexts.length,
        primaryTeamId: primaryContext?.teamId ?? null,
        primaryDivisionId: primaryContext?.divisionId ?? null,
        snapshotKind: 'season_latest',
        scope: 'league_season_overall',
        weeklyTrendAvailable: false,
        contexts: contextSummary,
        breakdown: primaryContext?.stats?.breakdown ?? [],
      },
      calculated_at: now,
    };
  });

  if (contextRecords.length > 0) {
    const { error: deleteContextError } = await supabase
      .from('player_rating_contexts' as any)
      .delete()
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('snapshot_kind', 'season_latest');
    if (deleteContextError) throw deleteContextError;

    const { error: insertContextError } = await supabase
      .from('player_rating_contexts' as any)
      .insert(contextRecords as any[]);
    if (insertContextError) throw insertContextError;
  }

  if (records.length > 0) {
    const { error: upsertError } = await supabase
      .from('player_ratings')
      .upsert(records, { onConflict: 'league_id,player_id,season_id' });
    if (upsertError) throw upsertError;
  }

  const processedPlayers = new Set([
    ...Array.from(skaterAggregate.values()).map((entry) => entry.playerId),
    ...Array.from(goalieAggregate.values()).map((entry) => entry.playerId),
  ]);

  const summary: RatingCalculationSummary = {
    leagueId,
    seasonId,
    playersProcessed: processedPlayers.size,
    playersRated: records.length,
    playerContextsRated: contextRecords.length,
    skippedForMinGames: processedPlayers.size - records.length,
  };

  return { summary, records };
}
