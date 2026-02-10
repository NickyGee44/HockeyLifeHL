/**
 * PenaltyTracker - Tracks active penalties and team strength for auto-detection
 *
 * Handles: coincidental penalties, double minors, majors, game misconducts.
 * Minor penalties expire early on PP goals (NHL rule).
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
}

export class PenaltyTracker {
  private penalties: ActivePenalty[] = [];
  private periodLengthSeconds: number;

  constructor(periodLengthMinutes: number = 20) {
    this.periodLengthSeconds = periodLengthMinutes * 60;
  }

  /** Add a penalty to the tracker */
  addPenalty(penalty: {
    eventId: string;
    teamType: 'home' | 'away';
    playerId: string;
    penaltyMinutes: number;
    gameTimeSeconds: number;
    period: number;
  }) {
    this.penalties.push({
      eventId: penalty.eventId,
      teamType: penalty.teamType,
      playerId: penalty.playerId,
      penaltyMinutes: penalty.penaltyMinutes,
      startTimeSeconds: penalty.gameTimeSeconds,
      period: penalty.period,
      served: false,
    });
  }

  /** Remove a penalty (for undo) */
  removePenalty(eventId: string) {
    this.penalties = this.penalties.filter(p => p.eventId !== eventId);
  }

  /**
   * Get elapsed game time in seconds from the start of the game.
   * Converts period + time-remaining into absolute elapsed seconds.
   */
  private toAbsoluteSeconds(period: number, gameTimeSeconds: number): number {
    // gameTimeSeconds = time remaining in the period (countdown)
    const elapsedInPeriod = this.periodLengthSeconds - gameTimeSeconds;
    return (period - 1) * this.periodLengthSeconds + elapsedInPeriod;
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
   * Get effective team strength (5v5, 5v4, 5v3, 4v4, 4v3, 3v3)
   * Returns number of skaters (not counting goalie)
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
    // Max 2 players in the box at once (can't go below 3 skaters)
    const playersInBox = Math.min(activePenalties.length, 2);
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
   * Major penalties do NOT expire early on goals.
   */
  expireEarliestMinor(
    penalizedTeamType: 'home' | 'away',
    currentTimeSeconds: number,
    period: number
  ) {
    const activePenalties = this.getActivePenalties(
      penalizedTeamType,
      currentTimeSeconds,
      period
    );

    // Find the earliest minor penalty (2 min) that hasn't been served
    const minorPenalties = activePenalties
      .filter(p => p.penaltyMinutes === 2)
      .sort((a, b) => {
        const aAbs = this.toAbsoluteSeconds(a.period, a.startTimeSeconds);
        const bAbs = this.toAbsoluteSeconds(b.period, b.startTimeSeconds);
        return aAbs - bAbs;
      });

    if (minorPenalties.length > 0) {
      minorPenalties[0].served = true;
    }
  }

  /** Reset all penalties (e.g., for a new game) */
  reset() {
    this.penalties = [];
  }
}
