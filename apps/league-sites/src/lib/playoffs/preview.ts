export interface PreviewTeam {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  points: number;
  rank: number;
  divisionId: string | null;
  divisionName: string | null;
}

export interface PreviewSeries {
  seriesNumber: number;
  highSeed: PreviewTeam | null;
  lowSeed: PreviewTeam | null;
}

export interface PlayoffPreviewDivisionOption {
  id: string;
  name: string;
  teamCount: number;
}

export interface PlayoffPreviewContext {
  availableDivisions: PlayoffPreviewDivisionOption[];
  requiresDivisionSelection: boolean;
  totalTeams: number;
}

export interface PlayoffPreview {
  bracketSize: number;
  totalRounds: number;
  playoffTeamCount: number;
  firstRound: PreviewSeries[];
  useDivisionPlayoffs: boolean;
  divisionId: string | null;
  divisionName: string | null;
}

export interface PlayoffPreviewConfig {
  playoffTeamsTotal?: number | null;
  playoffTeamsPerDivision?: number | null;
  useDivisionPlayoffs?: boolean | null;
}

export interface PreviewStandingsRow {
  team_id: string;
  team_name: string;
  team_logo: string | null;
  points: number;
  division_id?: string | null;
  division_name?: string | null;
}

function sortStandings(rows: PreviewStandingsRow[]): PreviewStandingsRow[] {
  return [...rows].sort((a, b) => b.points - a.points);
}

export function buildPlayoffPreviewContext(
  standings: PreviewStandingsRow[],
): PlayoffPreviewContext {
  const divisionMap = new Map<string, PlayoffPreviewDivisionOption>();

  for (const row of standings) {
    if (!row.division_id) {
      continue;
    }

    const existing = divisionMap.get(row.division_id);
    if (existing) {
      existing.teamCount += 1;
      continue;
    }

    divisionMap.set(row.division_id, {
      id: row.division_id,
      name: row.division_name || 'Unnamed Division',
      teamCount: 1,
    });
  }

  const availableDivisions = [...divisionMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    availableDivisions,
    requiresDivisionSelection: availableDivisions.length > 1,
    totalTeams: standings.length,
  };
}

export function buildPlayoffPreview(
  standings: PreviewStandingsRow[],
  config: PlayoffPreviewConfig,
  divisionId?: string | null,
): { success: true; data: PlayoffPreview } | { success: false; error: string } {
  const sortedStandings = sortStandings(standings);
  const context = buildPlayoffPreviewContext(sortedStandings);

  if (sortedStandings.length === 0) {
    return { success: false, error: 'No standings data available yet — games need to be played first.' };
  }

  if (context.requiresDivisionSelection && !divisionId) {
    return { success: false, error: 'Select a division to preview playoff seeding.' };
  }

  const selectedDivision = divisionId
    ? context.availableDivisions.find((division) => division.id === divisionId) ?? null
    : null;

  if (divisionId && !selectedDivision) {
    return { success: false, error: 'Selected division was not found in the current standings.' };
  }

  const scopedStandings = selectedDivision
    ? sortedStandings.filter((row) => row.division_id === selectedDivision.id)
    : sortedStandings;

  const playoffLimit = selectedDivision
    ? config.playoffTeamsPerDivision ?? config.playoffTeamsTotal ?? Math.min(8, scopedStandings.length)
    : config.playoffTeamsTotal ?? Math.min(8, scopedStandings.length);

  const playoffTeams = scopedStandings.slice(0, playoffLimit).map((row, index) => ({
    teamId: row.team_id,
    teamName: row.team_name,
    logoUrl: row.team_logo,
    points: row.points,
    rank: index + 1,
    divisionId: row.division_id ?? null,
    divisionName: row.division_name ?? null,
  }));

  if (playoffTeams.length < 2) {
    const prefix = selectedDivision ? `${selectedDivision.name} needs` : 'Need';
    return { success: false, error: `${prefix} at least 2 teams with standings to preview seeding.` };
  }

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(playoffTeams.length)));
  const totalRounds = Math.log2(bracketSize);
  const firstRoundMatchups = bracketSize / 2;

  const firstRound: PreviewSeries[] = [];
  for (let i = 0; i < firstRoundMatchups; i++) {
    firstRound.push({
      seriesNumber: i + 1,
      highSeed: playoffTeams[i] ?? null,
      lowSeed: playoffTeams[bracketSize - 1 - i] ?? null,
    });
  }

  return {
    success: true,
    data: {
      bracketSize,
      totalRounds,
      playoffTeamCount: playoffTeams.length,
      firstRound,
      useDivisionPlayoffs: !!selectedDivision || !!config.useDivisionPlayoffs,
      divisionId: selectedDivision?.id ?? null,
      divisionName: selectedDivision?.name ?? null,
    },
  };
}
