import type { Player, ScheduleGame, Season, TeamStanding } from './types';

export type TeamPageRosterStatsByPlayer = Record<string, {
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  wins: number;
  losses: number;
  save_percentage: number | null;
  goals_against_average: number | null;
  shutouts: number;
  is_goalie: boolean;
}>;

export type TeamScheduleView = 'upcoming' | 'past';

export type RivalSummary = {
  team: { id: string; name: string; slug: string; logo: string | null };
  wins: number;
  losses: number;
  ties: number;
  games_played: number;
};

export type RivalCardInsight = RivalSummary & {
  status: 'leading' | 'trailing' | 'level';
  recordLabel: string;
  insight: string;
};

export type TeamChampionshipSeason = Pick<Season, 'id' | 'name' | 'start_date' | 'end_date' | 'champion_team_id'> & {
  standingsLeaderTeamId?: string | null;
};

export type TeamChampionshipSummary = {
  count: number;
  latestTitleSeasonName: string | null;
  latestTitleLabel: string | null;
  titleSeasonIds: string[];
};

export type TeamLeaderMetric = 'goals' | 'assists' | 'points' | 'penalty_minutes';

export type TeamLeaderCard = {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  jerseyNumber: number | null;
  leadershipRole: Player['leadership_role'];
  metric: TeamLeaderMetric;
  value: number;
  gamesPlayed: number;
  positionLabel: string;
};

export type TeamPointInsight = {
  key: string;
  label: string;
  text: string;
};

export function isGoaliePosition(position: string | null | undefined): boolean {
  const value = (position || '').trim().toUpperCase();
  return value === 'G' || value === 'GOALIE' || value === 'GOALTENDER';
}

export function getPositionShortLabel(position: string | null | undefined, isGoalie: boolean): string {
  if (isGoalie) return 'G';

  const value = (position || '').trim().toUpperCase();
  if (value === 'C' || value === 'LW' || value === 'RW' || value === 'D') return value;
  if (value === 'FORWARD') return 'F';
  if (value === 'DEFENSE' || value === 'DEFENCEMAN' || value === 'DEFENSEMAN' || value === 'LD' || value === 'RD') {
    return 'D';
  }

  return value || '-';
}

export function formatSavePercentage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return `.${Math.round(value * 1000).toString().padStart(3, '0')}`;
}

export function normalizeTeamScheduleView(value: string | null | undefined): TeamScheduleView {
  return value === 'past' ? 'past' : 'upcoming';
}

export function partitionTeamSchedule(
  schedule: ScheduleGame[],
  now = new Date(),
): { upcomingGames: ScheduleGame[]; pastGames: ScheduleGame[] } {
  const upcomingGames = schedule.filter((game) => {
    if (game.status === 'cancelled') return false;
    if (game.status === 'completed') return false;
    if (game.status === 'in_progress') return true;
    if (game.status === 'scheduled' || game.status === 'postponed') return true;
    return new Date(game.scheduled_at).getTime() >= now.getTime();
  });

  const pastGames = schedule
    .filter((game) => {
      if (game.status === 'completed') return true;
      if (game.status === 'cancelled') return false;
      return new Date(game.scheduled_at).getTime() < now.getTime();
    })
    .sort((left, right) => new Date(right.scheduled_at).getTime() - new Date(left.scheduled_at).getTime());

  return { upcomingGames, pastGames };
}

export function splitRosterByRole(
  roster: Player[],
  rosterStatsByPlayer: TeamPageRosterStatsByPlayer,
): { skaters: Player[]; goalies: Player[] } {
  const skaters = roster.filter((player) => {
    const stats = rosterStatsByPlayer[player.player_id];
    return !player.is_goalie && !isGoaliePosition(player.position) && !stats?.is_goalie;
  });
  const goalies = roster.filter((player) => {
    const stats = rosterStatsByPlayer[player.player_id];
    return Boolean(player.is_goalie || isGoaliePosition(player.position) || stats?.is_goalie);
  });

  skaters.sort((left, right) => {
    const leftStats = rosterStatsByPlayer[left.player_id];
    const rightStats = rosterStatsByPlayer[right.player_id];
    const byPoints = (rightStats?.points ?? 0) - (leftStats?.points ?? 0);
    if (byPoints !== 0) return byPoints;

    const byGoals = (rightStats?.goals ?? 0) - (leftStats?.goals ?? 0);
    if (byGoals !== 0) return byGoals;

    return (left.profile?.full_name || '').localeCompare(right.profile?.full_name || '');
  });

  goalies.sort((left, right) => {
    const leftStats = rosterStatsByPlayer[left.player_id];
    const rightStats = rosterStatsByPlayer[right.player_id];
    const byWins = (rightStats?.wins ?? 0) - (leftStats?.wins ?? 0);
    if (byWins !== 0) return byWins;

    const bySavePct = (rightStats?.save_percentage ?? 0) - (leftStats?.save_percentage ?? 0);
    if (bySavePct !== 0) return bySavePct;

    return (left.profile?.full_name || '').localeCompare(right.profile?.full_name || '');
  });

  return { skaters, goalies };
}

export function summarizeTeamChampionships(
  teamId: string,
  seasons: TeamChampionshipSeason[],
): TeamChampionshipSummary {
  const titleSeasons = seasons
    .filter((season) => {
      const championId = season.champion_team_id || season.standingsLeaderTeamId || null;
      return championId === teamId;
    })
    .sort((left, right) => new Date(right.end_date).getTime() - new Date(left.end_date).getTime());

  const latestTitle = titleSeasons[0] ?? null;

  return {
    count: titleSeasons.length,
    latestTitleSeasonName: latestTitle?.name ?? null,
    latestTitleLabel: latestTitle ? formatSeasonSpan(latestTitle.start_date, latestTitle.end_date) : null,
    titleSeasonIds: titleSeasons.map((season) => season.id),
  };
}

export function getTeamStandingRank(standings: TeamStanding[], teamId: string): number | null {
  const index = standings.findIndex((standing) => standing.team_id === teamId);
  return index >= 0 ? index + 1 : null;
}

export function buildTeamLeaders(
  skaters: Player[],
  rosterStatsByPlayer: TeamPageRosterStatsByPlayer,
  metric: TeamLeaderMetric,
  limit = 3,
): TeamLeaderCard[] {
  return skaters
    .map((player) => {
      const stats = rosterStatsByPlayer[player.player_id];
      return {
        playerId: player.player_id,
        name: player.profile?.full_name || 'Unknown Player',
        avatarUrl: player.profile?.avatar_url || null,
        jerseyNumber: player.jersey_number ?? null,
        leadershipRole: player.leadership_role,
        metric,
        value: stats?.[metric] ?? 0,
        gamesPlayed: stats?.games_played ?? 0,
        positionLabel: getPositionShortLabel(player.position, false),
      } satisfies TeamLeaderCard;
    })
    .sort((left, right) => {
      const valueDiff = right.value - left.value;
      if (valueDiff !== 0) return valueDiff;

      const leftStats = rosterStatsByPlayer[left.playerId];
      const rightStats = rosterStatsByPlayer[right.playerId];
      const pointsDiff = (rightStats?.points ?? 0) - (leftStats?.points ?? 0);
      if (pointsDiff !== 0) return pointsDiff;

      const goalsDiff = (rightStats?.goals ?? 0) - (leftStats?.goals ?? 0);
      if (goalsDiff !== 0) return goalsDiff;

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export function buildTeamPointInsights({
  teamName,
  teamId,
  standings,
  teamStats,
  rosterStatsByPlayer,
}: {
  teamName: string;
  teamId: string;
  standings: TeamStanding[];
  teamStats: TeamStanding | null;
  rosterStatsByPlayer: TeamPageRosterStatsByPlayer;
}): TeamPointInsight[] {
  if (!teamStats) return [];

  const insights: TeamPointInsight[] = [];
  const rank = getTeamStandingRank(standings, teamId);
  const topTeam = standings[0] ?? null;
  const totalTeams = standings.length;

  if (rank != null && totalTeams > 0) {
    insights.push({
      key: 'rank',
      label: 'Standings',
      text: `${teamName} sits ${ordinal(rank)} out of ${totalTeams} teams with ${teamStats.points} points through ${teamStats.games_played} games.`,
    });
  }

  if (topTeam && topTeam.team_id !== teamId) {
    const gap = topTeam.points - teamStats.points;
    insights.push({
      key: 'race',
      label: 'Points Race',
      text: gap > 0
        ? `${teamName} is ${gap} point${gap === 1 ? '' : 's'} back of ${topTeam.team_name} for the league lead.`
        : `${teamName} is currently level with ${topTeam.team_name} on points at the top of the table.`,
    });
  }

  const pointsPerGame = teamStats.games_played > 0 ? teamStats.points / teamStats.games_played : 0;
  const leagueAveragePointsPerGame = standings.length > 0
    ? standings.reduce((sum, standing) => sum + (standing.games_played > 0 ? standing.points / standing.games_played : 0), 0) / standings.length
    : 0;
  insights.push({
    key: 'ppg',
    label: 'Efficiency',
    text: `${teamName} is earning ${pointsPerGame.toFixed(2)} points per game${leagueAveragePointsPerGame > 0 ? ` versus a league average of ${leagueAveragePointsPerGame.toFixed(2)}` : ''}.`,
  });

  const offenseRank = rankStandingValue(standings, teamId, 'goals_for', 'desc');
  const defenseRank = rankStandingValue(standings, teamId, 'goals_against', 'asc');
  const diffRank = rankStandingValue(standings, teamId, 'goal_differential', 'desc');

  if (offenseRank != null && defenseRank != null) {
    insights.push({
      key: 'profile',
      label: 'Team Profile',
      text: `${teamName} ranks ${ordinal(offenseRank)} in goals for (${teamStats.goals_for}) and ${ordinal(defenseRank)} in goals against (${teamStats.goals_against})${diffRank != null ? `, good for the ${ordinal(diffRank)}-best goal differential in the league` : ''}.`,
    });
  }

  const scoringLeaders = Object.entries(rosterStatsByPlayer)
    .filter(([, stats]) => stats.games_played > 0)
    .sort(([, left], [, right]) => right.points - left.points);
  const topScorer = scoringLeaders[0];
  if (topScorer && teamStats.goals_for > 0) {
    const share = (topScorer[1].points / teamStats.goals_for) * 100;
    insights.push({
      key: 'top-scorer-share',
      label: 'Driver',
      text: `${topScorer[1].points} of the club's scoring points belong to the top producer, a share equal to ${share.toFixed(1)}% of ${teamName}'s ${teamStats.goals_for} goals for.`,
    });
  }

  return insights.slice(0, 5);
}

export function buildRivalCardInsights(rivals: RivalSummary[]): RivalCardInsight[] {
  return rivals.map((rival, index) => {
    const status = rival.wins > rival.losses ? 'leading' : rival.wins < rival.losses ? 'trailing' : 'level';
    const recordLabel = `${rival.wins}-${rival.losses}${rival.ties > 0 ? `-${rival.ties}` : ''}`;

    let insight = `${rival.games_played} completed ${rival.games_played === 1 ? 'meeting' : 'meetings'} in the sample.`;

    if (status === 'level') {
      insight = rival.ties > 0
        ? `This series has stayed level through ${recordLabel} hockey across ${rival.games_played} meetings.`
        : `Neither side has separated itself through ${rival.games_played} meetings.`;
    } else if (status === 'leading') {
      insight = rival.wins - rival.losses >= 2
        ? `They've had the upper hand in this matchup, winning ${rival.wins} of ${rival.games_played} completed games.`
        : `They hold a slim edge in a tight season series.`;
    } else if (status === 'trailing') {
      insight = rival.losses - rival.wins >= 2
        ? `This opponent has controlled more of the matchup so far, taking ${rival.losses} of ${rival.games_played} meetings.`
        : `This has been close, but the edge currently belongs to the opponent.`;
    }

    if (index === 0 && rival.games_played > 1) {
      insight = `Most-played matchup on the page. ${insight}`;
    }

    return {
      ...rival,
      status,
      recordLabel,
      insight,
    };
  });
}

function rankStandingValue(
  standings: TeamStanding[],
  teamId: string,
  key: keyof Pick<TeamStanding, 'goals_for' | 'goals_against' | 'goal_differential'>,
  direction: 'asc' | 'desc',
): number | null {
  const sorted = [...standings].sort((left, right) => {
    const diff = left[key] - right[key];
    if (diff !== 0) {
      return direction === 'asc' ? diff : -diff;
    }

    return right.points - left.points;
  });

  return getTeamStandingRank(sorted, teamId);
}

function ordinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function formatSeasonSpan(startDate: string, endDate: string): string {
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();

  if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
    return '';
  }

  return startYear === endYear
    ? `${startYear}`
    : `${startYear}-${String(endYear).slice(-2)}`;
}
