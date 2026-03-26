import { notFound } from 'next/navigation';
import type {
  LeagueFinanceDashboardData,
  LeagueFinanceLedgerRow,
  LeagueFinanceLedgerSource,
  QuickBooksIntegrationStatus,
} from '@/lib/actions/league-finance';
import {
  getLeagueFinanceDashboardData,
  getLeagueFinanceLedger,
  getQuickBooksIntegrationStatus,
} from '@/lib/actions/league-finance';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import type { BillingReadiness } from '@/lib/payments/billing-readiness';
import { getBillingReadiness } from '@/lib/payments/billing-readiness';
import { getLeaguePlayerPayments, getPaymentSummary } from '@/lib/payments/payment-actions';
import { reconcileSeasonRegistrationFees } from '@/lib/payments/registration-fee-reconciliation';
import type { PlayerPaymentStatus, PlayerPaymentWithDetails, PaymentSummary } from '@/lib/payments/types';
import { pickOperationalSeason } from '@/lib/seasons/operational';

type SearchParams = { [key: string]: string | string[] | undefined };
type WorkspaceTab = 'overview' | 'payments' | 'accounting';
type WorkspaceRoute = 'finance' | 'payments';

type SeasonRecord = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

type TeamRecord = {
  id: string;
  name: string;
};

export interface WorkspaceLinkOption {
  value: string;
  label: string;
  href: string;
}

export interface FinancialWorkspaceCommonData {
  locale: string;
  leagueId: string;
  leagueName: string;
  activeTab: WorkspaceTab;
  route: WorkspaceRoute;
  viewerRole: 'owner' | 'admin';
  seasons: SeasonRecord[];
  selectedSeason: SeasonRecord | null;
  requestedSeason: string;
  seasonOptions: WorkspaceLinkOption[];
  tabLinks: Record<WorkspaceTab, string>;
  billingReadiness: BillingReadiness;
}

export interface FinancialWorkspaceOverviewData {
  financeData: LeagueFinanceDashboardData;
  recentLedgerRows: LeagueFinanceLedgerRow[];
  quickBooksStatus: QuickBooksIntegrationStatus;
}

export interface FinancialWorkspacePaymentsData {
  payments: PlayerPaymentWithDetails[];
  summary: PaymentSummary | null;
  total: number;
  currentPage: number;
  limit: number;
  statusFilter?: string;
  includeArchived: boolean;
  teams: TeamRecord[];
  focusedPayment: PlayerPaymentWithDetails | null;
}

export interface FinancialWorkspaceAccountingData {
  data: LeagueFinanceDashboardData;
  ledgerRows: LeagueFinanceLedgerRow[];
  ledgerTotal: number;
  ledgerPage: number;
  ledgerLimit: number;
  ledgerFilters: {
    source: LeagueFinanceLedgerSource | 'all';
    status: string;
    query: string;
    includeArchived: boolean;
  };
  ledgerError: string | null;
  quickBooksStatus: QuickBooksIntegrationStatus;
  quickBooksToast: { type: 'success' | 'error'; message: string } | null;
}

export interface FinancialWorkspaceData {
  common: FinancialWorkspaceCommonData;
  overview?: FinancialWorkspaceOverviewData;
  payments?: FinancialWorkspacePaymentsData;
  accounting?: FinancialWorkspaceAccountingData;
}

function asString(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function withQuery(basePath: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

const PAYMENT_STATUS_VALUES: PlayerPaymentStatus[] = [
  'pending',
  'processing',
  'paid',
  'partially_paid',
  'overdue',
  'refunded',
  'partially_refunded',
  'cancelled',
  'failed',
  'disputed',
];

function buildFinanceParams(
  seasonValue: string,
  tab: Extract<WorkspaceTab, 'overview' | 'accounting'>,
  search: SearchParams
) {
  const params = new URLSearchParams();
  if (seasonValue !== 'all') {
    params.set('season', seasonValue);
  }

  const source = asString(search.source);
  const status = asString(search.status);
  const query = asString(search.q);
  const includeArchived = search.archived === '1';

  if (tab === 'accounting') {
    params.set('tab', 'accounting');
  }
  if (source && source !== 'all') {
    params.set('source', source);
  }
  if (status && status !== 'all') {
    params.set('status', status);
  }
  if (query?.trim()) {
    params.set('q', query.trim());
  }
  if (includeArchived) {
    params.set('archived', '1');
  }

  return params;
}

function buildPaymentsParams(
  seasonValue: string,
  search: SearchParams,
  preserveStatus = true
) {
  const params = new URLSearchParams();
  if (seasonValue) {
    params.set('season', seasonValue);
  }

  const status = asString(search.status);
  if (preserveStatus && status && PAYMENT_STATUS_VALUES.includes(status as PlayerPaymentStatus)) {
    params.set('status', status);
  }

  if (search.archived === '1') {
    params.set('archived', '1');
  }

  const payment = asString(search.payment);
  if (payment) {
    params.set('payment', payment);
  }

  const page = asString(search.page);
  if (page && page !== '1') {
    params.set('page', page);
  }

  return params;
}

export async function getFinancialWorkspaceData({
  leagueId,
  locale,
  route,
  searchParams,
}: {
  leagueId: string;
  locale: string;
  route: WorkspaceRoute;
  searchParams: SearchParams | undefined;
}): Promise<FinancialWorkspaceData> {
  const search = searchParams ?? {};
  const { supabase, userData } = await requireLeagueDashboardAccess({ leagueId, locale });

  const [leagueResult, membershipResult, seasonsResult, teamsResult, billingReadiness] =
    await Promise.all([
      supabase.from('leagues').select('id, name').eq('id', leagueId).single(),
      supabase
        .from('league_memberships')
        .select('role')
        .eq('league_id', leagueId)
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('seasons')
        .select('id, name, status, start_date, end_date')
        .eq('league_id', leagueId)
        .order('start_date', { ascending: false }),
      route === 'payments'
        ? supabase.from('teams').select('id, name').eq('league_id', leagueId).order('name')
        : Promise.resolve({ data: [] as TeamRecord[] }),
      getBillingReadiness(leagueId),
    ]);

  if (leagueResult.error || !leagueResult.data) {
    notFound();
  }

  const seasons = (seasonsResult.data || []).map((season) => ({
    ...season,
    status: season.status ?? 'draft',
  }));

  const selectedSeasonForPayments =
    seasons.find((season) => season.id === asString(search.season)) ||
    pickOperationalSeason(seasons) ||
    seasons[0] ||
    null;

  const financeSeasonParam = asString(search.season);
  const requestedFinanceSeason = financeSeasonParam || 'all';

  const basePath = `/${locale}/dashboard/leagues/${leagueId}`;
  const overviewHref = withQuery(
    `${basePath}/finance`,
    buildFinanceParams(
      route === 'payments' ? selectedSeasonForPayments?.id || 'all' : requestedFinanceSeason,
      'overview',
      route === 'finance' ? search : {}
    )
  );
  const accountingHref = withQuery(
    `${basePath}/finance`,
    buildFinanceParams(
      route === 'payments' ? selectedSeasonForPayments?.id || 'all' : requestedFinanceSeason,
      'accounting',
      route === 'finance' ? search : {}
    )
  );
  const paymentsHref = withQuery(
    `${basePath}/payments`,
    buildPaymentsParams(
      selectedSeasonForPayments?.id ||
        (route === 'finance' && requestedFinanceSeason !== 'all' ? requestedFinanceSeason : ''),
      route === 'payments' ? search : {},
      route === 'payments'
    )
  );

  const activeTab: WorkspaceTab =
    route === 'payments'
      ? 'payments'
      : asString(search.tab) === 'accounting'
        ? 'accounting'
        : 'overview';

  const common: FinancialWorkspaceCommonData = {
    locale,
    leagueId,
    leagueName: leagueResult.data.name,
    activeTab,
    route,
    viewerRole: membershipResult.data?.role === 'owner' ? 'owner' : 'admin',
    seasons,
    selectedSeason: route === 'payments' ? selectedSeasonForPayments : null,
    requestedSeason:
      route === 'payments' ? selectedSeasonForPayments?.id || '' : requestedFinanceSeason,
    seasonOptions:
      route === 'finance'
        ? [
            {
              value: 'all',
              label: 'All seasons',
              href: withQuery(
                `${basePath}/finance`,
                buildFinanceParams('all', activeTab === 'accounting' ? 'accounting' : 'overview', search)
              ),
            },
            ...seasons.map((season) => ({
              value: season.id,
              label: season.name,
              href: withQuery(
                `${basePath}/${
                  activeTab === 'payments' ? 'payments' : 'finance'
                }`,
                activeTab === 'payments'
                  ? buildPaymentsParams(season.id, search)
                  : buildFinanceParams(season.id, activeTab === 'accounting' ? 'accounting' : 'overview', search)
              ),
            })),
          ]
        : seasons.map((season) => ({
            value: season.id,
            label: season.name,
            href: withQuery(`${basePath}/payments`, buildPaymentsParams(season.id, search)),
          })),
    tabLinks: {
      overview: overviewHref,
      payments: paymentsHref,
      accounting: accountingHref,
    },
    billingReadiness,
  };

  if (route === 'payments') {
    let payments: PlayerPaymentWithDetails[] = [];
    let total = 0;
    let summary: PaymentSummary | null = null;
    let focusedPayment: PlayerPaymentWithDetails | null = null;

    const statusFilter = asString(search.status);
    const includeArchived = search.archived === '1';
    const page = Math.max(1, Number(asString(search.page) || '1') || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    if (selectedSeasonForPayments) {
      await reconcileSeasonRegistrationFees(leagueId, selectedSeasonForPayments.id);

      const [paymentsResult, summaryResult] = await Promise.all([
        getLeaguePlayerPayments(leagueId, {
          seasonId: selectedSeasonForPayments.id,
          status: statusFilter,
          limit,
          offset,
          includeArchived,
        }),
        getPaymentSummary(leagueId, selectedSeasonForPayments.id),
      ]);

      if (paymentsResult.success) {
        payments = paymentsResult.data.payments;
        total = paymentsResult.data.total;
      }

      if (summaryResult.success) {
        summary = summaryResult.data;
      }

      const focusedPaymentId = asString(search.payment);
      if (focusedPaymentId) {
        const focusedPaymentResult = await supabase
          .from('player_payments')
          .select(
            `
            *,
            player:player_id (id, full_name, email, avatar_url),
            season_fee:season_fee_id (id, name, amount_cents),
            team:team_id (id, name, short_name)
          `
          )
          .eq('id', focusedPaymentId)
          .eq('league_id', leagueId)
          .eq('season_id', selectedSeasonForPayments.id)
          .maybeSingle();

        if (!focusedPaymentResult.error && focusedPaymentResult.data) {
          const paymentRow = focusedPaymentResult.data as unknown as PlayerPaymentWithDetails;
          if (includeArchived || !paymentRow.archived_at) {
            focusedPayment = paymentRow;
          }
        }
      }
    }

    return {
      common,
      payments: {
        payments,
        summary,
        total,
        currentPage: page,
        limit,
        statusFilter,
        includeArchived,
        teams: teamsResult.data || [],
        focusedPayment,
      },
    };
  }

  const ledgerSource = asString(search.source) || 'all';
  const ledgerStatus = asString(search.status) || 'all';
  const ledgerQuery = asString(search.q) || '';
  const ledgerArchived = search.archived === '1';
  const ledgerPage = Math.max(1, Number(asString(search.page) || '1') || 1);
  const ledgerLimit = 50;
  const quickBooksToast = asString(search.qb_error)
    ? { type: 'error' as const, message: asString(search.qb_error)! }
    : asString(search.qb) === 'connected'
      ? { type: 'success' as const, message: 'QuickBooks Online connected.' }
      : asString(search.qb) === 'disconnected'
        ? { type: 'success' as const, message: 'QuickBooks Online disconnected.' }
        : null;

  const [financeDataResult, recentLedgerResult, quickBooksResult, accountingLedgerResult] =
    await Promise.all([
      getLeagueFinanceDashboardData(leagueId, financeSeasonParam),
      getLeagueFinanceLedger(leagueId, {
        seasonId: financeSeasonParam,
        limit: 6,
        offset: 0,
      }),
      getQuickBooksIntegrationStatus(leagueId),
      activeTab === 'accounting'
        ? getLeagueFinanceLedger(leagueId, {
            seasonId: financeSeasonParam,
            source: ledgerSource as LeagueFinanceLedgerSource | 'all',
            status: ledgerStatus,
            query: ledgerQuery,
            includeArchived: ledgerArchived,
            limit: ledgerLimit,
            offset: (ledgerPage - 1) * ledgerLimit,
          })
        : Promise.resolve({ success: true as const, data: { rows: [], total: 0 } }),
    ]);

  if (!financeDataResult.success) {
    throw new Error(financeDataResult.error);
  }

  const quickBooksStatus = quickBooksResult.success
    ? quickBooksResult.data
    : {
        available: false,
        configurationMessage: quickBooksResult.error,
        canManage: false,
        connection: null,
        mappings: null,
        missingMappings: [],
        recentRuns: [],
      };

  return {
    common,
    overview: {
      financeData: financeDataResult.data,
      recentLedgerRows: recentLedgerResult.success ? recentLedgerResult.data.rows : [],
      quickBooksStatus,
    },
    accounting: {
      data: financeDataResult.data,
      ledgerRows: accountingLedgerResult.success ? accountingLedgerResult.data.rows : [],
      ledgerTotal: accountingLedgerResult.success ? accountingLedgerResult.data.total : 0,
      ledgerPage,
      ledgerLimit,
      ledgerFilters: {
        source: ledgerSource as LeagueFinanceLedgerSource | 'all',
        status: ledgerStatus,
        query: ledgerQuery,
        includeArchived: ledgerArchived,
      },
      ledgerError: accountingLedgerResult.success ? null : accountingLedgerResult.error,
      quickBooksStatus,
      quickBooksToast,
    },
  };
}
