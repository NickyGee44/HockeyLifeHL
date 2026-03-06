'use server';

import { createClient } from '@/lib/supabase/server';
import { getStandings } from '@/lib/data';
import {
  buildPlayoffPreview,
  type PlayoffPreview,
  type PreviewTeam,
} from '@/lib/playoffs/preview';

export type { PlayoffPreview, PreviewTeam } from '@/lib/playoffs/preview';

export async function previewPlayoffSeeding(
  leagueId: string,
  seasonId: string,
  divisionId?: string | null,
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

  return buildPlayoffPreview(
    standings,
    {
      playoffTeamsTotal: config?.playoff_teams_total,
      playoffTeamsPerDivision: config?.playoff_teams_per_division,
      useDivisionPlayoffs: config?.use_division_playoffs,
    },
    divisionId,
  );
}
