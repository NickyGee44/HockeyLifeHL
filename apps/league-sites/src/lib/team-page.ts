import type {
  Player,
  ScheduleGame,
  Season,
  TeamStanding,
  UnifiedGoalieStatsRow,
  UnifiedSkaterStatsRow,
} from './types';
import { resolvePlayerPhotoUrl } from './player-photo';

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
  team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    primaryColor?: string | null;
  };
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
  metric: TeamLeaderMetric;
  value: number;
  gamesPlayed: number;
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

function isSparePlayer(player: Player): boolean {
  const playerType = (player as { player_type?: string | null }).player_type?.toLowerCase?.() ?? '';
  return playerType === 'sub' || playerType === 'spare' || playerType === 'part_time';
}

function compareRosterPlayers(
  left: Player,
  right: Player,
  rosterStatsByPlayer: TeamPageRosterStatsByPlayer,
  goalieMode: boolean,
) {
  const leftSpare = isSparePlayer(left);
  const rightSpare = isSparePlayer(right);
  if (leftSpare !== rightSpare) return Number(leftSpare) - Number(rightSpare);

  const leftJersey = left.jersey_number ?? Number.MAX_SAFE_INTEGER;
  const rightJersey = right.jersey_number ?? Number.MAX_SAFE_INTEGER;
  if (leftJersey !== rightJersey) return leftJersey - rightJersey;

  const leftStats = rosterStatsByPlayer[left.player_id];
  const rightStats = rosterStatsByPlayer[right.player_id];

  if (goalieMode) {
    const byWins = (rightStats?.wins ?? 0) - (leftStats?.wins ?? 0);
    if (byWins !== 0) return byWins;

    const bySavePct = (rightStats?.save_percentage ?? 0) - (leftStats?.save_percentage ?? 0);
    if (bySavePct !== 0) return bySavePct;
  } else {
    const byPoints = (rightStats?.points ?? 0) - (leftStats?.points ?? 0);
    if (byPoints !== 0) return byPoints;

    const byGoals = (rightStats?.goals ?? 0) - (leftStats?.goals ?? 0);
    if (byGoals !== 0) return byGoals;
  }

  return (left.profile?.full_name || '').localeCompare(right.profile?.full_name || '');
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

  skaters.sort((left, right) => compareRosterPlayers(left, right, rosterStatsByPlayer, false));
  goalies.sort((left, right) => compareRosterPlayers(left, right, rosterStatsByPlayer, true));

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
        avatarUrl: resolvePlayerPhotoUrl(player.profile),
        jerseyNumber: player.jersey_number ?? null,
        metric,
        value: stats?.[metric] ?? 0,
        gamesPlayed: stats?.games_played ?? 0,
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

// ---------------------------------------------------------------------------
// Tale-of-the-Tape rival matchup data
// ---------------------------------------------------------------------------

export type TeamStrengthLabel = 'offense' | 'defence' | 'goaltending' | 'balanced';

export type TaleOfTheTapeTeamSide = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  overallRecord: string;       // e.g. "12-4-2"
  goalsFor: number;
  goalsAgainst: number;
  goalDifferential: number;
  strength: TeamStrengthLabel;
  weakness: TeamStrengthLabel;
  sniper: {
    name: string;
    goals: number;
  };
  playmaker: {
    name: string;
    assists: number;
  };
  tendy: {
    name: string;
    gamesPlayed: number;
    goalsAgainstAverage: number | null;
    emoji: string;
  };
};

export type TaleOfTheTapeRival = {
  /** The viewed team (left side) */
  team: TaleOfTheTapeTeamSide;
  /** The rival (right side) */
  rival: TaleOfTheTapeTeamSide;
  /** Head-to-head record from the viewed team's perspective (W-L-T) */
  h2hRecord: string;
  /** Rival's head-to-head record (mirror) */
  h2hRecordRival: string;
  /** Total games between the two teams this season */
  gamesPlayed: number;
};

type SkaterLeaderMetric = 'goals' | 'assists';

type TaleOfTheTapeBuildInput = {
  teamId: string;
  teamName?: string;
  teamPrimaryColor?: string | null;
  rivals: RivalSummary[];
  standings: TeamStanding[];
  skaterRows: Pick<UnifiedSkaterStatsRow, 'team_id' | 'player_id' | 'player_name' | 'goals' | 'assists' | 'points'>[];
  goalieRows: Pick<UnifiedGoalieStatsRow, 'team_id' | 'player_id' | 'player_name' | 'games_played' | 'goals_against_average'>[];
};

const DEFAULT_TALE_OF_THE_TAPE_COLOR = 'var(--league-primary)';
const EMPTY_PLAYER_NAME = 'No data';

function normalizeTeamPrimaryColor(color?: string | null): string {
  return color?.trim() || DEFAULT_TALE_OF_THE_TAPE_COLOR;
}

function buildSkaterLeaderLookup(
  rows: Pick<UnifiedSkaterStatsRow, 'team_id' | 'player_name' | 'goals' | 'assists' | 'points'>[],
  metric: SkaterLeaderMetric,
): Map<string, { name: string; value: number }> {
  const compare = (
    left: Pick<UnifiedSkaterStatsRow, 'player_name' | 'goals' | 'assists' | 'points'>,
    right: Pick<UnifiedSkaterStatsRow, 'player_name' | 'goals' | 'assists' | 'points'>,
  ) => {
    const primaryDiff = (right[metric] ?? 0) - (left[metric] ?? 0);
    if (primaryDiff !== 0) return primaryDiff;

    const pointDiff = (right.points ?? 0) - (left.points ?? 0);
    if (pointDiff !== 0) return pointDiff;

    const goalDiff = (right.goals ?? 0) - (left.goals ?? 0);
    if (goalDiff !== 0) return goalDiff;

    const assistDiff = (right.assists ?? 0) - (left.assists ?? 0);
    if (assistDiff !== 0) return assistDiff;

    return (left.player_name || '').localeCompare(right.player_name || '');
  };

  const leaders = new Map<string, Pick<UnifiedSkaterStatsRow, 'player_name' | 'goals' | 'assists' | 'points'>>();

  for (const row of rows) {
    const existing = leaders.get(row.team_id);
    if (!existing || compare(row, existing) < 0) {
      leaders.set(row.team_id, row);
    }
  }

  return new Map(
    Array.from(leaders.entries()).map(([teamId, row]) => [
      teamId,
      {
        name: row.player_name || EMPTY_PLAYER_NAME,
        value: row[metric] ?? 0,
      },
    ]),
  );
}

function compareGoalieRows(
  left: Pick<UnifiedGoalieStatsRow, 'player_name' | 'games_played' | 'goals_against_average'>,
  right: Pick<UnifiedGoalieStatsRow, 'player_name' | 'games_played' | 'goals_against_average'>,
) {
  const gamesDiff = (right.games_played ?? 0) - (left.games_played ?? 0);
  if (gamesDiff !== 0) return gamesDiff;

  const leftGaa = left.goals_against_average;
  const rightGaa = right.goals_against_average;
  if (leftGaa != null && rightGaa != null && leftGaa !== rightGaa) {
    return leftGaa - rightGaa;
  }
  if (leftGaa == null && rightGaa != null) return 1;
  if (leftGaa != null && rightGaa == null) return -1;

  return (left.player_name || '').localeCompare(right.player_name || '');
}

function buildGoalieLeaderLookup(
  rows: Pick<UnifiedGoalieStatsRow, 'team_id' | 'player_id' | 'player_name' | 'games_played' | 'goals_against_average'>[],
): Map<string, Pick<UnifiedGoalieStatsRow, 'team_id' | 'player_id' | 'player_name' | 'games_played' | 'goals_against_average'>> {
  const leaders = new Map<string, Pick<UnifiedGoalieStatsRow, 'team_id' | 'player_id' | 'player_name' | 'games_played' | 'goals_against_average'>>();

  for (const row of rows) {
    const existing = leaders.get(row.team_id);
    if (!existing || compareGoalieRows(row, existing) < 0) {
      leaders.set(row.team_id, row);
    }
  }

  return leaders;
}

export function getTendyEmoji(
  goalie: Pick<UnifiedGoalieStatsRow, 'team_id' | 'player_id' | 'games_played' | 'goals_against_average'> | null | undefined,
  leagueGoalies: Pick<UnifiedGoalieStatsRow, 'team_id' | 'player_id' | 'games_played' | 'goals_against_average'>[],
): string {
  if (!goalie || goalie.games_played <= 0 || goalie.goals_against_average == null) {
    return '🥅';
  }

  const ranked = leagueGoalies
    .filter((row) => row.games_played > 0 && row.goals_against_average != null)
    .sort((left, right) => {
      if (left.goals_against_average !== right.goals_against_average) {
        return (left.goals_against_average ?? Number.POSITIVE_INFINITY)
          - (right.goals_against_average ?? Number.POSITIVE_INFINITY);
      }
      if (right.games_played !== left.games_played) {
        return right.games_played - left.games_played;
      }
      return `${left.team_id}:${left.player_id}`.localeCompare(`${right.team_id}:${right.player_id}`);
    });

  if (ranked.length === 0) {
    return '🥅';
  }

  const rank = ranked.findIndex((row) => row.team_id === goalie.team_id && row.player_id === goalie.player_id);
  if (rank === -1) {
    return '🥅';
  }

  const percentile = ranked.length === 1 ? 1 : 1 - rank / (ranked.length - 1);

  if (percentile >= 0.75) return '🧱';
  if (percentile >= 0.5) return '🧤';
  if (percentile >= 0.25) return '😬';
  return '🧀';
}

/**
 * Derive a team's primary strength and weakness from league-relative rankings.
 *
 * Heuristic (deterministic, easy to explain):
 * 1. Rank the team by goals_for (desc) → offense_pct (0 = best, 1 = worst).
 * 2. Rank the team by goals_against (asc) → defense_pct (0 = best, 1 = worst).
 * 3. If |offense_pct − defense_pct| ≤ 0.15 → strength & weakness are both "balanced".
 * 4. Otherwise the better percentile is the strength; the worse is the weakness.
 * 5. On the defensive side we distinguish "goaltending" (top-40 % GA) from "defence"
 *    (bottom-60 % GA) to give some variety, since standings don't separate the two.
 */
export function deriveStrengthWeakness(
  standings: TeamStanding[],
  teamId: string,
): { strength: TeamStrengthLabel; weakness: TeamStrengthLabel } {
  const total = standings.length;
  if (total <= 1) return { strength: 'balanced', weakness: 'balanced' };

  const offenseRank = rankStandingValue(standings, teamId, 'goals_for', 'desc');
  const defenseRank = rankStandingValue(standings, teamId, 'goals_against', 'asc');

  if (offenseRank == null || defenseRank == null) {
    return { strength: 'balanced', weakness: 'balanced' };
  }

  // Normalise to 0-1 where 0 = best
  const offPct = (offenseRank - 1) / (total - 1);
  const defPct = (defenseRank - 1) / (total - 1);

  if (Math.abs(offPct - defPct) <= 0.15) {
    return { strength: 'balanced', weakness: 'balanced' };
  }

  const defensiveLabel = (pct: number): TeamStrengthLabel =>
    pct <= 0.4 ? 'goaltending' : 'defence';

  if (offPct < defPct) {
    // Offense is the stronger side
    return { strength: 'offense', weakness: defensiveLabel(defPct) };
  }
  // Defense is the stronger side
  return { strength: defensiveLabel(defPct), weakness: 'offense' };
}

/**
 * Build the full tale-of-the-tape data for each rival, ready for the UI.
 * Requires the current-season standings so we can attach GF/GA/record/strength
 * for both the viewed team and each rival.
 */
export function buildTaleOfTheTapeRivals(input: TaleOfTheTapeBuildInput): TaleOfTheTapeRival[] {
  const { teamId, teamName, teamPrimaryColor, rivals, standings, skaterRows, goalieRows } = input;
  const standingMap = new Map(standings.map((s) => [s.team_id, s]));
  const teamStanding = standingMap.get(teamId);

  if (!teamStanding) return [];

  const teamSW = deriveStrengthWeakness(standings, teamId);
  const sniperLeaders = buildSkaterLeaderLookup(skaterRows, 'goals');
  const playmakerLeaders = buildSkaterLeaderLookup(skaterRows, 'assists');
  const goalieLeaders = buildGoalieLeaderLookup(goalieRows);

  const teamSniper = sniperLeaders.get(teamId) ?? { name: EMPTY_PLAYER_NAME, value: 0 };
  const teamPlaymaker = playmakerLeaders.get(teamId) ?? { name: EMPTY_PLAYER_NAME, value: 0 };
  const teamGoalie = goalieLeaders.get(teamId);

  return rivals
    .map((rival) => {
      const rivalStanding = standingMap.get(rival.team.id);
      if (!rivalStanding) return null;

      const rivalSW = deriveStrengthWeakness(standings, rival.team.id);
      const rivalSniper = sniperLeaders.get(rival.team.id) ?? { name: EMPTY_PLAYER_NAME, value: 0 };
      const rivalPlaymaker = playmakerLeaders.get(rival.team.id) ?? { name: EMPTY_PLAYER_NAME, value: 0 };
      const rivalGoalie = goalieLeaders.get(rival.team.id);

      const teamSide: TaleOfTheTapeTeamSide = {
        id: teamId,
        name: teamName || teamStanding.team_name,
        slug: '',
        logo: teamStanding.team_logo,
        primaryColor: normalizeTeamPrimaryColor(teamPrimaryColor),
        overallRecord: `${teamStanding.wins}-${teamStanding.losses}-${teamStanding.ties}`,
        goalsFor: teamStanding.goals_for,
        goalsAgainst: teamStanding.goals_against,
        goalDifferential: teamStanding.goal_differential,
        strength: teamSW.strength,
        weakness: teamSW.weakness,
        sniper: {
          name: teamSniper.name,
          goals: teamSniper.value,
        },
        playmaker: {
          name: teamPlaymaker.name,
          assists: teamPlaymaker.value,
        },
        tendy: {
          name: teamGoalie && teamGoalie.games_played > 0 ? teamGoalie.player_name || EMPTY_PLAYER_NAME : EMPTY_PLAYER_NAME,
          gamesPlayed: teamGoalie?.games_played ?? 0,
          goalsAgainstAverage: teamGoalie?.goals_against_average ?? null,
          emoji: getTendyEmoji(teamGoalie, goalieRows),
        },
      };

      const rivalSide: TaleOfTheTapeTeamSide = {
        id: rival.team.id,
        name: rival.team.name,
        slug: rival.team.slug,
        logo: rival.team.logo,
        primaryColor: normalizeTeamPrimaryColor(rival.team.primaryColor),
        overallRecord: `${rivalStanding.wins}-${rivalStanding.losses}-${rivalStanding.ties}`,
        goalsFor: rivalStanding.goals_for,
        goalsAgainst: rivalStanding.goals_against,
        goalDifferential: rivalStanding.goal_differential,
        strength: rivalSW.strength,
        weakness: rivalSW.weakness,
        sniper: {
          name: rivalSniper.name,
          goals: rivalSniper.value,
        },
        playmaker: {
          name: rivalPlaymaker.name,
          assists: rivalPlaymaker.value,
        },
        tendy: {
          name: rivalGoalie && rivalGoalie.games_played > 0 ? rivalGoalie.player_name || EMPTY_PLAYER_NAME : EMPTY_PLAYER_NAME,
          gamesPlayed: rivalGoalie?.games_played ?? 0,
          goalsAgainstAverage: rivalGoalie?.goals_against_average ?? null,
          emoji: getTendyEmoji(rivalGoalie, goalieRows),
        },
      };

      const h2hRecord = `${rival.wins}-${rival.losses}${rival.ties > 0 ? `-${rival.ties}` : ''}`;
      const h2hRecordRival = `${rival.losses}-${rival.wins}${rival.ties > 0 ? `-${rival.ties}` : ''}`;

      return {
        team: teamSide,
        rival: rivalSide,
        h2hRecord,
        h2hRecordRival,
        gamesPlayed: rival.games_played,
      } satisfies TaleOfTheTapeRival;
    })
    .filter((entry): entry is TaleOfTheTapeRival => entry !== null);
}
