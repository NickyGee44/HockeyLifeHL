import { setRequestLocale } from 'next-intl/server';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { getLeagueFinanceDashboardData } from '@/lib/actions/league-finance';
import { FinanceDashboard } from './FinanceDashboard';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LeagueFinancePage({ params, searchParams }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  await requireLeagueDashboardAccess({ leagueId, locale });

  const search = await searchParams;
  const seasonParam = typeof search?.season === 'string' ? search.season : undefined;

  const dataResult = await getLeagueFinanceDashboardData(leagueId, seasonParam);

  if (!dataResult.success) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Finance dashboard unavailable</h1>
          <p className="mt-2 text-sm text-neutral-400">{dataResult.error}</p>
        </div>
      </div>
    );
  }

  return (
    <FinanceDashboard
      locale={locale}
      leagueId={leagueId}
      requestedSeason={seasonParam || dataResult.data.selectedSeason?.id || 'all'}
      data={dataResult.data}
    />
  );
}
