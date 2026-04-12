import type { ScheduleGame, TeamStanding } from '@/lib/types';

export interface PlayoffOddsConfig {
  playoffTeamsTotal?: number | null;
  playoffTeamsPerDivision?: number | null;
  useDivisionPlayoffs?: boolean | null;
}

export interface TeamPlayoffOdds {
  teamId: string;
  oddsOfFinishingFirst: number;
  oddsOfMakingPlayoffs: number;
}

interface SimTeamState {
  team_id: string;
  team_name: string;
  team_logo: string | null;
  division_id: string | null;
  division_name: string | null;
  wins: number;
  losses: number;
  ties: number;
  overtime_losses: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_differential: number;
  games_played: number;
  strength: number;
}

interface RemainingGame {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
}

const SIMULATION_COUNT = 5000;

export function calculatePlayoffOdds(
  standings: TeamStanding[],
  seasonGames: ScheduleGame[],
  config: PlayoffOddsConfig,
): TeamPlayoffOdds[] {
  if (standings.length === 0) {
    return [];
  }

  const baseTeams = standings.map((team) => ({
    ...team,
    strength: 0,
  }));

  const teamGamesPlayed = baseTeams.reduce((sum, team) => sum + getTeamGamesPlayed(team), 0);
  const totalPoints = baseTeams.reduce((sum, team) => sum + team.points, 0);
  const totalGoalDiff = baseTeams.reduce((sum, team) => sum + team.goal_differential, 0);
  const avgPointsPerGame = teamGamesPlayed > 0 ? totalPoints / teamGamesPlayed : 1;
  const avgGoalDiffPerGame = teamGamesPlayed > 0 ? totalGoalDiff / teamGamesPlayed : 0;
  const tieRate = clamp(
    teamGamesPlayed > 0 ? baseTeams.reduce((sum, team) => sum + team.ties, 0) / teamGamesPlayed : 0.08,
    0,
    0.35,
  );

  const teams = baseTeams.map((team) => ({
    ...team,
    strength: computeTeamStrength(team, avgPointsPerGame, avgGoalDiffPerGame),
  }));

  const teamMap = new Map(teams.map((team) => [team.team_id, team]));
  const remainingGames = seasonGames
    .filter((game) => isRegularSeasonGame(game) && isUnplayedGame(game))
    .map((game) => {
      const homeTeamId = game.home_team?.id ?? null;
      const awayTeamId = game.away_team?.id ?? null;
      if (!homeTeamId || !awayTeamId || !teamMap.has(homeTeamId) || !teamMap.has(awayTeamId)) {
        return null;
      }

      return {
        id: game.id,
        homeTeamId,
        awayTeamId,
      } satisfies RemainingGame;
    })
    .filter((game): game is RemainingGame => Boolean(game));

  if (remainingGames.length === 0) {
    const ranked = rankTeams(teams);
    const playoffTeams = getPlayoffQualifiedTeamIds(ranked, config);

    return ranked.map((team, index) => ({
      teamId: team.team_id,
      oddsOfFinishingFirst: index === 0 ? 1 : 0,
      oddsOfMakingPlayoffs: playoffTeams.has(team.team_id) ? 1 : 0,
    }));
  }

  const firstPlaceCounts = new Map<string, number>();
  const playoffCounts = new Map<string, number>();

  for (let simIndex = 0; simIndex < SIMULATION_COUNT; simIndex += 1) {
    const rng = createSeededRng(buildSimulationSeed(teams, remainingGames, simIndex));
    const simTeams = teams.map((team) => ({ ...team }));
    const simTeamMap = new Map(simTeams.map((team) => [team.team_id, team]));

    for (const game of remainingGames) {
      const homeTeam = simTeamMap.get(game.homeTeamId);
      const awayTeam = simTeamMap.get(game.awayTeamId);
      if (!homeTeam || !awayTeam) continue;

      simulateGame(homeTeam, awayTeam, tieRate, rng);
    }

    const ranked = rankTeams(simTeams);
    const playoffTeams = getPlayoffQualifiedTeamIds(ranked, config);

    const firstTeam = ranked[0];
    if (firstTeam) {
      firstPlaceCounts.set(firstTeam.team_id, (firstPlaceCounts.get(firstTeam.team_id) ?? 0) + 1);
    }

    for (const teamId of playoffTeams) {
      playoffCounts.set(teamId, (playoffCounts.get(teamId) ?? 0) + 1);
    }
  }

  return rankTeams(teams).map((team) => ({
    teamId: team.team_id,
    oddsOfFinishingFirst: (firstPlaceCounts.get(team.team_id) ?? 0) / SIMULATION_COUNT,
    oddsOfMakingPlayoffs: (playoffCounts.get(team.team_id) ?? 0) / SIMULATION_COUNT,
  }));
}

function computeTeamStrength(team: TeamStanding, avgPointsPerGame: number, avgGoalDiffPerGame: number): number {
  const gamesPlayed = Math.max(getTeamGamesPlayed(team), 1);
  const pointsPerGame = team.points / gamesPlayed;
  const goalDiffPerGame = team.goal_differential / gamesPlayed;
  const winRate = (team.wins + team.ties * 0.5) / gamesPlayed;

  const normalizedPoints = avgPointsPerGame > 0 ? (pointsPerGame - avgPointsPerGame) / avgPointsPerGame : 0;
  const goalDiffScale = Math.max(Math.abs(avgGoalDiffPerGame), 1.5);
  const normalizedGoalDiff = goalDiffPerGame / goalDiffScale;
  const normalizedWinRate = winRate - 0.5;

  return normalizedPoints * 1.15 + normalizedGoalDiff * 0.35 + normalizedWinRate * 0.5;
}

function simulateGame(homeTeam: SimTeamState, awayTeam: SimTeamState, tieRate: number, rng: () => number) {
  const strengthGap = clamp(homeTeam.strength - awayTeam.strength, -3, 3);
  const decisiveProbability = 1 - tieRate;
  const homeWinProbability = decisiveProbability / (1 + Math.exp(-strengthGap * 1.1));
  const awayWinProbability = decisiveProbability - homeWinProbability;
  const roll = rng();

  incrementGamesPlayed(homeTeam);
  incrementGamesPlayed(awayTeam);

  if (roll < tieRate) {
    homeTeam.ties += 1;
    awayTeam.ties += 1;
    homeTeam.points += 1;
    awayTeam.points += 1;
    return;
  }

  if (roll < tieRate + homeWinProbability) {
    homeTeam.wins += 1;
    awayTeam.losses += 1;
    homeTeam.points += 2;
    return;
  }

  if (awayWinProbability >= 0) {
    awayTeam.wins += 1;
    homeTeam.losses += 1;
    awayTeam.points += 2;
  }
}

function getPlayoffQualifiedTeamIds(teams: SimTeamState[], config: PlayoffOddsConfig): Set<string> {
  if (config.useDivisionPlayoffs && (config.playoffTeamsPerDivision ?? 0) > 0) {
    const divisions = new Map<string, SimTeamState[]>();

    for (const team of teams) {
      const divisionKey = team.division_id ?? '__no_division__';
      const existing = divisions.get(divisionKey) ?? [];
      existing.push(team);
      divisions.set(divisionKey, existing);
    }

    const qualifiers = new Set<string>();
    for (const divisionTeams of divisions.values()) {
      const rankedDivision = rankTeams(divisionTeams);
      const limit = Math.min(config.playoffTeamsPerDivision ?? rankedDivision.length, rankedDivision.length);
      rankedDivision.slice(0, limit).forEach((team) => qualifiers.add(team.team_id));
    }
    return qualifiers;
  }

  const ranked = rankTeams(teams);
  const limit = Math.min(config.playoffTeamsTotal ?? ranked.length, ranked.length);
  return new Set(ranked.slice(0, limit).map((team) => team.team_id));
}

function rankTeams(teams: SimTeamState[]): SimTeamState[] {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.goal_differential !== a.goal_differential) return b.goal_differential - a.goal_differential;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team_id.localeCompare(b.team_id);
  });
}

function incrementGamesPlayed(team: SimTeamState) {
  team.games_played += 1;
}

function getTeamGamesPlayed(team: Pick<TeamStanding, 'games_played' | 'wins' | 'losses' | 'ties' | 'overtime_losses'>) {
  return team.games_played || team.wins + team.losses + team.ties + team.overtime_losses;
}

function isRegularSeasonGame(game: ScheduleGame) {
  return !game.game_type || game.game_type === 'regular_season';
}

function isUnplayedGame(game: ScheduleGame) {
  return game.status === 'scheduled' || game.status === 'postponed';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildSimulationSeed(teams: SimTeamState[], remainingGames: RemainingGame[], simIndex: number) {
  const seedString = [
    simIndex.toString(),
    ...teams.map((team) => `${team.team_id}:${team.points}:${team.wins}:${team.goal_differential}`),
    ...remainingGames.map((game) => `${game.id}:${game.homeTeamId}:${game.awayTeamId}`),
  ].join('|');

  let hash = 2166136261;
  for (let i = 0; i < seedString.length; i += 1) {
    hash ^= seedString.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: number) {
  let state = seed || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
