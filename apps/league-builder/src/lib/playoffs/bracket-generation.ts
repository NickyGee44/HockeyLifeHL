export type PlayoffGenerationConfig = {
  playoffTeamsTotal?: number | null;
  playoffTeamsPerDivision?: number | null;
  useDivisionPlayoffs?: boolean | null;
};

export type PlayoffStandingRow = {
  team_id: string;
  team_name?: string | null;
  division_id?: string | null;
  division_name?: string | null;
};

export type GeneratedPlayoffSeriesSeed = {
  division_id: string | null;
  round_number: number;
  series_number: number;
  high_seed_id: string | null;
  low_seed_id: string | null;
  high_seed_wins: number;
  low_seed_wins: number;
  winner_id: string | null;
  status: 'pending' | 'completed';
};

export type GeneratedPlayoffScope = {
  divisionId: string | null;
  divisionName: string | null;
  playoffTeamCount: number;
  totalRounds: number;
  series: GeneratedPlayoffSeriesSeed[];
};

type BracketTeam = {
  teamId: string;
};

type ResolvedSeries = {
  winner: BracketTeam | null;
  series: GeneratedPlayoffSeriesSeed;
};

function getBracketSize(teamCount: number) {
  return Math.pow(2, Math.ceil(Math.log2(teamCount)));
}

function createRoundOneSeries(
  teams: BracketTeam[],
  divisionId: string | null,
  bracketSize: number,
): ResolvedSeries[] {
  const firstRoundMatchups = bracketSize / 2;
  const round: ResolvedSeries[] = [];

  for (let i = 0; i < firstRoundMatchups; i++) {
    const highSeed = teams[i] ?? null;
    const lowSeed = teams[bracketSize - 1 - i] ?? null;
    const winner = highSeed && !lowSeed
      ? highSeed
      : !highSeed && lowSeed
        ? lowSeed
        : null;

    round.push({
      winner,
      series: {
        division_id: divisionId,
        round_number: 1,
        series_number: i + 1,
        high_seed_id: highSeed?.teamId ?? null,
        low_seed_id: lowSeed?.teamId ?? null,
        high_seed_wins: 0,
        low_seed_wins: 0,
        winner_id: winner?.teamId ?? null,
        status: winner ? 'completed' : 'pending',
      },
    });
  }

  return round;
}

function createLaterRoundSeries(
  previousRound: ResolvedSeries[],
  divisionId: string | null,
  roundNumber: number,
): ResolvedSeries[] {
  const nextRound: ResolvedSeries[] = [];

  for (let i = 0; i < previousRound.length; i += 2) {
    const highSource = previousRound[i];
    const lowSource = previousRound[i + 1];

    nextRound.push({
      winner: null,
      series: {
        division_id: divisionId,
        round_number: roundNumber,
        series_number: Math.floor(i / 2) + 1,
        high_seed_id: highSource?.winner?.teamId ?? null,
        low_seed_id: lowSource?.winner?.teamId ?? null,
        high_seed_wins: 0,
        low_seed_wins: 0,
        winner_id: null,
        status: 'pending',
      },
    });
  }

  return nextRound;
}

function createScopeSeries(
  rows: PlayoffStandingRow[],
  divisionId: string | null,
): GeneratedPlayoffScope {
  const teams: BracketTeam[] = rows.map((row) => ({
    teamId: row.team_id,
  }));
  const bracketSize = getBracketSize(teams.length);
  const totalRounds = Math.log2(bracketSize);
  const divisionName = rows[0]?.division_name ?? null;

  const rounds: ResolvedSeries[][] = [];
  rounds.push(createRoundOneSeries(teams, divisionId, bracketSize));

  for (let roundNumber = 2; roundNumber <= totalRounds; roundNumber++) {
    rounds.push(createLaterRoundSeries(rounds[roundNumber - 2], divisionId, roundNumber));
  }

  return {
    divisionId,
    divisionName,
    playoffTeamCount: rows.length,
    totalRounds,
    series: rounds.flatMap((round) => round.map((entry) => entry.series)),
  };
}

function groupStandingsByDivision(rows: PlayoffStandingRow[]) {
  const divisions = new Map<string, PlayoffStandingRow[]>();

  for (const row of rows) {
    if (!row.division_id) {
      continue;
    }

    const existing = divisions.get(row.division_id) ?? [];
    existing.push(row);
    divisions.set(row.division_id, existing);
  }

  return [...divisions.entries()]
    .map(([divisionId, divisionRows]) => ({
      divisionId,
      divisionName: divisionRows[0]?.division_name ?? 'Unnamed Division',
      rows: divisionRows,
    }))
    .sort((a, b) => a.divisionName.localeCompare(b.divisionName));
}

export function buildGeneratedPlayoffScopes(
  standings: PlayoffStandingRow[],
  config: PlayoffGenerationConfig,
): { success: true; data: GeneratedPlayoffScope[] } | { success: false; error: string } {
  if (standings.length === 0) {
    return { success: false, error: 'No standings data available. Make sure games have been played.' };
  }

  const divisionGroups = groupStandingsByDivision(standings);
  const useDivisionPlayoffs = !!config.useDivisionPlayoffs && divisionGroups.length > 0;

  if (!useDivisionPlayoffs) {
    const playoffCount = config.playoffTeamsTotal ?? Math.min(8, standings.length);
    const playoffTeams = standings.slice(0, playoffCount);

    if (playoffTeams.length < 2) {
      return { success: false, error: 'Need at least 2 teams for playoffs' };
    }

    return {
      success: true,
      data: [createScopeSeries(playoffTeams, null)],
    };
  }

  const scopes: GeneratedPlayoffScope[] = [];

  for (const division of divisionGroups) {
    const playoffCount = config.playoffTeamsPerDivision
      ?? config.playoffTeamsTotal
      ?? Math.min(8, division.rows.length);
    const playoffTeams = division.rows.slice(0, playoffCount);

    if (playoffTeams.length < 2) {
      return {
        success: false,
        error: `${division.divisionName} needs at least 2 teams with standings to generate playoffs.`,
      };
    }

    scopes.push(createScopeSeries(playoffTeams, division.divisionId));
  }

  if (scopes.length === 0) {
    return { success: false, error: 'No division standings are available to generate playoffs.' };
  }

  return { success: true, data: scopes };
}
