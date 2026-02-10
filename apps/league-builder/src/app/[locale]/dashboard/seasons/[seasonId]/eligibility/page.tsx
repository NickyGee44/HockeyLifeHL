/**
 * Season Playoff Eligibility Page
 *
 * Admin view for all teams' eligibility overview with manual GP overrides.
 */

import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EligibilityDashboard } from './EligibilityDashboard';

type Props = {
  params: Promise<{ locale: string; seasonId: string }>;
};

async function getSeasonEligibilityData(seasonId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get season with league info
  // Columns created by migration - cast needed until types are regenerated
  const { data: season } = await supabase
    .from('seasons')
    .select(`
      id,
      name,
      league:leagues(id, name, slug)
    `)
    .eq('id', seasonId)
    .single();

  if (!season) return null;

  const seasonAny = season as any;

  // Get eligibility data via RPC
  const { data: eligibility } = await (supabase.rpc as any)('get_playoff_eligibility', {
    p_season_id: seasonId,
    p_team_id: null,
  });

  // Get teams for this season
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .eq('league_id', (season.league as any).id);

  // Get roster IDs for GP override mapping
  const { data: rosters } = await supabase
    .from('team_rosters')
    .select('id, player_id, team_id')
    .eq('season_id', seasonId)
    .eq('status', 'active') as any;

  return {
    season,
    eligibility: eligibility ?? [],
    teams: teams ?? [],
    rosters: (rosters ?? []).map((r: any) => ({ ...r, games_played_override: r.games_played_override ?? null })),
  };
}

export default async function EligibilityPage({ params }: Props) {
  const { locale, seasonId } = await params;
  setRequestLocale(locale);

  const data = await getSeasonEligibilityData(seasonId);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Playoff Eligibility</h1>
        <p className="text-muted-foreground">
          {data.season.name} — View and manage playoff eligibility for all teams
        </p>
      </div>

      <EligibilityDashboard
        seasonId={seasonId}
        seasonName={data.season.name}
        minGamesPct={(data.season as any).playoff_eligibility_min_games_pct ?? null}
        minGames={(data.season as any).playoff_eligibility_min_games ?? null}
        eligibility={data.eligibility}
        teams={data.teams}
        rosters={data.rosters}
      />
    </div>
  );
}
