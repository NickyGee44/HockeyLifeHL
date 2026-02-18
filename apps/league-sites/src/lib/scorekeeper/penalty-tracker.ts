/**
 * PenaltyTracker - Tracks active penalties and team strength for auto-detection
 *
 * NHL rules implemented:
 * - Minor (2 min): expires on PP goal (FIFO order)
 * - Double minor (4 min): split into two 2-min halves, each expires on PP goal
 * - Major (5 min): does NOT expire on goal
 * - Misconduct (10 min): no power play (team plays full strength)
 * - Max 2 players in box (can't go below 3 skaters)
 * - Coincidental penalties: equal strength = no PP
 */

export interface ActivePenalty {
  eventId: string;
  teamType: 'home' | 'away';
  playerId: string;
  penaltyMinutes: number;
  startTimeSeconds: number;
  period: number;
  /** Whether this penalty has been "served" (expired early due to PP goal) */
  served: boolean;
  /** For double-minor halves, the original event ID */
  parentEventId?: string;
  /** 0 = first half, 1 = second half (only set for double-minor splits) */
  halfIndex?: number;
  /** Original penalty type for display purposes */
  penaltyType?: string;
}

export class PenaltyTracker {
  private penalties: ActivePenalty[] = [];
  private periodLengthSeconds: number;

  constructor(periodLengthMinutes: number = 20) {
    this.periodLengthSeconds = periodLengthMinutes * 60;
  }

  /** Add a penalty to the tracker. Double minors (4 min) are split into two 2-min halves. */
  addPenalty(penalty: {
    eventId: string;
    teamType: 'home' | 'away';
    playerId: string;
    penaltyMinutes: number;
    gameTimeSeconds: number;
    period: number;
    penaltyType?: string;
  }) {
    if (penalty.penaltyMinutes === 4) {
      // Double minor: split into two consecutive 2-min halves
      // First half starts at penalty time
      this.penalties.push({
        eventId: penalty.eventId,
        teamType: penalty.teamType,
        playerId: penalty.playerId,
        penaltyMinutes: 2,
        startTimeSeconds: penalty.gameTimeSeconds,
        period: penalty.period,
        served: false,
        parentEventId: penalty.eventId,
        halfIndex: 0,
        penaltyType: penalty.penaltyType,
      });

      // Second half starts 2 minutes after the first
      const startAbsolute = this.toAbsoluteSeconds(penalty.period, penalty.gameTimeSeconds);
      const secondHalfAbsolute = startAbsolute + 120;
      const { period: secondPeriod, timeRemaining: secondTimeRemaining } =
        this.fromAbsoluteSeconds(secondHalfAbsolute);

      this.penalties.push({
        eventId: `${penalty.eventId}_h2`,
        teamType: penalty.teamType,
        playerId: penalty.playerId,
        penaltyMinutes: 2,
        startTimeSeconds: secondTimeRemaining,
        period: secondPeriod,
        served: false,
        parentEventId: penalty.eventId,
        halfIndex: 1,
        penaltyType: penalty.penaltyType,
      });
    } else {
      this.penalties.push({
        eventId: penalty.eventId,
        teamType: penalty.teamType,
        playerId: penalty.playerId,
        penaltyMinutes: penalty.penaltyMinutes,
        startTimeSeconds: penalty.gameTimeSeconds,
        period: penalty.period,
        served: false,
        penaltyType: penalty.penaltyType,
      });
    }
  }

  /** Remove a penalty (for undo) */
  removePenalty(eventId: string) {
    // Also remove double-minor halves
    this.penalties = this.penalties.filter(
      p => p.eventId !== eventId && p.parentEventId !== eventId
    );
  }

  /**
   * Get elapsed game time in seconds from the start of the game.
   * Converts period + time-remaining into absolute elapsed seconds.
   */
  toAbsoluteSeconds(period: number, gameTimeSeconds: number): number {
    // gameTimeSeconds = time remaining in the period (countdown)
    const elapsedInPeriod = this.periodLengthSeconds - gameTimeSeconds;
    return (period - 1) * this.periodLengthSeconds + elapsedInPeriod;
  }

  /**
   * Convert absolute elapsed seconds back to period + time remaining.
   */
  private fromAbsoluteSeconds(absoluteSeconds: number): { period: number; timeRemaining: number } {
    const period = Math.floor(absoluteSeconds / this.periodLengthSeconds) + 1;
    const elapsedInPeriod = absoluteSeconds - (period - 1) * this.periodLengthSeconds;
    const timeRemaining = this.periodLengthSeconds - elapsedInPeriod;
    return { period, timeRemaining };
  }

  /**
   * Get remaining seconds on a penalty at the current game time.
   */
  getRemainingSeconds(
    penalty: ActivePenalty,
    currentTimeSeconds: number,
    currentPeriod: number
  ): number {
    const currentAbsolute = this.toAbsoluteSeconds(currentPeriod, currentTimeSeconds);
    const startAbsolute = this.toAbsoluteSeconds(penalty.period, penalty.startTimeSeconds);
    const durationSeconds = penalty.penaltyMinutes * 60;
    const endAbsolute = startAbsolute + durationSeconds;
    return Math.max(0, endAbsolute - currentAbsolute);
  }

  /**
   * Get penalties that are currently active (not expired) at a given time
   */
  getActivePenalties(
    teamType: 'home' | 'away',
    currentTimeSeconds: number,
    period: number
  ): ActivePenalty[] {
    const currentAbsolute = this.toAbsoluteSeconds(period, currentTimeSeconds);

    return this.penalties.filter(p => {
      if (p.teamType !== teamType || p.served) return false;

      const startAbsolute = this.toAbsoluteSeconds(p.period, p.startTimeSeconds);
      const durationSeconds = p.penaltyMinutes * 60;
      const endAbsolute = startAbsolute + durationSeconds;

      return currentAbsolute >= startAbsolute && currentAbsolute < endAbsolute;
    });
  }

  /**
   * Get ALL active penalties for both teams (for penalty box display)
   */
  getAllActivePenalties(
    currentTimeSeconds: number,
    period: number
  ): ActivePenalty[] {
    return [
      ...this.getActivePenalties('home', currentTimeSeconds, period),
      ...this.getActivePenalties('away', currentTimeSeconds, period),
    ];
  }

  /**
   * Get effective team strength (5v5, 5v4, 5v3, 4v4, 4v3, 3v3)
   * Returns number of skaters (not counting goalie).
   * Misconduct (10 min) penalties do NOT reduce team strength.
   */
  getTeamStrength(
    teamType: 'home' | 'away',
    currentTimeSeconds: number,
    period: number
  ): number {
    const activePenalties = this.getActivePenalties(
      teamType,
      currentTimeSeconds,
      period
    );
    // Misconducts don't reduce team strength — another player serves no time
    const strengthPenalties = activePenalties.filter(p => p.penaltyMinutes !== 10);
    // Max 2 players in the box at once (can't go below 3 skaters)
    const playersInBox = Math.min(strengthPenalties.length, 2);
    return Math.max(5 - playersInBox, 3);
  }

  /**
   * Check if a goal scored by the given team is a power play goal
   */
  isPowerPlay(
    scoringTeamType: 'home' | 'away',
    currentTimeSeconds: number,
    period: number
  ): boolean {
    const opposingTeam = scoringTeamType === 'home' ? 'away' : 'home';
    const scoringStrength = this.getTeamStrength(scoringTeamType, currentTimeSeconds, period);
    const opposingStrength = this.getTeamStrength(opposingTeam, currentTimeSeconds, period);
    return scoringStrength > opposingStrength;
  }

  /**
   * Check if a goal scored by the given team is a short-handed goal
   */
  isShortHanded(
    scoringTeamType: 'home' | 'away',
    currentTimeSeconds: number,
    period: number
  ): boolean {
    const opposingTeam = scoringTeamType === 'home' ? 'away' : 'home';
    const scoringStrength = this.getTeamStrength(scoringTeamType, currentTimeSeconds, period);
    const opposingStrength = this.getTeamStrength(opposingTeam, currentTimeSeconds, period);
    return scoringStrength < opposingStrength;
  }

  /**
   * On a power play goal, expire the earliest minor penalty for the penalized team.
   * Major penalties (5 min) do NOT expire early on goals.
   * Returns the expired penalty's eventId, or null if none expired.
   */
  expireEarliestMinor(
    penalizedTeamType: 'home' | 'away',
    currentTimeSeconds: number,
    period: number
  ): string | null {
    const activePenalties = this.getActivePenalties(
      penalizedTeamType,
      currentTimeSeconds,
      period
    );

    // Find the earliest minor penalty (2 min) that hasn't been served
    // This naturally handles double-minors since they're split into 2-min halves
    const minorPenalties = activePenalties
      .filter(p => p.penaltyMinutes === 2)
      .sort((a, b) => {
        const aAbs = this.toAbsoluteSeconds(a.period, a.startTimeSeconds);
        const bAbs = this.toAbsoluteSeconds(b.period, b.startTimeSeconds);
        return aAbs - bAbs;
      });

    if (minorPenalties.length > 0) {
      minorPenalties[0].served = true;
      return minorPenalties[0].eventId;
    }
    return null;
  }

  /** Reset all penalties (e.g., for a new game) */
  reset() {
    this.penalties = [];
  }
}
