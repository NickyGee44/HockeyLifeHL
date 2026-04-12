import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';
import { getStandingsConfig } from '@/lib/standings/actions';
import { StandingsPageClient } from '@/components/dashboard/seasons/StandingsPageClient';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonStandingsPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const [{ data: league }, { data: season }, { data: divisions }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).maybeSingle(),
    supabase.from('seasons').select('id, name').eq('id', seasonId).eq('league_id', leagueId).maybeSingle(),
    supabase.from('divisions').select('id, name').eq('league_id', leagueId).order('name'),
  ]);

  if (!league || !season) {
    notFound();
  }

  const config = await getStandingsConfig(seasonId);

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
              <Trophy className="w-5 h-5 text-rink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Standings</h1>
              <p className="text-neutral-400 text-sm">{league.name} • {season.name}</p>
            </div>
          </div>
        </div>

        <StandingsPageClient
          seasonId={seasonId}
          leagueId={leagueId}
          config={config}
          divisions={divisions ?? []}
          hasDivisions={(divisions ?? []).length > 0}
        />
      </div>
    </div>
  );
}
