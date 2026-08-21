import { getLeagueDateKey } from './league-timezone';

export type MilestoneCategory = 'games_played' | 'goals' | 'points';
export type MilestoneStatus = 'achieved' | 'upcoming';

export interface WeeklyMilestonePlayer {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  careerGamesPlayed: number;
  careerGoals: number;
  careerPoints: number;
}

export interface WeeklyMilestoneGame {
  gameId: string;
  scheduledAt: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'pending_verification' | 'postponed' | 'cancelled';
  homeTeamId: string;
  awayTeamId: string;
}

export interface WeeklyMilestoneRosterPeriod {
  playerId: string;
  teamId: string;
  startDate: string;
  endDate: string | null;
  status: string;
  playerType: string;
}

export interface WeeklyMilestoneSubAssignment {
  playerId: string;
  gameId: string;
}

export interface WeeklyMilestoneAppearance {
  playerId: string;
  gameId: string;
}

export interface WeeklyMilestoneStatLine {
  playerId: string;
  gameId: string;
  goals: number;
  assists: number;
}

export interface WeeklyMilestoneInput {
  weekStartKey: string;
  weekEndKey: string;
  timeZone: string;
  players: WeeklyMilestonePlayer[];
  games: WeeklyMilestoneGame[];
  rosterPeriods: WeeklyMilestoneRosterPeriod[];
  acceptedSubAssignments: WeeklyMilestoneSubAssignment[];
  completedAppearances: WeeklyMilestoneAppearance[];
  completedStatLines: WeeklyMilestoneStatLine[];
}

export interface WeeklyMilestone {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  category: MilestoneCategory;
  status: MilestoneStatus;
  milestone: number;
  currentValue: number;
  gameId: string | null;
  scheduledAt: string | null;
}

const MILESTONE_INTERVAL = 50;

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function isDateKeyInWeek(dateKey: string | null, input: WeeklyMilestoneInput): boolean {
  return Boolean(dateKey && dateKey >= input.weekStartKey && dateKey <= input.weekEndKey);
}

function isRosteredForGame(
  playerId: string,
  game: WeeklyMilestoneGame,
  dateKey: string,
  input: WeeklyMilestoneInput,
): boolean {
  if (input.acceptedSubAssignments.some((assignment) => (
    assignment.playerId === playerId && assignment.gameId === game.gameId
  ))) {
    return true;
  }

  return input.rosterPeriods.some((roster) => {
    if (
      roster.playerId !== playerId ||
      roster.status !== 'active' ||
      roster.playerType !== 'regular' ||
      (roster.teamId !== game.homeTeamId && roster.teamId !== game.awayTeamId)
    ) {
      return false;
    }

    return roster.startDate <= dateKey && (!roster.endDate || roster.endDate >= dateKey);
  });
}

function findCrossingGame(
  startingValue: number,
  milestone: number,
  games: WeeklyMilestoneGame[],
  incrementForGame: (gameId: string) => number,
): WeeklyMilestoneGame | null {
  let runningValue = startingValue;
  for (const game of games) {
    runningValue += incrementForGame(game.gameId);
    if (runningValue >= milestone) {
      return game;
    }
  }
  return null;
}

function makeMilestone(
  player: WeeklyMilestonePlayer,
  category: MilestoneCategory,
  status: MilestoneStatus,
  milestone: number,
  currentValue: number,
  game: WeeklyMilestoneGame | null,
): WeeklyMilestone {
  return {
    playerId: player.playerId,
    playerName: player.playerName,
    avatarUrl: player.avatarUrl,
    category,
    status,
    milestone,
    currentValue,
    gameId: game?.gameId ?? null,
    scheduledAt: game?.scheduledAt ?? null,
  };
}

export function calculateWeeklyMilestones(input: WeeklyMilestoneInput): WeeklyMilestone[] {
  const games = input.games
    .filter((game) => isDateKeyInWeek(getLeagueDateKey(game.scheduledAt, input.timeZone), input))
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  const gamesById = new Map(games.map((game) => [game.gameId, game]));
  const completedGames = games.filter((game) => game.status === 'completed');
  const upcomingGames = games.filter((game) => game.status === 'scheduled' || game.status === 'in_progress');
  const completedAppearanceKeys = new Set(
    input.completedAppearances
      .filter((appearance) => gamesById.get(appearance.gameId)?.status === 'completed')
      .map((appearance) => `${appearance.playerId}:${appearance.gameId}`),
  );
  const milestones: WeeklyMilestone[] = [];

  for (const player of input.players) {
    const playerStatLines = input.completedStatLines.filter((line) => (
      line.playerId === player.playerId && gamesById.get(line.gameId)?.status === 'completed'
    ));
    const statLineByGame = new Map(playerStatLines.map((line) => [line.gameId, line]));
    const weeklyGoals = playerStatLines.reduce((total, line) => total + safeCount(line.goals), 0);
    const weeklyPoints = playerStatLines.reduce(
      (total, line) => total + safeCount(line.goals) + safeCount(line.assists),
      0,
    );

    const scoringCategories: Array<{
      category: 'goals' | 'points';
      current: number;
      thisWeek: number;
      increment: (gameId: string) => number;
    }> = [
      {
        category: 'goals',
        current: safeCount(player.careerGoals),
        thisWeek: weeklyGoals,
        increment: (gameId) => safeCount(statLineByGame.get(gameId)?.goals ?? 0),
      },
      {
        category: 'points',
        current: safeCount(player.careerPoints),
        thisWeek: weeklyPoints,
        increment: (gameId) => {
          const line = statLineByGame.get(gameId);
          return safeCount(line?.goals ?? 0) + safeCount(line?.assists ?? 0);
        },
      },
    ];

    for (const scoring of scoringCategories) {
      const beforeWeek = Math.max(0, scoring.current - scoring.thisWeek);
      const milestone = beforeWeek + 1;
      if (milestone % MILESTONE_INTERVAL !== 0) {
        continue;
      }

      if (scoring.current >= milestone) {
        const game = findCrossingGame(beforeWeek, milestone, completedGames, scoring.increment);
        if (game) {
          milestones.push(makeMilestone(
            player,
            scoring.category,
            'achieved',
            milestone,
            scoring.current,
            game,
          ));
        }
      } else {
        const nextGame = upcomingGames.find((game) => {
          const dateKey = getLeagueDateKey(game.scheduledAt, input.timeZone);
          return Boolean(dateKey && isRosteredForGame(player.playerId, game, dateKey, input));
        }) ?? null;
        milestones.push(makeMilestone(
          player,
          scoring.category,
          'upcoming',
          milestone,
          scoring.current,
          nextGame,
        ));
      }
    }

    const completedPlayerGames = completedGames.filter((game) => (
      completedAppearanceKeys.has(`${player.playerId}:${game.gameId}`)
    ));
    const beforeWeekGames = Math.max(
      0,
      safeCount(player.careerGamesPlayed) - completedPlayerGames.length,
    );
    const gamesMilestone = Math.floor(beforeWeekGames / MILESTONE_INTERVAL + 1) * MILESTONE_INTERVAL;

    if (beforeWeekGames + completedPlayerGames.length >= gamesMilestone) {
      const game = completedPlayerGames[gamesMilestone - beforeWeekGames - 1] ?? null;
      if (game) {
        milestones.push(makeMilestone(
          player,
          'games_played',
          'achieved',
          gamesMilestone,
          safeCount(player.careerGamesPlayed),
          game,
        ));
      }
      continue;
    }

    const scheduledPlayerGames = upcomingGames.filter((game) => {
      const dateKey = getLeagueDateKey(game.scheduledAt, input.timeZone);
      return Boolean(dateKey && isRosteredForGame(player.playerId, game, dateKey, input));
    });
    const gamesNeededAfterCompleted = gamesMilestone - beforeWeekGames - completedPlayerGames.length;
    const crossingGame = scheduledPlayerGames[gamesNeededAfterCompleted - 1] ?? null;
    if (crossingGame) {
      milestones.push(makeMilestone(
        player,
        'games_played',
        'upcoming',
        gamesMilestone,
        safeCount(player.careerGamesPlayed),
        crossingGame,
      ));
    }
  }

  return milestones;
}
