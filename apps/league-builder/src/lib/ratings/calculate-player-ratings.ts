import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Enums } from '@hockey-life/database/types';
import type { PlayerRatingRecord, RatingCalculationSummary } from './types';

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

type PlayerAggregate = {
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
  rating: PlayerGrade;
  stats: Record<string, unknown>;
};

const MIN_GAMES_FOR_RATING = 5;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0.5;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

function inverseNormalize(value: number, min: number, max: number): number {
  return 1 - normalize(value, min, max);
}

function percentileFromRank(rank: number, total: number): number {
  if (total <= 1) {
    return 100;
  }
  const p = ((total - rank - 1) / (total - 1)) * 100;
  return round2(clamp(p, 0, 100));
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
      return { weight: 1.0, floor: 60 };
    case 2:
      return { weight: 0.85, floor: 40 };
    case 3:
      return { weight: 0.75, floor: 25 };
    default:
      return { weight: 0.65, floor: 10 };
  }
}

function mostRecentRosterEntry(rows: RosterInfo[]): RosterInfo | null {
  if (rows.length === 0) return null;
  const active = rows.filter((row) => !row.end_date);
  const candidates = active.length > 0 ? active : rows;
  return [...candidates].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null;
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
    supabase
      .from('divisions')
      .select('id, name, skill_level')
      .eq('league_id', leagueId),
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
      .select('player_id, team_id, game_id, goals, assists, plus_minus, penalty_minutes, shots')
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

  const rosterByPlayer = new Map<string, RosterInfo[]>();
  for (const row of rosters) {
    const list = rosterByPlayer.get(row.player_id) ?? [];
    list.push(row);
    rosterByPlayer.set(row.player_id, list);
  }

  const latestRosterByPlayer = new Map<string, RosterInfo>();
  for (const [playerId, rows] of rosterByPlayer.entries()) {
    const row = mostRecentRosterEntry(rows);
    if (row) latestRosterByPlayer.set(playerId, row);
  }

  const teamGamesPlayed = new Map<string, number>();
  for (const row of teamGamesRes.data ?? []) {
    if (!row.team_id) continue;
    teamGamesPlayed.set(row.team_id, Number(row.games_played ?? 0));
  }

  const skaterAggregate = new Map<string, {
    games: Set<string>;
    teamId: string | null;
    goals: number;
    assists: number;
    points: number;
    plusMinus: number;
    pim: number;
    shots: number;
  }>();

  for (const row of skaterStatsRes.data ?? []) {
    const entry = skaterAggregate.get(row.player_id) ?? {
      games: new Set<string>(),
      teamId: row.team_id,
      goals: 0,
      assists: 0,
      points: 0,
      plusMinus: 0,
      pim: 0,
      shots: 0,
    };

    entry.games.add(row.game_id);
    entry.teamId = entry.teamId ?? row.team_id;
    entry.goals += Number(row.goals ?? 0);
    entry.assists += Number(row.assists ?? 0);
    entry.points += Number(row.goals ?? 0) + Number(row.assists ?? 0);
    entry.plusMinus += Number(row.plus_minus ?? 0);
    entry.pim += Number(row.penalty_minutes ?? 0);
    entry.shots += Number(row.shots ?? 0);

    skaterAggregate.set(row.player_id, entry);
  }

  const goalieAggregate = new Map<string, {
    games: Set<string>;
    teamId: string | null;
    saves: number;
    shotsAgainst: number;
    goalsAgainst: number;
    wins: number;
    shutouts: number;
  }>();

  for (const row of goalieStatsRes.data ?? []) {
    const entry = goalieAggregate.get(row.player_id) ?? {
      games: new Set<string>(),
      teamId: row.team_id,
      saves: 0,
      shotsAgainst: 0,
      goalsAgainst: 0,
      wins: 0,
      shutouts: 0,
    };

    entry.games.add(row.game_id);
    entry.teamId = entry.teamId ?? row.team_id;
    entry.saves += Number(row.saves ?? 0);
    entry.shotsAgainst += Number(row.shots_against ?? 0);
    entry.goalsAgainst += Number(row.goals_against ?? 0);
    if ((row.game_result || '').toLowerCase().startsWith('w')) {
      entry.wins += 1;
    }
    if (row.shutout) {
      entry.shutouts += 1;
    }

    goalieAggregate.set(row.player_id, entry);
  }

  const skaterCandidates: Array<{
    playerId: string;
    teamId: string | null;
    divisionId: string | null;
    gamesPlayed: number;
    pointsPerGame: number;
    attendanceRate: number;
    plusMinusPerGame: number;
    pimPerGame: number;
    goals: number;
    assists: number;
    points: number;
    shots: number;
  }> = [];

  for (const [playerId, agg] of skaterAggregate.entries()) {
    const roster = latestRosterByPlayer.get(playerId) ?? null;
    if (isGoalieFromRoster(roster)) continue;

    const gamesPlayed = agg.games.size;
    if (gamesPlayed < MIN_GAMES_FOR_RATING) continue;

    const teamId = agg.teamId ?? roster?.team_id ?? null;
    const divisionId = roster?.division_id ?? null;
    const teamGames = teamId ? teamGamesPlayed.get(teamId) ?? 0 : 0;

    skaterCandidates.push({
      playerId,
      teamId,
      divisionId,
      gamesPlayed,
      pointsPerGame: agg.points / gamesPlayed,
      attendanceRate: teamGames > 0 ? gamesPlayed / teamGames : 0,
      plusMinusPerGame: agg.plusMinus / gamesPlayed,
      pimPerGame: agg.pim / gamesPlayed,
      goals: agg.goals,
      assists: agg.assists,
      points: agg.points,
      shots: agg.shots,
    });
  }

  const goalieCandidates: Array<{
    playerId: string;
    teamId: string | null;
    divisionId: string | null;
    gamesPlayed: number;
    savePct: number;
    gaa: number;
    winPct: number;
    attendanceRate: number;
    wins: number;
    saves: number;
    shotsAgainst: number;
    goalsAgainst: number;
    shutouts: number;
  }> = [];

  for (const [playerId, agg] of goalieAggregate.entries()) {
    const roster = latestRosterByPlayer.get(playerId) ?? null;
    const markedGoalie = isGoalieFromRoster(roster);
    if (!markedGoalie && skaterAggregate.has(playerId)) {
      continue;
    }

    const gamesPlayed = agg.games.size;
    if (gamesPlayed < MIN_GAMES_FOR_RATING) continue;

    const teamId = agg.teamId ?? roster?.team_id ?? null;
    const divisionId = roster?.division_id ?? null;
    const teamGames = teamId ? teamGamesPlayed.get(teamId) ?? 0 : 0;

    const savePct = agg.shotsAgainst > 0 ? agg.saves / agg.shotsAgainst : 0;
    const gaa = gamesPlayed > 0 ? agg.goalsAgainst / gamesPlayed : 0;

    goalieCandidates.push({
      playerId,
      teamId,
      divisionId,
      gamesPlayed,
      savePct,
      gaa,
      winPct: gamesPlayed > 0 ? agg.wins / gamesPlayed : 0,
      attendanceRate: teamGames > 0 ? gamesPlayed / teamGames : 0,
      wins: agg.wins,
      saves: agg.saves,
      shotsAgainst: agg.shotsAgainst,
      goalsAgainst: agg.goalsAgainst,
      shutouts: agg.shutouts,
    });
  }

  const skaterRanges = {
    ppgMin: Math.min(...skaterCandidates.map((p) => p.pointsPerGame), 0),
    ppgMax: Math.max(...skaterCandidates.map((p) => p.pointsPerGame), 1),
    plusMin: Math.min(...skaterCandidates.map((p) => p.plusMinusPerGame), -1),
    plusMax: Math.max(...skaterCandidates.map((p) => p.plusMinusPerGame), 1),
    pimMin: Math.min(...skaterCandidates.map((p) => p.pimPerGame), 0),
    pimMax: Math.max(...skaterCandidates.map((p) => p.pimPerGame), 3),
  };

  const goalieRanges = {
    saveMin: Math.min(...goalieCandidates.map((p) => p.savePct), 0.5),
    saveMax: Math.max(...goalieCandidates.map((p) => p.savePct), 0.95),
    gaaMin: Math.min(...goalieCandidates.map((p) => p.gaa), 1),
    gaaMax: Math.max(...goalieCandidates.map((p) => p.gaa), 6),
  };

  const aggregates: PlayerAggregate[] = [];

  for (const player of skaterCandidates) {
    const ppgNorm = normalize(player.pointsPerGame, skaterRanges.ppgMin, skaterRanges.ppgMax);
    const plusNorm = normalize(player.plusMinusPerGame, skaterRanges.plusMin, skaterRanges.plusMax);
    const pimNorm = inverseNormalize(player.pimPerGame, skaterRanges.pimMin, skaterRanges.pimMax);
    const attNorm = clamp(player.attendanceRate, 0, 1);

    const offensive = ppgNorm;
    const defensive = 0.6 * plusNorm + 0.4 * pimNorm;
    const composite = (0.5 * ppgNorm) + (0.2 * plusNorm) + (0.15 * pimNorm) + (0.15 * attNorm);

    aggregates.push({
      playerId: player.playerId,
      teamId: player.teamId,
      divisionId: player.divisionId,
      position: 'skater',
      gamesPlayed: player.gamesPlayed,
      pointsPerGame: round2(player.pointsPerGame),
      attendanceRate: round2(player.attendanceRate),
      compositeScore: round2(composite * 100),
      offensiveComponent: round2(offensive * 100),
      defensiveComponent: round2(defensive * 100),
      rawPercentile: 0,
      overallPercentile: 0,
      rating: 'D-',
      stats: {
        goals: player.goals,
        assists: player.assists,
        points: player.points,
        shots: player.shots,
        plusMinusPerGame: round2(player.plusMinusPerGame),
        pimPerGame: round2(player.pimPerGame),
      },
    });
  }

  for (const player of goalieCandidates) {
    const saveNorm = normalize(player.savePct, goalieRanges.saveMin, goalieRanges.saveMax);
    const gaaNorm = inverseNormalize(player.gaa, goalieRanges.gaaMin, goalieRanges.gaaMax);
    const winNorm = clamp(player.winPct, 0, 1);
    const attNorm = clamp(player.attendanceRate, 0, 1);

    const offensive = winNorm;
    const defensive = 0.65 * saveNorm + 0.35 * gaaNorm;
    const composite = (0.4 * saveNorm) + (0.25 * gaaNorm) + (0.2 * winNorm) + (0.15 * attNorm);

    aggregates.push({
      playerId: player.playerId,
      teamId: player.teamId,
      divisionId: player.divisionId,
      position: 'goalie',
      gamesPlayed: player.gamesPlayed,
      pointsPerGame: 0,
      attendanceRate: round2(player.attendanceRate),
      compositeScore: round2(composite * 100),
      offensiveComponent: round2(offensive * 100),
      defensiveComponent: round2(defensive * 100),
      rawPercentile: 0,
      overallPercentile: 0,
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
      },
    });
  }

  const byDivision = new Map<string, PlayerAggregate[]>();
  for (const player of aggregates) {
    const key = player.divisionId ?? 'unassigned';
    const list = byDivision.get(key) ?? [];
    list.push(player);
    byDivision.set(key, list);
  }

  for (const [divisionKey, players] of byDivision.entries()) {
    const sorted = [...players].sort((a, b) => b.compositeScore - a.compositeScore);
    const divisionId = divisionKey === 'unassigned' ? null : divisionKey;
    const tier = divisionId ? divisionTierMap.get(divisionId) ?? 4 : 4;
    const tierPolicy = divisionWeightAndFloor(tier);

    sorted.forEach((player, idx) => {
      const rawPercentile = percentileFromRank(idx, sorted.length);
      const weightedPercentile = clamp(
        Math.max(rawPercentile * tierPolicy.weight, tierPolicy.floor),
        0,
        100
      );

      player.rawPercentile = rawPercentile;
      player.overallPercentile = round2(weightedPercentile);
      player.rating = percentileToGrade(player.overallPercentile);
    });
  }

  const now = new Date().toISOString();
  const records: PlayerRatingRecord[] = aggregates.map((player) => ({
    league_id: leagueId,
    season_id: seasonId,
    player_id: player.playerId,
    division_id: player.divisionId,
    rating: player.rating,
    games_played: player.gamesPlayed,
    attendance_rate: round2(player.attendanceRate),
    points_per_game: round2(player.pointsPerGame),
    raw_percentile: round2(player.rawPercentile),
    overall_percentile: round2(player.overallPercentile),
    position: player.position,
    stats_json: {
      ...player.stats,
      composite_score: player.compositeScore,
      offense_score: player.offensiveComponent,
      defense_score: player.defensiveComponent,
    },
    calculated_at: now,
  }));

  if (records.length > 0) {
    const { error: upsertError } = await supabase
      .from('player_ratings')
      .upsert(records, {
        onConflict: 'league_id,player_id,season_id',
      });

    if (upsertError) {
      throw upsertError;
    }
  }

  const summary: RatingCalculationSummary = {
    leagueId,
    seasonId,
    playersProcessed: new Set([
      ...Array.from(skaterAggregate.keys()),
      ...Array.from(goalieAggregate.keys()),
    ]).size,
    playersRated: records.length,
    skippedForMinGames:
      new Set([
        ...Array.from(skaterAggregate.keys()),
        ...Array.from(goalieAggregate.keys()),
      ]).size - records.length,
  };

  return { summary, records };
}
