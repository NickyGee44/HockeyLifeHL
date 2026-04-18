import type { Team, TeamStanding } from './types';

export const TEAMS_DIRECTORY_BUMP_CHART_COLUMNS = [
  { key: 'overall', label: 'Overall' },
  { key: 'offense', label: 'Offense' },
  { key: 'defense', label: 'Defense' },
  { key: 'commitment', label: 'Commitment' },
] as const;

export type TeamsDirectoryBumpChartMetricKey = typeof TEAMS_DIRECTORY_BUMP_CHART_COLUMNS[number]['key'];

export interface TeamCommitmentSnapshot {
  teamId: string;
  attendancePct: number;
  appearances: number;
  possibleAppearances: number;
  confirmedAppearances: number;
  fallbackAppearances: number;
  gamesPlayed: number;
}

export interface TeamsDirectoryBumpChartMetric {
  rank: number;
  value: number;
  valueLabel: string;
}

export interface TeamsDirectoryBumpChartTeam {
  teamId: string;
  teamName: string;
  teamSlug: string;
  logoUrl: string | null;
  primaryColor: string;
  divisionId: string | null;
  metrics: Record<TeamsDirectoryBumpChartMetricKey, TeamsDirectoryBumpChartMetric>;
}

export interface TeamsDirectoryBumpChartData {
  seasonId: string;
  totalTeams: number;
  attendanceSource: 'confirmed-plus-fallback-roster-appearances';
  teams: TeamsDirectoryBumpChartTeam[];
}

const ORDINAL_SUFFIXES = ['th', 'st', 'nd', 'rd'] as const;

function formatOrdinal(value: number) {
  const absolute = Math.abs(value);
  const mod100 = absolute % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  return `${value}${ORDINAL_SUFFIXES[absolute % 10] || 'th'}`;
}

function describeRankTier(rank: number, totalTeams: number) {
  if (rank === 1) return 'leader';
  if (rank === totalTeams) return 'trailing';
  if (rank <= Math.max(2, Math.ceil(totalTeams / 3))) return 'top';
  if (rank >= Math.max(2, totalTeams - 1)) return 'bottom';
  return 'middle';
}

export function buildTeamsDirectoryBumpChartNarrative(
  team: TeamsDirectoryBumpChartTeam,
  metricKey: TeamsDirectoryBumpChartMetricKey,
  totalTeams: number,
) {
  const metric = team.metrics[metricKey];
  const place = `${formatOrdinal(metric.rank)} of ${totalTeams}`;
  const tier = describeRankTier(metric.rank, totalTeams);

  switch (metricKey) {
    case 'overall': {
      const detail = {
        leader: 'They are setting the pace in the standings. 🏁',
        top: 'They are right near the top of the table.',
        middle: 'They are in the middle of the standings fight.',
        bottom: 'There is still runway to climb the table.',
        trailing: 'They are chasing the field in the standings right now.',
      }[tier];

      return `${team.teamName} sit ${place} overall with ${metric.valueLabel}. ${detail}`;
    }

    case 'offense': {
      const detail = {
        leader: 'That is the top scoring mark on this chart. 🚨',
        top: 'The scoring punch is absolutely there.',
        middle: 'The attack is keeping them in the mix.',
        bottom: 'Offense is the clearest place to find another gear.',
        trailing: 'This is the spot with the most room to add some pop.',
      }[tier];

      return `${team.teamName} sit ${place} in offense with ${metric.valueLabel}. ${detail}`;
    }

    case 'defense': {
      const detail = {
        leader: 'That is the stingiest defensive mark in this view. 🧱',
        top: 'They are keeping things tight in their own end.',
        middle: 'Their defensive numbers are holding steady.',
        bottom: 'Shutting the door more often would move this line fast.',
        trailing: 'Defense is the obvious swing category from here.',
      }[tier];

      return `${team.teamName} sit ${place} in defense, allowing ${metric.valueLabel}. ${detail}`;
    }

    case 'commitment': {
      const detail = {
        leader: 'No one is showing up more consistently right now. ✅',
        top: 'Their turnout is one of the strongest in this view.',
        middle: 'Their attendance is right in the pack.',
        bottom: 'A little more consistency would stand out quickly here.',
        trailing: 'Commitment is the clearest place to tighten things up.',
      }[tier];

      return `${team.teamName} sit ${place} in commitment at ${metric.valueLabel} attendance. ${detail}`;
    }
  }
}

interface BuildTeamsDirectoryBumpChartInput {
  seasonId: string;
  teams: Team[];
  standings: TeamStanding[];
  commitment: TeamCommitmentSnapshot[];
}

function roundMetric(value: number, digits = 1) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

function compareByName(left: { team_name?: string | null }, right: { team_name?: string | null }) {
  return (left.team_name || '').localeCompare(right.team_name || '');
}

function buildRankMap<T extends { team_id: string }>(rows: T[]) {
  return new Map(rows.map((row, index) => [row.team_id, index + 1]));
}

export function resolveTeamPrimaryColor(team: Pick<Team, 'primary_color' | 'colors'>): string {
  if (team.primary_color?.trim()) {
    return team.primary_color.trim();
  }

  const colors = team.colors?.trim();
  if (!colors) {
    return 'var(--league-primary)';
  }

  if (colors.startsWith('#')) {
    return colors.split(',')[0]?.trim() || 'var(--league-primary)';
  }

  if (colors.includes(',')) {
    return colors.split(',')[0]?.trim() || 'var(--league-primary)';
  }

  try {
    const parsed = JSON.parse(colors) as { primary?: string; color?: string };
    return parsed.primary || parsed.color || 'var(--league-primary)';
  } catch {
    return 'var(--league-primary)';
  }
}

export function buildTeamsDirectoryBumpChartData({
  seasonId,
  teams,
  standings,
  commitment,
}: BuildTeamsDirectoryBumpChartInput): TeamsDirectoryBumpChartData | null {
  if (teams.length === 0) {
    return null;
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const standingsByTeamId = new Map(
    standings
      .filter((standing) => teamsById.has(standing.team_id))
      .map((standing) => [standing.team_id, standing]),
  );

  const normalizedStandings = teams.map((team) => {
    const standing = standingsByTeamId.get(team.id);
    return standing || {
      team_id: team.id,
      team_name: team.name,
      team_logo: team.logo_url || team.logo || null,
      division_id: team.division_id || null,
      division_name: team.division?.name || null,
      team_type: team.team_type || 'standard',
      games_played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      overtime_losses: 0,
      points: 0,
      goals_for: 0,
      goals_against: 0,
      goal_differential: 0,
      streak: null,
      last_10: null,
    } satisfies TeamStanding;
  });

  const commitmentByTeamId = new Map(commitment.map((entry) => [entry.teamId, entry]));
  const totalTeams = normalizedStandings.length;

  const overallRows = [...normalizedStandings].sort((left, right) => {
    const leftHasGames = left.games_played > 0;
    const rightHasGames = right.games_played > 0;
    if (leftHasGames !== rightHasGames) return leftHasGames ? -1 : 1;
    if (right.points !== left.points) return right.points - left.points;
    if (right.wins !== left.wins) return right.wins - left.wins;
    if (right.goal_differential !== left.goal_differential) return right.goal_differential - left.goal_differential;
    if (right.goals_for !== left.goals_for) return right.goals_for - left.goals_for;
    return compareByName(left, right);
  });

  const overallRanks = buildRankMap(overallRows.map((standing) => ({ team_id: standing.team_id })));

  const offenseRows = [...normalizedStandings].sort((left, right) => {
    const leftHasGames = left.games_played > 0;
    const rightHasGames = right.games_played > 0;
    if (leftHasGames !== rightHasGames) return leftHasGames ? -1 : 1;
    if (right.goals_for !== left.goals_for) return right.goals_for - left.goals_for;
    if (right.points !== left.points) return right.points - left.points;
    if (right.goal_differential !== left.goal_differential) return right.goal_differential - left.goal_differential;
    return compareByName(left, right);
  });

  const defenseRows = [...normalizedStandings].sort((left, right) => {
    const leftHasGames = left.games_played > 0;
    const rightHasGames = right.games_played > 0;
    if (leftHasGames !== rightHasGames) return leftHasGames ? -1 : 1;
    if (left.goals_against !== right.goals_against) return left.goals_against - right.goals_against;
    if (right.points !== left.points) return right.points - left.points;
    if (right.goal_differential !== left.goal_differential) return right.goal_differential - left.goal_differential;
    return compareByName(left, right);
  });

  const commitmentRows = [...normalizedStandings].sort((left, right) => {
    const leftCommitment = commitmentByTeamId.get(left.team_id);
    const rightCommitment = commitmentByTeamId.get(right.team_id);
    const leftHasOpportunities = (leftCommitment?.possibleAppearances ?? 0) > 0;
    const rightHasOpportunities = (rightCommitment?.possibleAppearances ?? 0) > 0;
    if (leftHasOpportunities !== rightHasOpportunities) return leftHasOpportunities ? -1 : 1;

    const leftPct = leftCommitment?.attendancePct ?? 0;
    const rightPct = rightCommitment?.attendancePct ?? 0;
    if (rightPct !== leftPct) return rightPct - leftPct;

    const leftAppearances = leftCommitment?.appearances ?? 0;
    const rightAppearances = rightCommitment?.appearances ?? 0;
    if (rightAppearances !== leftAppearances) return rightAppearances - leftAppearances;

    if ((overallRanks.get(left.team_id) || totalTeams) !== (overallRanks.get(right.team_id) || totalTeams)) {
      return (overallRanks.get(left.team_id) || totalTeams) - (overallRanks.get(right.team_id) || totalTeams);
    }

    return compareByName(left, right);
  });

  const offenseRanks = buildRankMap(offenseRows.map((standing) => ({ team_id: standing.team_id })));
  const defenseRanks = buildRankMap(defenseRows.map((standing) => ({ team_id: standing.team_id })));
  const commitmentRanks = buildRankMap(commitmentRows.map((standing) => ({ team_id: standing.team_id })));

  const bumpTeams = normalizedStandings.map((standing) => {
    const team = teamsById.get(standing.team_id);
    const commitmentEntry = commitmentByTeamId.get(standing.team_id);

    return {
      teamId: standing.team_id,
      teamName: standing.team_name,
      teamSlug: team?.slug || standing.team_id,
      logoUrl: team?.logo_url || team?.logo || standing.team_logo || null,
      primaryColor: team ? resolveTeamPrimaryColor(team) : 'var(--league-primary)',
      divisionId: team?.division_id || standing.division_id || null,
      metrics: {
        overall: {
          rank: overallRanks.get(standing.team_id) || totalTeams,
          value: standing.points,
          valueLabel: `${standing.points} pts`,
        },
        offense: {
          rank: offenseRanks.get(standing.team_id) || totalTeams,
          value: standing.goals_for,
          valueLabel: `${standing.goals_for} GF`,
        },
        defense: {
          rank: defenseRanks.get(standing.team_id) || totalTeams,
          value: standing.goals_against,
          valueLabel: `${standing.goals_against} GA`,
        },
        commitment: {
          rank: commitmentRanks.get(standing.team_id) || totalTeams,
          value: roundMetric(commitmentEntry?.attendancePct ?? 0, 1),
          valueLabel: `${roundMetric(commitmentEntry?.attendancePct ?? 0, 1)}%`,
        },
      },
    } satisfies TeamsDirectoryBumpChartTeam;
  });

  return {
    seasonId,
    totalTeams,
    attendanceSource: 'confirmed-plus-fallback-roster-appearances',
    teams: bumpTeams,
  };
}
