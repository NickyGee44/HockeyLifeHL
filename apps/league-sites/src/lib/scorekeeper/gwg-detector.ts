/**
 * GWG Detector - Determines which goal is the Game Winning Goal
 *
 * GWG = the goal that gave the winning team one more goal than the losing
 * team's final total. If the final score is 5-3, the GWG is the 4th goal
 * scored by the winning team.
 */

export interface GoalEvent {
  id: string;
  teamType: 'home' | 'away';
  period: number;
  gameTimeSeconds: number | null;
}

/**
 * Calculate which goal event is the GWG given the current list of goals.
 * Returns the event ID of the GWG, or null if the game is tied.
 */
export function detectGWG(goals: GoalEvent[]): string | null {
  if (goals.length === 0) return null;

  // Count totals per team
  const homeGoals = goals.filter(g => g.teamType === 'home');
  const awayGoals = goals.filter(g => g.teamType === 'away');

  const homeTotal = homeGoals.length;
  const awayTotal = awayGoals.length;

  // If tied, no GWG yet
  if (homeTotal === awayTotal) return null;

  const winningTeam = homeTotal > homeTotal ? 'home' : (homeTotal > awayTotal ? 'home' : 'away');
  const losingTeamTotal = winningTeam === 'home' ? awayTotal : homeTotal;

  // GWG is the (losingTeamTotal + 1)th goal by the winning team
  // sorted chronologically
  const winningTeamGoals = goals
    .filter(g => g.teamType === winningTeam)
    .sort((a, b) => {
      if (a.period !== b.period) return a.period - b.period;
      // Higher gameTimeSeconds = earlier in period (countdown)
      return (b.gameTimeSeconds ?? 0) - (a.gameTimeSeconds ?? 0);
    });

  const gwgIndex = losingTeamTotal; // 0-indexed, so this is the (losingTeamTotal+1)th goal
  if (gwgIndex < winningTeamGoals.length) {
    return winningTeamGoals[gwgIndex].id;
  }

  return null;
}
