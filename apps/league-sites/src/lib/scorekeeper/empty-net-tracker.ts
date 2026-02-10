/**
 * Empty Net Tracker - Tracks goalie pull state per team
 *
 * When a team's goalie is pulled, goals scored against that team
 * should be auto-flagged as empty net goals.
 */

export interface GoaliePullState {
  home: boolean;
  away: boolean;
}

export class EmptyNetTracker {
  private state: GoaliePullState = {
    home: false,
    away: false,
  };

  /** Pull a team's goalie */
  pullGoalie(teamType: 'home' | 'away') {
    this.state[teamType] = true;
  }

  /** Put a team's goalie back in net */
  returnGoalie(teamType: 'home' | 'away') {
    this.state[teamType] = false;
  }

  /** Toggle goalie pull state */
  toggleGoalie(teamType: 'home' | 'away') {
    this.state[teamType] = !this.state[teamType];
  }

  /** Check if a team's goalie is pulled */
  isGoaliePulled(teamType: 'home' | 'away'): boolean {
    return this.state[teamType];
  }

  /**
   * Check if a goal should be flagged as empty net.
   * A goal is EN when the opposing team's goalie is pulled.
   */
  isEmptyNetGoal(scoringTeamType: 'home' | 'away'): boolean {
    const opposingTeam = scoringTeamType === 'home' ? 'away' : 'home';
    return this.state[opposingTeam];
  }

  /** Get current state */
  getState(): GoaliePullState {
    return { ...this.state };
  }

  /** Set state from server data */
  setState(state: GoaliePullState) {
    this.state = { ...state };
  }

  /** Reset to default (both goalies in net) */
  reset() {
    this.state = { home: false, away: false };
  }
}
