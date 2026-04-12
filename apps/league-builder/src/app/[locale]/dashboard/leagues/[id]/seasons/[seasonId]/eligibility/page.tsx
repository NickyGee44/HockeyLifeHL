import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';
import { getPlayoffEligibility } from '@/lib/actions/playoff-eligibility';
import { EligibilityDashboard } from '@/app/[locale]/dashboard/seasons/[seasonId]/eligibility/EligibilityDashboard';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonEligibilityPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const [{ data: league }, { data: season }, eligibilityResult, { data: teams }, { data: rosters }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).maybeSingle(),
    supabase
      .from('seasons')
      .select('id, name, playoff_eligibility_min_games_pct, playoff_eligibility_min_games')
      .eq('id', seasonId)
      .eq('league_id', leagueId)
      .maybeSingle(),
    getPlayoffEligibility(seasonId),
    supabase.from('teams').select('id, name, short_name').eq('league_id', leagueId).order('name'),
    supabase
      .from('team_rosters')
      .select('id, player_id, team_id, games_played_override')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .is('end_date', null),
  ]);

  if (!league || !season) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <Link
            href={buildSeasonWorkspaceHref(locale, leagueId, seasonId)}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Season
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rink-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-rink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Playoff Eligibility</h1>
              <p className="text-neutral-400 text-sm">{league.name} • {season.name}</p>
            </div>
          </div>
        </div>

        <EligibilityDashboard
          seasonId={seasonId}
          seasonName={season.name}
          minGamesPct={season.playoff_eligibility_min_games_pct}
          minGames={season.playoff_eligibility_min_games}
          eligibility={eligibilityResult.success ? eligibilityResult.data : []}
          teams={teams ?? []}
          rosters={rosters ?? []}
        />
      </div>
    </div>
  );
}
