import { setRequestLocale } from 'next-intl/server';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import {
  getLeagueFinanceDashboardData,
  getLeagueFinanceLedger,
  getQuickBooksIntegrationStatus,
} from '@/lib/actions/league-finance';
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
  const sourceParam = typeof search?.source === 'string' ? search.source : 'all';
  const statusParam = typeof search?.status === 'string' ? search.status : 'all';
  const queryParam = typeof search?.q === 'string' ? search.q : '';
  const includeArchived = search?.archived === '1';
  const pageParam = Math.max(1, Number(typeof search?.page === 'string' ? search.page : '1') || 1);
  const qbParam = typeof search?.qb === 'string' ? search.qb : null;
  const qbErrorParam = typeof search?.qb_error === 'string' ? search.qb_error : null;
  const limit = 50;

  const [dataResult, ledgerResult, quickBooksResult] = await Promise.all([
    getLeagueFinanceDashboardData(leagueId, seasonParam),
    getLeagueFinanceLedger(leagueId, {
      seasonId: seasonParam,
      source: sourceParam as any,
      status: statusParam,
      query: queryParam,
      includeArchived,
      limit,
      offset: (pageParam - 1) * limit,
    }),
    getQuickBooksIntegrationStatus(leagueId),
  ]);

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

  const quickBooksToast = qbErrorParam
    ? { type: 'error' as const, message: qbErrorParam }
    : qbParam === 'connected'
      ? { type: 'success' as const, message: 'QuickBooks Online connected.' }
      : qbParam === 'disconnected'
        ? { type: 'success' as const, message: 'QuickBooks Online disconnected.' }
        : null;

  return (
    <FinanceDashboard
      locale={locale}
      leagueId={leagueId}
      requestedSeason={seasonParam || dataResult.data.selectedSeason?.id || 'all'}
      data={dataResult.data}
      ledgerRows={ledgerResult.success ? ledgerResult.data.rows : []}
      ledgerTotal={ledgerResult.success ? ledgerResult.data.total : 0}
      ledgerPage={pageParam}
      ledgerLimit={limit}
      ledgerFilters={{
        source: sourceParam as any,
        status: statusParam,
        query: queryParam,
        includeArchived,
      }}
      ledgerError={ledgerResult.success ? null : ledgerResult.error}
      quickBooksStatus={
        quickBooksResult.success
          ? quickBooksResult.data
          : {
              available: false,
              configurationMessage: quickBooksResult.error,
              canManage: false,
              connection: null,
              mappings: null,
              missingMappings: [],
              recentRuns: [],
            }
      }
      quickBooksToast={quickBooksToast}
    />
  );
}
