/**
 * Schedule Generation Algorithm
 *
 * Implements round-robin schedule generation with support for:
 * - 4-16 teams
 * - Home/away balancing
 * - Back-to-back game prevention
 * - Division-aware scheduling
 * - Venue and team constraints
 */

import {
  Team,
  Venue,
  GameMatchup,
  ScheduledGame,
  ScheduleConfig,
  ScheduleConstraint,
  ScheduleGenerationOptions,
  ScheduleGenerationResult,
  ConstraintViolation,
  BlackoutPeriod,
} from './types';

// ============================================================================
// ROUND ROBIN GENERATION
// ============================================================================

/**
 * Generate round-robin matchups using the circle method.
 * Works for any number of teams (4-16 recommended).
 */
export function generateRoundRobinMatchups(
  teams: Team[],
  doubleRoundRobin: boolean = false
): GameMatchup[] {
  const matchups: GameMatchup[] = [];
  const teamCount = teams.length;

  // Handle odd number of teams by adding a "bye" team
  const effectiveTeams = teamCount % 2 === 1 ? [...teams, null] : [...teams];
  const effectiveCount = effectiveTeams.length;
  const rounds = effectiveCount - 1;
  const gamesPerRound = effectiveCount / 2;

  // Generate first round-robin
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < gamesPerRound; i++) {
      let home: Team | null;
      let away: Team | null;

      if (i === 0) {
        // First team is fixed
        home = effectiveTeams[0];
        const awayIndex = (effectiveCount - 1 - round) % (effectiveCount - 1);
        away = effectiveTeams[awayIndex === 0 ? effectiveCount - 1 : awayIndex];
      } else {
        // Rotate other teams
        const homeIndex = ((round + i) % (effectiveCount - 1)) + 1;
        const awayIndex = ((round + effectiveCount - 1 - i) % (effectiveCount - 1)) + 1;
        home = effectiveTeams[homeIndex];
        away = effectiveTeams[awayIndex];
      }

      // Skip bye games
      if (home !== null && away !== null) {
        // Alternate home/away for fairness
        if (round % 2 === 1) {
          [home, away] = [away, home];
        }

        matchups.push({
          roundNumber: round + 1,
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeTeam: home,
          awayTeam: away,
        });
      }
    }
  }

  // Double round-robin: add reverse matchups
  if (doubleRoundRobin) {
    const reverseMatchups = matchups.map((m) => ({
      roundNumber: m.roundNumber + rounds,
      homeTeamId: m.awayTeamId,
      awayTeamId: m.homeTeamId,
      homeTeam: m.awayTeam,
      awayTeam: m.homeTeam,
    }));
    matchups.push(...reverseMatchups);
  }

  return matchups;
}

// ============================================================================
// TIME SLOT ASSIGNMENT
// ============================================================================

/**
 * Get available time slots between start and end dates.
 */
function getAvailableTimeSlots(
  config: ScheduleConfig,
  constraints: ScheduleConstraint[],
  venues: Venue[]
): Date[] {
  const slots: Date[] = [];
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);

  // Get blackout periods
  const blackouts = getBlackoutPeriods(constraints);

  // Iterate through each day in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // Check if this is a game day
    if (config.gameDays.includes(dayOfWeek)) {
      // Add each game time
      for (const timeStr of config.gameTimes) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const slotDate = new Date(currentDate);
        slotDate.setHours(hours, minutes, 0, 0);

        // Check if slot is blacked out
        if (!isSlotBlackedOut(slotDate, blackouts)) {
          slots.push(slotDate);
        }
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}

/**
 * Extract blackout periods from constraints.
 */
function getBlackoutPeriods(constraints: ScheduleConstraint[]): BlackoutPeriod[] {
  return constraints
    .filter((c) => c.constraintType === 'venue_blackout' || c.constraintType === 'team_blackout')
    .map((c) => ({
      startDate: c.startDate ?? new Date(),
      endDate: c.endDate ?? new Date(),
      teamId: c.teamId ?? undefined,
      venueId: c.venueId ?? undefined,
    }));
}

/**
 * Check if a time slot is blacked out.
 */
function isSlotBlackedOut(slot: Date, blackouts: BlackoutPeriod[]): boolean {
  for (const blackout of blackouts) {
    if (slot >= blackout.startDate && slot <= blackout.endDate) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a slot is blacked out for a specific team.
 */
function isSlotBlackedOutForTeam(
  slot: Date,
  teamId: string,
  constraints: ScheduleConstraint[]
): boolean {
  const teamBlackouts = constraints.filter(
    (c) => c.constraintType === 'team_blackout' && c.teamId === teamId
  );

  for (const constraint of teamBlackouts) {
    if (constraint.startDate && constraint.endDate) {
      if (slot >= constraint.startDate && slot <= constraint.endDate) {
        return true;
      }
    }

    // Check day of week constraint
    if (constraint.dayOfWeek !== null && slot.getDay() === constraint.dayOfWeek) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// CONSTRAINT VALIDATION
// ============================================================================

/**
 * Check if a game violates any constraints.
 */
function validateGameAgainstConstraints(
  game: ScheduledGame,
  constraints: ScheduleConstraint[],
  existingGames: ScheduledGame[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const constraint of constraints) {
    switch (constraint.constraintType) {
      case 'team_blackout':
        if (constraint.teamId === game.homeTeamId || constraint.teamId === game.awayTeamId) {
          if (isSlotBlackedOutForTeam(game.scheduledAt, constraint.teamId!, [constraint])) {
            violations.push({
              constraintId: constraint.id,
              constraintType: constraint.constraintType,
              gameIndex: game.gameNumber,
              message: `Team is not available at this time`,
              severity: constraint.isHardConstraint ? 'error' : 'warning',
            });
          }
        }
        break;

      case 'venue_blackout':
        if (constraint.venueId === game.venueId) {
          if (constraint.startDate && constraint.endDate) {
            if (game.scheduledAt >= constraint.startDate && game.scheduledAt <= constraint.endDate) {
              violations.push({
                constraintId: constraint.id,
                constraintType: constraint.constraintType,
                gameIndex: game.gameNumber,
                message: `Venue is not available at this time`,
                severity: constraint.isHardConstraint ? 'error' : 'warning',
              });
            }
          }
        }
        break;

      case 'matchup_constraint':
        // Handle specific matchup restrictions
        if (
          constraint.teamId === game.homeTeamId &&
          constraint.opponentTeamId === game.awayTeamId
        ) {
          violations.push({
            constraintId: constraint.id,
            constraintType: constraint.constraintType,
            gameIndex: game.gameNumber,
            message: constraint.notes ?? 'Matchup constraint violated',
            severity: constraint.isHardConstraint ? 'error' : 'warning',
          });
        }
        break;
    }
  }

  return violations;
}

/**
 * Check if a team has a back-to-back game.
 */
function hasBackToBackGame(
  teamId: string,
  slot: Date,
  existingGames: ScheduledGame[],
  gameDurationMinutes: number
): boolean {
  const slotTime = slot.getTime();
  const gameDuration = gameDurationMinutes * 60 * 1000;

  for (const game of existingGames) {
    if (game.homeTeamId === teamId || game.awayTeamId === teamId) {
      const gameTime = game.scheduledAt.getTime();
      const timeDiff = Math.abs(slotTime - gameTime);

      // Check if games are within one game duration of each other
      if (timeDiff < gameDuration * 2) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// SCHEDULE ASSIGNMENT
// ============================================================================

/**
 * Assign matchups to time slots.
 */
function assignMatchupsToSlots(
  matchups: GameMatchup[],
  slots: Date[],
  options: ScheduleGenerationOptions
): { games: ScheduledGame[]; violations: ConstraintViolation[] } {
  const games: ScheduledGame[] = [];
  const violations: ConstraintViolation[] = [];
  const usedSlots = new Set<number>();

  const { config, constraints, venues } = options;
  const defaultVenue = venues.find((v) => v.id === config.defaultVenueId) ?? venues[0];

  let gameNumber = 1;

  for (const matchup of matchups) {
    let assigned = false;

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      if (usedSlots.has(slotIndex)) continue;

      const slot = slots[slotIndex];

      // Check back-to-back constraint
      if (!config.allowBackToBack) {
        if (
          hasBackToBackGame(matchup.homeTeamId, slot, games, config.gameDurationMinutes) ||
          hasBackToBackGame(matchup.awayTeamId, slot, games, config.gameDurationMinutes)
        ) {
          continue;
        }
      }

      // Check team blackouts
      if (
        isSlotBlackedOutForTeam(slot, matchup.homeTeamId, constraints) ||
        isSlotBlackedOutForTeam(slot, matchup.awayTeamId, constraints)
      ) {
        continue;
      }

      // Determine venue
      let venueId = defaultVenue?.id ?? null;
      let location = defaultVenue?.name ?? 'TBD';

      // Check venue preference
      if (config.rotateHomeVenue && matchup.homeTeam?.homeVenueId) {
        const homeVenue = venues.find((v) => v.id === matchup.homeTeam?.homeVenueId);
        if (homeVenue) {
          venueId = homeVenue.id;
          location = homeVenue.name;
        }
      }

      // Create the game
      const game: ScheduledGame = {
        ...matchup,
        scheduledAt: slot,
        location,
        venueId,
        gameNumber,
      };

      // Validate against constraints
      const gameViolations = validateGameAgainstConstraints(game, constraints, games);
      const hardViolations = gameViolations.filter((v) => v.severity === 'error');

      // If no hard constraint violations, assign the game
      if (hardViolations.length === 0) {
        games.push(game);
        usedSlots.add(slotIndex);
        violations.push(...gameViolations);
        gameNumber++;
        assigned = true;
        break;
      }
    }

    // If game couldn't be assigned, record the failure
    if (!assigned) {
      violations.push({
        constraintId: 'system',
        constraintType: 'team_blackout',
        gameIndex: gameNumber,
        message: `Could not find valid slot for ${matchup.homeTeam?.name} vs ${matchup.awayTeam?.name}`,
        severity: 'error',
      });
    }
  }

  return { games, violations };
}

// ============================================================================
// HOME/AWAY BALANCING
// ============================================================================

/**
 * Calculate home/away balance for all teams.
 */
function calculateHomeAwayBalance(
  games: ScheduledGame[],
  teams: Team[]
): { homeGames: Record<string, number>; awayGames: Record<string, number>; maxImbalance: number } {
  const homeGames: Record<string, number> = {};
  const awayGames: Record<string, number> = {};

  // Initialize counts
  for (const team of teams) {
    homeGames[team.id] = 0;
    awayGames[team.id] = 0;
  }

  // Count games
  for (const game of games) {
    homeGames[game.homeTeamId] = (homeGames[game.homeTeamId] ?? 0) + 1;
    awayGames[game.awayTeamId] = (awayGames[game.awayTeamId] ?? 0) + 1;
  }

  // Calculate max imbalance
  let maxImbalance = 0;
  for (const team of teams) {
    const imbalance = Math.abs(homeGames[team.id] - awayGames[team.id]);
    maxImbalance = Math.max(maxImbalance, imbalance);
  }

  return { homeGames, awayGames, maxImbalance };
}

/**
 * Optimize schedule for home/away balance.
 */
function optimizeHomeAwayBalance(games: ScheduledGame[], teams: Team[]): ScheduledGame[] {
  const optimized = [...games];

  // Simple optimization: swap home/away for games where it improves balance
  for (let i = 0; i < optimized.length; i++) {
    const { homeGames, awayGames, maxImbalance } = calculateHomeAwayBalance(optimized, teams);

    if (maxImbalance <= 1) break; // Already balanced

    const game = optimized[i];
    const homeTeamHome = homeGames[game.homeTeamId];
    const homeTeamAway = awayGames[game.homeTeamId];
    const awayTeamHome = homeGames[game.awayTeamId];
    const awayTeamAway = awayGames[game.awayTeamId];

    // Check if swapping would improve balance
    const currentImbalance =
      Math.abs(homeTeamHome - homeTeamAway) + Math.abs(awayTeamHome - awayTeamAway);
    const swappedImbalance =
      Math.abs(homeTeamHome - 1 - (homeTeamAway + 1)) +
      Math.abs(awayTeamHome + 1 - (awayTeamAway - 1));

    if (swappedImbalance < currentImbalance) {
      // Swap home and away
      optimized[i] = {
        ...game,
        homeTeamId: game.awayTeamId,
        awayTeamId: game.homeTeamId,
        homeTeam: game.awayTeam,
        awayTeam: game.homeTeam,
      };
    }
  }

  return optimized;
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate a complete schedule for a season.
 */
export async function generateSchedule(
  options: ScheduleGenerationOptions
): Promise<ScheduleGenerationResult> {
  const startTime = Date.now();

  try {
    const { teams, config, constraints, venues } = options;

    // Validate team count
    if (teams.length < 4) {
      return {
        success: false,
        games: [],
        totalGames: 0,
        gamesPerTeam: {},
        homeGamesPerTeam: {},
        awayGamesPerTeam: {},
        constraintViolations: [],
        hardConstraintFailures: [],
        durationMs: Date.now() - startTime,
        error: 'At least 4 teams are required to generate a schedule',
      };
    }

    if (teams.length > 16) {
      return {
        success: false,
        games: [],
        totalGames: 0,
        gamesPerTeam: {},
        homeGamesPerTeam: {},
        awayGamesPerTeam: {},
        constraintViolations: [],
        hardConstraintFailures: [],
        durationMs: Date.now() - startTime,
        error: 'Maximum 16 teams supported for schedule generation',
      };
    }

    // Generate matchups
    const isDoubleRoundRobin = config.scheduleType === 'double_round_robin';
    const matchups = generateRoundRobinMatchups(teams, isDoubleRoundRobin);

    // Get available time slots
    const slots = getAvailableTimeSlots(config, constraints, venues);

    if (slots.length < matchups.length) {
      return {
        success: false,
        games: [],
        totalGames: 0,
        gamesPerTeam: {},
        homeGamesPerTeam: {},
        awayGamesPerTeam: {},
        constraintViolations: [],
        hardConstraintFailures: [],
        durationMs: Date.now() - startTime,
        error: `Not enough time slots available. Need ${matchups.length} slots but only ${slots.length} available.`,
      };
    }

    // Assign matchups to slots
    const result = assignMatchupsToSlots(matchups, slots, options);
    let games = result.games;
    const violations = result.violations;

    // Optimize home/away balance
    if (config.homeAwayBalance) {
      games = optimizeHomeAwayBalance(games, teams);
    }

    // Calculate statistics
    const { homeGames, awayGames } = calculateHomeAwayBalance(games, teams);
    const gamesPerTeam: Record<string, number> = {};
    for (const team of teams) {
      gamesPerTeam[team.id] = (homeGames[team.id] ?? 0) + (awayGames[team.id] ?? 0);
    }

    // Separate hard and soft constraint violations
    const hardConstraintFailures = violations.filter((v) => v.severity === 'error');
    const softViolations = violations.filter((v) => v.severity === 'warning');

    // Sort games by date
    games.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    // Re-number games after sorting
    games.forEach((game, index) => {
      game.gameNumber = index + 1;
    });

    return {
      success: hardConstraintFailures.length === 0,
      games,
      totalGames: games.length,
      gamesPerTeam,
      homeGamesPerTeam: homeGames,
      awayGamesPerTeam: awayGames,
      constraintViolations: softViolations,
      hardConstraintFailures,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      games: [],
      totalGames: 0,
      gamesPerTeam: {},
      homeGamesPerTeam: {},
      awayGamesPerTeam: {},
      constraintViolations: [],
      hardConstraintFailures: [],
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorDetails: error instanceof Error ? { stack: error.stack } : undefined,
    };
  }
}

// ============================================================================
// RESCHEDULE FUNCTION
// ============================================================================

/**
 * Reschedule a single game while respecting constraints.
 */
export function rescheduleGame(
  game: ScheduledGame,
  newSlot: Date,
  existingGames: ScheduledGame[],
  constraints: ScheduleConstraint[],
  config: ScheduleConfig
): { success: boolean; violations: ConstraintViolation[]; conflictingGames: ScheduledGame[] } {
  const violations: ConstraintViolation[] = [];
  const conflictingGames: ScheduledGame[] = [];

  // Check for slot conflicts with other games
  for (const existing of existingGames) {
    if (existing.id === game.id) continue;

    const timeDiff = Math.abs(newSlot.getTime() - existing.scheduledAt.getTime());
    const minGap = config.gameDurationMinutes * 60 * 1000;

    if (timeDiff < minGap) {
      conflictingGames.push(existing);
    }
  }

  // Check back-to-back for home team
  if (!config.allowBackToBack) {
    if (hasBackToBackGame(game.homeTeamId, newSlot, existingGames, config.gameDurationMinutes)) {
      violations.push({
        constraintId: 'system',
        constraintType: 'team_blackout',
        gameIndex: game.gameNumber,
        message: 'Home team would have back-to-back games',
        severity: 'error',
      });
    }

    if (hasBackToBackGame(game.awayTeamId, newSlot, existingGames, config.gameDurationMinutes)) {
      violations.push({
        constraintId: 'system',
        constraintType: 'team_blackout',
        gameIndex: game.gameNumber,
        message: 'Away team would have back-to-back games',
        severity: 'error',
      });
    }
  }

  // Check team blackouts
  if (isSlotBlackedOutForTeam(newSlot, game.homeTeamId, constraints)) {
    violations.push({
      constraintId: 'system',
      constraintType: 'team_blackout',
      gameIndex: game.gameNumber,
      message: 'Home team is not available at this time',
      severity: 'error',
    });
  }

  if (isSlotBlackedOutForTeam(newSlot, game.awayTeamId, constraints)) {
    violations.push({
      constraintId: 'system',
      constraintType: 'team_blackout',
      gameIndex: game.gameNumber,
      message: 'Away team is not available at this time',
      severity: 'error',
    });
  }

  const hasErrors = violations.some((v) => v.severity === 'error');

  return {
    success: !hasErrors && conflictingGames.length === 0,
    violations,
    conflictingGames,
  };
}
