'use server';

import { createClient } from '@/lib/supabase/server';
import { getStandings } from '@/lib/data';

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
  highSeed: PreviewTeam | null; // null = BYE
  lowSeed: PreviewTeam | null;  // null = BYE
}

export interface PlayoffPreview {
  bracketSize: number;
  totalRounds: number;
  playoffTeamCount: number;
  firstRound: PreviewSeries[];
  useDivisionPlayoffs: boolean;
}

export async function previewPlayoffSeeding(
  leagueId: string,
  seasonId: string
): Promise<{ success: true; data: PlayoffPreview } | { success: false; error: string }> {
  const supabase = await createClient();

  // Fetch standings config
  const { data: config } = await supabase
    .from('standings_config')
    .select('playoff_teams_total, use_division_playoffs, playoff_teams_per_division')
    .eq('season_id', seasonId)
    .maybeSingle();

  // Fetch current standings — already sorted by points desc, enriched with names/logos/divisions
  const standings = await getStandings(leagueId, seasonId);

  if (!standings || standings.length === 0) {
    return { success: false, error: 'No standings data available yet — games need to be played first.' };
  }

  const totalLimit = config?.playoff_teams_total ?? Math.min(8, standings.length);
  const playoffTeams = standings.slice(0, totalLimit).map((row, idx) => ({
    teamId: row.team_id,
    teamName: row.team_name,
    logoUrl: row.team_logo,
    points: row.points,
    rank: idx + 1,
    divisionId: row.division_id ?? null,
    divisionName: row.division_name ?? null,
  }));

  if (playoffTeams.length < 2) {
    return { success: false, error: 'Need at least 2 teams with standings to preview seeding.' };
  }

  // Same algorithm as generatePlayoffBracket: 1 vs N, 2 vs N-1, ...
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
      useDivisionPlayoffs: false,
    },
  };
}
