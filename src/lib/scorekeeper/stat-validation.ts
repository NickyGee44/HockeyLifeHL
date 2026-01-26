/**
 * Stat Validation Utilities for Scorekeeper System
 *
 * Validates stat entries to ensure data integrity
 */

interface StatValidationResult {
  valid: boolean;
  error?: string;
}

interface GameStats {
  homeGoals: number;
  awayGoals: number;
  homeShots: number;
  awayShots: number;
  homePIM: number;
  awayPIM: number;
}

/**
 * Validate PIM (Penalty Minutes) value
 */
export function validatePIMValue(minutes: number): StatValidationResult {
  const validPIMValues = [2, 4, 5, 10, 20]; // 2min, 4min, 5min, 10min, 20min (misconduct)

  if (!validPIMValues.includes(minutes)) {
    return {
      valid: false,
      error: `Invalid penalty minutes. Must be one of: ${validPIMValues.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate that goals don't exceed shots for a team
 */
export function validateGoalsVsShots(
  teamType: 'home' | 'away',
  statType: string,
  currentStats: GameStats
): StatValidationResult {
  if (statType !== 'Goal' && statType !== 'Shot') {
    return { valid: true }; // Not applicable
  }

  const goals = teamType === 'home' ? currentStats.homeGoals : currentStats.awayGoals;
  const shots = teamType === 'home' ? currentStats.homeShots : currentStats.awayShots;

  // If adding a goal, check if it would exceed shots
  if (statType === 'Goal') {
    const newGoals = goals + 1;
    if (newGoals > shots) {
      return {
        valid: false,
        error: `Cannot have more goals (${newGoals}) than shots (${shots}). Record shot first.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate stat type is supported
 */
export function validateStatType(statType: string): StatValidationResult {
  const validStatTypes = [
    'Goal',
    'Assist',
    'Shot',
    'Save',
    'PIM',
    'Hit',
    'Takeaway',
    'Giveaway',
    'Blocked Shot',
    'Faceoff Win',
    'Faceoff Loss',
    'Goal Against',
  ];

  if (!validStatTypes.includes(statType)) {
    return {
      valid: false,
      error: `Invalid stat type: ${statType}`,
    };
  }

  return { valid: true };
}

/**
 * Validate goalie-specific stats
 */
export function validateGoalieStat(
  statType: string,
  playerPosition: string
): StatValidationResult {
  const goalieOnlyStats = ['Save', 'Goal Against'];

  if (goalieOnlyStats.includes(statType) && playerPosition !== 'G') {
    return {
      valid: false,
      error: `${statType} can only be recorded for goalies`,
    };
  }

  if (statType === 'Goal' && playerPosition === 'G') {
    // Goalies can score, but it's rare - just log a warning
    console.warn('Goalie scoring a goal - rare but valid!');
  }

  return { valid: true };
}

/**
 * Validate period number
 */
export function validatePeriod(period: number): StatValidationResult {
  if (period < 1 || period > 4) {
    return {
      valid: false,
      error: 'Period must be between 1 and 4 (1st, 2nd, 3rd, OT)',
    };
  }

  return { valid: true };
}

/**
 * Comprehensive stat validation
 */
export function validateStatEntry(params: {
  statType: string;
  period: number;
  playerPosition: string;
  teamType: 'home' | 'away';
  currentStats: GameStats;
  pimValue?: number;
}): StatValidationResult {
  const {
    statType,
    period,
    playerPosition,
    teamType,
    currentStats,
    pimValue,
  } = params;

  // Validate period
  const periodValidation = validatePeriod(period);
  if (!periodValidation.valid) return periodValidation;

  // Validate stat type
  const statTypeValidation = validateStatType(statType);
  if (!statTypeValidation.valid) return statTypeValidation;

  // Validate goalie stats
  const goalieValidation = validateGoalieStat(statType, playerPosition);
  if (!goalieValidation.valid) return goalieValidation;

  // Validate goals vs shots
  const goalsVsShotsValidation = validateGoalsVsShots(
    teamType,
    statType,
    currentStats
  );
  if (!goalsVsShotsValidation.valid) return goalsVsShotsValidation;

  // Validate PIM value
  if (statType === 'PIM' && pimValue) {
    const pimValidation = validatePIMValue(pimValue);
    if (!pimValidation.valid) return pimValidation;
  }

  return { valid: true };
}

/**
 * Rate limiting check (prevent rapid duplicate entries)
 */
export function checkRateLimit(
  lastEntryTime: number | null,
  minimumDelayMs: number = 1000
): StatValidationResult {
  if (lastEntryTime === null) {
    return { valid: true };
  }

  const timeSinceLastEntry = Date.now() - lastEntryTime;

  if (timeSinceLastEntry < minimumDelayMs) {
    return {
      valid: false,
      error: `Please wait ${Math.ceil((minimumDelayMs - timeSinceLastEntry) / 1000)}s before entering another stat`,
    };
  }

  return { valid: true };
}
