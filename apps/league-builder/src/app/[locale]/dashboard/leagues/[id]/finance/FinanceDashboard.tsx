'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Landmark,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Receipt,
  Search,
  Trash2,
  Unplug,
} from 'lucide-react';
import type {
  CreateLeagueFinanceCustomItemInput,
  LeagueFinanceDashboardData,
  LeagueFinanceLedgerRow,
  LeagueFinanceLedgerSource,
  QuickBooksIntegrationStatus,
  QuickBooksJournalPreview,
  QuickBooksMappingOptions,
  QuickBooksMappingSelectionInput,
  QuickBooksMappingSlot,
  QuickBooksSyncEntry,
} from '@/lib/actions/league-finance';
import {
  createLeagueFinanceCustomItem,
  deleteLeagueFinanceCustomItem,
  disconnectQuickBooks,
  exportLeagueFinanceQuickBooksCsv,
  getQuickBooksMappingOptions,
  previewQuickBooksJournalSync,
  saveQuickBooksMappings,
  startQuickBooksConnect,
  syncQuickBooksJournalBatch,
} from '@/lib/actions/league-finance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FinanceDashboardProps {
  locale: string;
  leagueId: string;
  requestedSeason: string;
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

type ManualItemFormState = {
  impactType: 'income' | 'expense' | 'neutral';
  seasonId: string;
  title: string;
  entryDate: string;
  amount: string;
  debitAccountName: string;
  creditAccountName: string;
  notes: string;
};

type ExportOptionsState = {
  registrationRevenueAccount: string;
  teamRevenueAccount: string;
  stripeClearingAccount: string;
  manualDepositAccount: string;
  processingFeesAccount: string;
  refereeExpenseAccount: string;
  refereePayableAccount: string;
  refereeCashAccount: string;
  defaultClassName: string;
  defaultLocationName: string;
  includePendingPayroll: boolean;
  includePaidPayroll: boolean;
  includeManualItems: boolean;
};

type QuickBooksMappingField = QuickBooksMappingSlot | 'defaultClass' | 'defaultLocation';

const QUICKBOOKS_MAPPING_LABELS: Record<QuickBooksMappingField, string> = {
  registrationRevenue: 'Registration revenue',
  teamRevenue: 'Team fee revenue',
  stripeClearing: 'Stripe clearing',
  manualDeposit: 'Manual deposit',
  processingFees: 'Processing fees',
  refereeExpense: 'Referee expense',
  refereePayable: 'Referee payable',
  refereeCash: 'Referee cash',
  defaultClass: 'Default class',
  defaultLocation: 'Default location',
};

const QUICKBOOKS_REQUIRED_MAPPING_FIELDS: QuickBooksMappingSlot[] = [
  'registrationRevenue',
  'teamRevenue',
  'stripeClearing',
  'manualDeposit',
  'processingFees',
  'refereeExpense',
  'refereePayable',
  'refereeCash',
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
}

function ledgerSourceLabel(source: LeagueFinanceLedgerSource) {
  switch (source) {
    case 'player_payment':
      return 'Player payment';
    case 'refund':
      return 'Refund';
    case 'team_invoice_payment':
      return 'Team invoice';
    case 'stripe_fee':
      return 'Stripe fee';
    case 'manual_item':
      return 'Manual item';
    case 'referee_payroll':
      return 'Referee payroll';
  }
}

function ledgerAmountClass(direction: LeagueFinanceLedgerRow['direction']) {
  if (direction === 'inflow') return 'text-emerald-300';
  if (direction === 'outflow') return 'text-red-200';
  return 'text-neutral-200';
}

function ledgerAmountPrefix(direction: LeagueFinanceLedgerRow['direction']) {
  if (direction === 'inflow') return '+';
  if (direction === 'outflow') return '-';
  return '';
}

function quickBooksSyncStatusClass(status: QuickBooksSyncEntry['status']) {
  switch (status) {
    case 'pending':
      return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
    case 'already_synced':
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
    case 'changed':
      return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
    case 'success':
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
    case 'failed':
    case 'error':
      return 'border-red-400/30 bg-red-400/10 text-red-100';
    default:
      return 'border-white/10 bg-white/[0.04] text-neutral-200';
  }
}

function quickBooksRunStatusClass(status: QuickBooksIntegrationStatus['recentRuns'][number]['status']) {
  switch (status) {
    case 'success':
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
    case 'partial':
      return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
    case 'failed':
      return 'border-red-400/30 bg-red-400/10 text-red-100';
    case 'syncing':
      return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
    default:
      return 'border-white/10 bg-white/[0.04] text-neutral-200';
  }
}

function buildQuickBooksMappingSelectionState(
  options: QuickBooksMappingOptions | null,
  fallback: QuickBooksIntegrationStatus['mappings']
) {
  const current = options?.current || fallback;
  return {
    registrationRevenue: current?.registrationRevenue?.id || '',
    teamRevenue: current?.teamRevenue?.id || '',
    stripeClearing: current?.stripeClearing?.id || '',
    manualDeposit: current?.manualDeposit?.id || '',
    processingFees: current?.processingFees?.id || '',
    refereeExpense: current?.refereeExpense?.id || '',
    refereePayable: current?.refereePayable?.id || '',
    refereeCash: current?.refereeCash?.id || '',
    defaultClass: current?.defaultClass?.id || '',
    defaultLocation: current?.defaultLocation?.id || '',
  } satisfies Record<QuickBooksMappingField, string>;
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FinanceDashboard({
  locale,
  leagueId,
  requestedSeason,
  data,
  ledgerRows,
  ledgerTotal,
  ledgerPage,
  ledgerLimit,
  ledgerFilters,
  ledgerError,
  quickBooksStatus,
  quickBooksToast,
}: FinanceDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCreatingItem, startCreateItem] = useTransition();
  const [isExporting, startExport] = useTransition();
  const [isConnectingQuickBooks, startConnectQuickBooks] = useTransition();
  const [isLoadingMappings, startLoadMappings] = useTransition();
  const [isSavingMappings, startSaveMappings] = useTransition();
  const [isPreviewingSync, startPreviewSync] = useTransition();
  const [isSyncingQuickBooks, startSyncQuickBooks] = useTransition();
  const [isDisconnectingQuickBooks, startDisconnectQuickBooks] = useTransition();
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [manualItemDialogOpen, setManualItemDialogOpen] = useState(false);
  const [quickBooksPreviewDialogOpen, setQuickBooksPreviewDialogOpen] = useState(false);
  const [quickBooksHistoryDialogOpen, setQuickBooksHistoryDialogOpen] = useState(false);
  const [quickBooksExportDialogOpen, setQuickBooksExportDialogOpen] = useState(false);
  const [mappingOptions, setMappingOptions] = useState<QuickBooksMappingOptions | null>(null);
  const [mappingSelectionIds, setMappingSelectionIds] = useState<Record<QuickBooksMappingField, string>>(
    buildQuickBooksMappingSelectionState(null, quickBooksStatus.mappings)
  );
  const [previewResult, setPreviewResult] = useState<QuickBooksJournalPreview | null>(null);

  const seasonNameById = useMemo(
    () => new Map(data.seasons.map((season) => [season.id, season.name])),
    [data.seasons]
  );

  const [manualItemForm, setManualItemForm] = useState<ManualItemFormState>({
    impactType: 'expense',
    seasonId: data.selectedSeason?.id || '',
    title: '',
    entryDate: new Date().toISOString().slice(0, 10),
    amount: '',
    debitAccountName: 'League Operations Expense',
    creditAccountName: 'Checking',
    notes: '',
  });

  const [exportOptions, setExportOptions] = useState<ExportOptionsState>({
    registrationRevenueAccount: 'Registration Revenue',
    teamRevenueAccount: 'Team Fee Revenue',
    stripeClearingAccount: 'Stripe Clearing',
    manualDepositAccount: 'Undeposited Funds',
    processingFeesAccount: 'Processing Fees',
    refereeExpenseAccount: 'Referee Payroll Expense',
    refereePayableAccount: 'Accounts Payable',
    refereeCashAccount: 'Checking',
    defaultClassName: data.selectedSeason?.name || '',
    defaultLocationName: '',
    includePendingPayroll: true,
    includePaidPayroll: true,
    includeManualItems: data.manualItemsAvailable,
  });
  const ledgerTotalPages = Math.max(1, Math.ceil(ledgerTotal / ledgerLimit));

  useEffect(() => {
    if (!quickBooksToast) {
      return;
    }

    if (quickBooksToast.type === 'error') {
      toast.error(quickBooksToast.message);
    } else {
      toast.success(quickBooksToast.message);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('qb');
    nextParams.delete('qb_error');
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl);
  }, [pathname, quickBooksToast, router, searchParams]);

  const updateLedgerFilters = (
    updates: Partial<{
      source: LeagueFinanceLedgerSource | 'all';
      status: string;
      query: string;
      includeArchived: boolean;
      page: number;
    }>
  ) => {
    const params = new URLSearchParams();
    params.set('season', requestedSeason);

    const nextSource = updates.source ?? ledgerFilters.source;
    const nextStatus = updates.status ?? ledgerFilters.status;
    const nextQuery = updates.query ?? ledgerFilters.query;
    const nextArchived = updates.includeArchived ?? ledgerFilters.includeArchived;
    const nextPage = updates.page ?? 1;

    if (nextSource !== 'all') {
      params.set('source', nextSource);
    }
    if (nextStatus !== 'all') {
      params.set('status', nextStatus);
    }
    if (nextQuery.trim()) {
      params.set('q', nextQuery.trim());
    }
    if (nextArchived) {
      params.set('archived', '1');
    }
    if (nextPage > 1) {
      params.set('page', String(nextPage));
    }

    router.push(`/${locale}/dashboard/leagues/${leagueId}/finance?${params.toString()}`);
  };

  const handleCreateItem = () => {
    if (!data.manualItemsAvailable) {
      toast.error('Manual finance items are temporarily unavailable until the finance database migration is applied.');
      return;
    }

    const amountCents = Math.round(Number(manualItemForm.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }

    const payload: CreateLeagueFinanceCustomItemInput = {
      leagueId,
      seasonId: manualItemForm.seasonId || null,
      impactType: manualItemForm.impactType,
      title: manualItemForm.title,
      entryDate: manualItemForm.entryDate,
      amountCents,
      debitAccountName: manualItemForm.debitAccountName,
      creditAccountName: manualItemForm.creditAccountName,
      notes: manualItemForm.notes,
      includeInQuickBooksExport: true,
    };

    startCreateItem(async () => {
      const result = await createLeagueFinanceCustomItem(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Finance item saved.');
      setManualItemForm((current) => ({ ...current, title: '', amount: '', notes: '' }));
      setManualItemDialogOpen(false);
      router.refresh();
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!data.manualItemsAvailable) {
      toast.error('Manual finance items are temporarily unavailable until the finance database migration is applied.');
      return;
    }

    setDeletingItemId(itemId);
    const result = await deleteLeagueFinanceCustomItem(leagueId, itemId);
    setDeletingItemId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Finance item removed.');
    router.refresh();
  };

  const handleQuickBooksExport = () => {
    startExport(async () => {
      const result = await exportLeagueFinanceQuickBooksCsv({
        leagueId,
        seasonId: requestedSeason,
        ...exportOptions,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (result.data.journalCount === 0) {
        toast.error('No exportable finance entries were found for this selection.');
        return;
      }

      downloadTextFile(result.data.csv, result.data.fileName, 'text/csv;charset=utf-8');
      toast.success(`QuickBooks export ready (${result.data.journalCount} journals).`);
    });
  };

  const buildQuickBooksReturnTo = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('qb');
    params.delete('qb_error');
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const handleQuickBooksConnect = () => {
    startConnectQuickBooks(async () => {
      const result = await startQuickBooksConnect(leagueId, locale, buildQuickBooksReturnTo());
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      window.location.assign(result.data);
    });
  };

  const handleOpenQuickBooksMappings = () => {
    startLoadMappings(async () => {
      const result = await getQuickBooksMappingOptions(leagueId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setMappingOptions(result.data);
      setMappingSelectionIds(buildQuickBooksMappingSelectionState(result.data, quickBooksStatus.mappings));
      setMappingDialogOpen(true);
    });
  };

  const handleSaveQuickBooksMappings = () => {
    const payload: QuickBooksMappingSelectionInput = {
      registrationRevenue: mappingSelectionIds.registrationRevenue || null,
      teamRevenue: mappingSelectionIds.teamRevenue || null,
      stripeClearing: mappingSelectionIds.stripeClearing || null,
      manualDeposit: mappingSelectionIds.manualDeposit || null,
      processingFees: mappingSelectionIds.processingFees || null,
      refereeExpense: mappingSelectionIds.refereeExpense || null,
      refereePayable: mappingSelectionIds.refereePayable || null,
      refereeCash: mappingSelectionIds.refereeCash || null,
      defaultClass: mappingSelectionIds.defaultClass || null,
      defaultLocation: mappingSelectionIds.defaultLocation || null,
    };

    startSaveMappings(async () => {
      const result = await saveQuickBooksMappings(leagueId, payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('QuickBooks mappings saved.');
      setMappingDialogOpen(false);
      router.refresh();
    });
  };

  const handlePreviewQuickBooksSync = () => {
    startPreviewSync(async () => {
      const result = await previewQuickBooksJournalSync(leagueId, {
        seasonId: requestedSeason === 'all' ? null : requestedSeason,
        includePendingPayroll: exportOptions.includePendingPayroll,
        includePaidPayroll: exportOptions.includePaidPayroll,
        includeManualItems: exportOptions.includeManualItems,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPreviewResult(result.data);
      setQuickBooksPreviewDialogOpen(true);
      toast.success(`QuickBooks preview ready (${result.data.counts.total} journals).`);
      router.refresh();
    });
  };

  const handleSyncQuickBooksPreview = () => {
    if (!previewResult) {
      toast.error('Preview journals before syncing QuickBooks.');
      return;
    }

    startSyncQuickBooks(async () => {
      const result = await syncQuickBooksJournalBatch(leagueId, previewResult.previewId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPreviewResult(result.data);
      toast.success('QuickBooks journal sync completed.');
      router.refresh();
    });
  };

  const handleDisconnectQuickBooks = () => {
    if (!window.confirm('Disconnect this league from QuickBooks Online?')) {
      return;
    }

    startDisconnectQuickBooks(async () => {
      const result = await disconnectQuickBooks(leagueId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setPreviewResult(null);
      toast.success('QuickBooks Online disconnected.');
      router.refresh();
    });
  };

  const seasonScopeLabel =
    requestedSeason === 'all'
      ? 'All seasons'
      : data.selectedSeason?.name || 'Selected season';
  const quickBooksConnected = quickBooksStatus.connection?.status === 'active';
  const recentManualItems = data.manualItems.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Accounting
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Ledger and payouts
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              {seasonScopeLabel} view. Review money movement, trace each entry back to its
              source, and open accounting actions only when you need them.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                updateLedgerFilters({ includeArchived: !ledgerFilters.includeArchived })
              }
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                ledgerFilters.includeArchived
                  ? 'border-amber-300/30 bg-amber-400/10 text-amber-100'
                  : 'border-white/10 bg-black/20 text-neutral-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {ledgerFilters.includeArchived ? 'Hide archived' : 'Show archived'}
            </button>
            <button
              type="button"
              onClick={() => setQuickBooksExportDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.06]"
            >
              <Download className="h-4 w-4" />
              QuickBooks CSV
            </button>
            <button
              type="button"
              onClick={() => setManualItemDialogOpen(true)}
              disabled={!data.manualItemsAvailable}
              className="inline-flex items-center gap-2 rounded-2xl bg-rink-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-rink-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add finance item
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-400/10 p-2.5">
                  <Link2 className="h-5 w-5 text-sky-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">QuickBooks Online</h2>
                  <p className="text-sm text-neutral-400">
                    Keep direct sync setup close to the ledger without turning the page into an
                    accounting wizard.
                  </p>
                </div>
              </div>

              {!quickBooksStatus.available && (
                <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                  Direct sync is not enabled yet. QuickBooks CSV export is still available from
                  this page.
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      Connection
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {quickBooksStatus.connection?.companyName ||
                        (quickBooksStatus.connection ? 'QuickBooks company' : 'Direct sync')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 ${
                          quickBooksStatus.connection?.status === 'active'
                            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                            : 'border-white/10 bg-white/[0.04] text-neutral-200'
                        }`}
                      >
                        {quickBooksStatus.connection?.status === 'active'
                          ? 'Connected'
                          : 'Not connected'}
                      </span>
                      {quickBooksStatus.connection?.lastSyncedAt && (
                        <span>Last sync {formatDate(quickBooksStatus.connection.lastSyncedAt)}</span>
                      )}
                    </div>
                  </div>

                  {quickBooksStatus.canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleQuickBooksConnect}
                        disabled={!quickBooksStatus.available || isConnectingQuickBooks}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:bg-sky-400/20 disabled:opacity-50"
                      >
                        {isConnectingQuickBooks ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {quickBooksStatus.connection?.status === 'active'
                          ? 'Reconnect'
                          : 'Connect'}
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenQuickBooksMappings}
                        disabled={
                          !quickBooksStatus.available ||
                          quickBooksStatus.connection?.status !== 'active' ||
                          isLoadingMappings
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-50"
                      >
                        {isLoadingMappings ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Review mappings
                      </button>
                      <button
                        type="button"
                        onClick={handlePreviewQuickBooksSync}
                        disabled={
                          !quickBooksStatus.available ||
                          quickBooksStatus.connection?.status !== 'active' ||
                          isPreviewingSync
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-50"
                      >
                        {isPreviewingSync ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Preview sync
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickBooksHistoryDialogOpen(true)}
                        disabled={quickBooksStatus.recentRuns.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-50"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        History
                      </button>
                      <button
                        type="button"
                        onClick={handleSyncQuickBooksPreview}
                        disabled={!previewResult?.canSync || isSyncingQuickBooks}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:opacity-50"
                      >
                        {isSyncingQuickBooks ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Sync preview
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectQuickBooks}
                        disabled={!quickBooksStatus.connection || isDisconnectingQuickBooks}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {isDisconnectingQuickBooks ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unplug className="h-4 w-4" />
                        )}
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-300">
                      Admins can review sync status, but only league owners can manage the
                      QuickBooks connection.
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-neutral-300">
                  <p className="font-medium text-white">Mapping health</p>
                  <p className="mt-1 text-neutral-400">
                    {quickBooksStatus.missingMappings.length === 0
                      ? 'All required account mappings are configured.'
                      : `Missing required mappings: ${quickBooksStatus.missingMappings
                          .map((slot) => QUICKBOOKS_MAPPING_LABELS[slot])
                          .join(', ')}`}
                  </p>
                  {previewResult ? (
                    <button
                      type="button"
                      onClick={() => setQuickBooksPreviewDialogOpen(true)}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-rink-300 transition hover:text-rink-200"
                    >
                      Review current preview
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">
                    Finance Ledger
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">Activity and drilldowns</h2>
                  <p className="mt-2 text-sm text-neutral-400">
                    Review money movement across player payments, refunds, invoices, Stripe fees,
                    referee payroll, and manual items.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
                  {ledgerTotal} ledger row{ledgerTotal === 1 ? '' : 's'}
                </div>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
                <label className="block">
                  <span className="sr-only">Search ledger</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <input
                      value={ledgerFilters.query}
                      onChange={(event) => updateLedgerFilters({ query: event.target.value })}
                      placeholder="Search finance activity"
                      className="w-full rounded-xl border border-white/10 bg-neutral-900 py-3 pl-10 pr-4 text-sm text-white outline-none"
                    />
                  </div>
                </label>

                <select
                  value={ledgerFilters.source}
                  onChange={(event) =>
                    updateLedgerFilters({
                      source: event.target.value as LeagueFinanceLedgerSource | 'all',
                    })
                  }
                  className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="all">All sources</option>
                  <option value="player_payment">Player payments</option>
                  <option value="refund">Refunds</option>
                  <option value="team_invoice_payment">Team invoices</option>
                  <option value="stripe_fee">Stripe fees</option>
                  <option value="manual_item">Manual items</option>
                  <option value="referee_payroll">Referee payroll</option>
                </select>

                <select
                  value={ledgerFilters.status}
                  onChange={(event) => updateLedgerFilters({ status: event.target.value })}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="paid">Paid</option>
                  <option value="partially_paid">Partially paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="failed">Failed</option>
                  <option value="recorded">Recorded</option>
                  <option value="posted">Posted</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    updateLedgerFilters({ includeArchived: !ledgerFilters.includeArchived })
                  }
                  className={`rounded-xl border px-4 py-3 text-sm transition ${
                    ledgerFilters.includeArchived
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
                      : 'border-white/10 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {ledgerFilters.includeArchived ? 'Hide archived' : 'Show archived'}
                </button>
              </div>

              {ledgerError ? (
                <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                  {ledgerError}
                </div>
              ) : ledgerRows.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-neutral-400">
                  No finance activity matched this filter yet.
                </div>
              ) : (
                <>
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-black/20">
                        <tr className="text-left text-xs uppercase tracking-[0.18em] text-neutral-500">
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Source</th>
                          <th className="px-4 py-3 font-medium">Counterparty</th>
                          <th className="px-4 py-3 font-medium">Entry</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Amount</th>
                          <th className="px-4 py-3 text-right font-medium">Origin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {ledgerRows.map((row) => (
                          <tr key={row.id} className="bg-black/10 align-top text-sm text-neutral-200">
                            <td className="px-4 py-4 whitespace-nowrap text-neutral-300">
                              {formatDate(row.entryDate)}
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-200">
                                {ledgerSourceLabel(row.source)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-neutral-300">
                              {row.counterparty || '—'}
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-white">{row.title}</p>
                              {row.note && (
                                <p className="mt-1 text-xs text-neutral-500">{row.note}</p>
                              )}
                              {row.archived && (
                                <p className="mt-1 text-xs text-amber-300">Archived origin</p>
                              )}
                            </td>
                            <td className="px-4 py-4 text-neutral-300">{row.status}</td>
                            <td
                              className={`px-4 py-4 text-right font-semibold ${ledgerAmountClass(row.direction)}`}
                            >
                              {ledgerAmountPrefix(row.direction)}
                              {formatCurrency(row.amountCents)}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <Link
                                href={`/${locale}${row.href}`}
                                className="inline-flex items-center gap-1 text-sm text-rink-300 transition hover:text-rink-200"
                              >
                                View
                                <ArrowUpRight className="h-4 w-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {ledgerTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
                      <p>
                        Showing {(ledgerPage - 1) * ledgerLimit + 1}-
                        {Math.min(ledgerPage * ledgerLimit, ledgerTotal)} of {ledgerTotal}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateLedgerFilters({ page: ledgerPage - 1 })}
                          disabled={ledgerPage === 1}
                          className="rounded-lg border border-white/10 p-2 text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span>
                          Page {ledgerPage} of {ledgerTotalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateLedgerFilters({ page: ledgerPage + 1 })}
                          disabled={ledgerPage >= ledgerTotalPages}
                          className="rounded-lg border border-white/10 p-2 text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <section id="manual-items" className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-400/10 p-2.5">
                  <Receipt className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Manual finance items</h2>
                  <p className="text-sm text-neutral-400">
                    Keep manual adjustments tucked away until you need to add one or review the
                    latest entries.
                  </p>
                </div>
              </div>

              {!data.manualItemsAvailable ? (
                <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
                  Manual adjustments are not available for this league yet.
                </div>
              ) : (
                <>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Income</p>
                      <p className="mt-2 text-xl font-black text-white">
                        {formatCurrency(data.manualSummary.incomeCents)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Expense</p>
                      <p className="mt-2 text-xl font-black text-white">
                        {formatCurrency(data.manualSummary.expenseCents)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Neutral</p>
                      <p className="mt-2 text-xl font-black text-white">
                        {formatCurrency(data.manualSummary.neutralCents)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManualItemDialogOpen(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Add or review manual items
                  </button>
                </>
              )}

              <div className="mt-6 space-y-3">
                {recentManualItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
                    No manual finance items yet.
                  </div>
                ) : (
                  recentManualItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-neutral-400">
                          {formatDate(item.entry_date)} | {item.season_id ? seasonNameById.get(item.season_id) || 'Season item' : 'League-wide'} | {item.impact_type}
                        </p>
                        <p className="mt-2 text-sm text-neutral-300">
                          {item.debit_account_name} / {item.credit_account_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-white">{formatCurrency(item.amount_cents)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingItemId === item.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                        >
                          {deletingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-400/10 p-2.5">
                  <Landmark className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">QuickBooks CSV</h2>
                  <p className="text-sm text-neutral-400">
                    Keep export settings nearby, then open the dialog only when you need to adjust
                    accounts or download a file.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-neutral-300">
                <div className="flex items-center justify-between">
                  <span>Pending payroll</span>
                  <span>{exportOptions.includePendingPayroll ? 'Included' : 'Off'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Paid payroll</span>
                  <span>{exportOptions.includePaidPayroll ? 'Included' : 'Off'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Manual items</span>
                  <span>
                    {exportOptions.includeManualItems && data.manualItemsAvailable
                      ? 'Included'
                      : 'Off'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickBooksExportDialogOpen(true)}
                className="mt-6 inline-flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Review export settings
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <p className="mt-3 text-xs text-neutral-500">
                CSV export remains available even when direct sync is turned off.
              </p>
            </section>
          </div>
        </div>

      <Dialog open={manualItemDialogOpen} onOpenChange={setManualItemDialogOpen}>
        <DialogContent className="max-w-3xl border-white/10 bg-neutral-950 text-white">
          <DialogHeader>
            <DialogTitle>Manual finance item</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Create an off-platform income, expense, or neutral journal item without leaving the
              accounting tab.
            </DialogDescription>
          </DialogHeader>

          {!data.manualItemsAvailable ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
              Manual adjustments are not available for this league yet.
            </div>
          ) : (
            <>
              <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Type
                  </label>
                  <select
                    value={manualItemForm.impactType}
                    onChange={(event) =>
                      setManualItemForm((current) => ({
                        ...current,
                        impactType: event.target.value as ManualItemFormState['impactType'],
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="neutral">Neutral journal item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Season
                  </label>
                  <select
                    value={manualItemForm.seasonId}
                    onChange={(event) =>
                      setManualItemForm((current) => ({
                        ...current,
                        seasonId: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="">League-wide</option>
                    {data.seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Title
                  </label>
                  <input
                    value={manualItemForm.title}
                    onChange={(event) =>
                      setManualItemForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                    placeholder="Scorekeeper contractor payout"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Date
                  </label>
                  <input
                    type="date"
                    value={manualItemForm.entryDate}
                    onChange={(event) =>
                      setManualItemForm((current) => ({
                        ...current,
                        entryDate: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualItemForm.amount}
                    onChange={(event) =>
                      setManualItemForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Debit account
                  </label>
                  <input
                    value={manualItemForm.debitAccountName}
                    onChange={(event) =>
                      setManualItemForm((current) => ({
                        ...current,
                        debitAccountName: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Credit account
                  </label>
                  <input
                    value={manualItemForm.creditAccountName}
                    onChange={(event) =>
                      setManualItemForm((current) => ({
                        ...current,
                        creditAccountName: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Notes
                  </label>
                  <textarea
                    value={manualItemForm.notes}
                    onChange={(event) =>
                      setManualItemForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="mt-2 min-h-[96px] w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setManualItemDialogOpen(false)}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-200 transition hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateItem}
                  disabled={isCreatingItem}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rink-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-rink-200 disabled:opacity-60"
                >
                  {isCreatingItem ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add finance item
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={quickBooksExportDialogOpen} onOpenChange={setQuickBooksExportDialogOpen}>
        <DialogContent className="max-w-3xl border-white/10 bg-neutral-950 text-white">
          <DialogHeader>
            <DialogTitle>QuickBooks CSV export</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Review the account names and export scope before downloading the journal-entry CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            {[
              ['Registration revenue', 'registrationRevenueAccount'],
              ['Team fee revenue', 'teamRevenueAccount'],
              ['Stripe clearing', 'stripeClearingAccount'],
              ['Manual deposit account', 'manualDepositAccount'],
              ['Processing fees', 'processingFeesAccount'],
              ['Referee payroll expense', 'refereeExpenseAccount'],
              ['Referee payable', 'refereePayableAccount'],
              ['Referee cash account', 'refereeCashAccount'],
              ['Default class', 'defaultClassName'],
              ['Default location', 'defaultLocationName'],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  {label}
                </label>
                <input
                  value={exportOptions[key as keyof ExportOptionsState] as string}
                  onChange={(event) =>
                    setExportOptions((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
            ))}
            <label className="flex items-center gap-3 text-sm text-neutral-300 md:col-span-2">
              <input
                type="checkbox"
                checked={exportOptions.includePendingPayroll}
                onChange={(event) =>
                  setExportOptions((current) => ({
                    ...current,
                    includePendingPayroll: event.target.checked,
                  }))
                }
              />
              Include pending referee payroll as payable journals
            </label>
            <label className="flex items-center gap-3 text-sm text-neutral-300 md:col-span-2">
              <input
                type="checkbox"
                checked={exportOptions.includePaidPayroll}
                onChange={(event) =>
                  setExportOptions((current) => ({
                    ...current,
                    includePaidPayroll: event.target.checked,
                  }))
                }
              />
              Include paid referee payroll as cash journals
            </label>
            <label className="flex items-center gap-3 text-sm text-neutral-300 md:col-span-2">
              <input
                type="checkbox"
                checked={exportOptions.includeManualItems}
                disabled={!data.manualItemsAvailable}
                onChange={(event) =>
                  setExportOptions((current) => ({
                    ...current,
                    includeManualItems: event.target.checked,
                  }))
                }
              />
              Include manual finance items
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setQuickBooksExportDialogOpen(false)}
              className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-200 transition hover:bg-neutral-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleQuickBooksExport}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-3 text-sm font-semibold text-black transition disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export QuickBooks journal CSV
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickBooksPreviewDialogOpen} onOpenChange={setQuickBooksPreviewDialogOpen}>
        <DialogContent className="max-w-5xl border-white/10 bg-neutral-950 text-white">
          <DialogHeader>
            <DialogTitle>QuickBooks preview</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Review the batch before pushing any journal entries into QuickBooks Online.
            </DialogDescription>
          </DialogHeader>

          {!previewResult ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-neutral-400">
              Build a preview batch first.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Total</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {previewResult.counts.total}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Pending</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {previewResult.counts.pending}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Synced</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {previewResult.counts.alreadySynced}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Changed</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {previewResult.counts.changed}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Blocked</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {previewResult.counts.failed}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-black/20">
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-neutral-500">
                      <th className="px-4 py-3 font-medium">Journal</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {previewResult.entries.map((entry) => (
                      <tr key={entry.id} className="bg-black/10 align-top text-sm text-neutral-200">
                        <td className="px-4 py-4">
                          <p className="font-medium text-white">{entry.journalNo}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {entry.lineCount} lines
                          </p>
                        </td>
                        <td className="px-4 py-4 text-neutral-300">
                          {formatDate(entry.journalDate)}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-white">{entry.description}</p>
                          {entry.errorText ? (
                            <p className="mt-1 text-xs text-neutral-500">{entry.errorText}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${quickBooksSyncStatusClass(entry.status)}`}
                          >
                            {entry.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-white">
                          {formatCurrency(entry.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setQuickBooksPreviewDialogOpen(false)}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-200 transition hover:bg-neutral-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSyncQuickBooksPreview}
                  disabled={!previewResult.canSync || isSyncingQuickBooks}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-50"
                >
                  {isSyncingQuickBooks ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Sync preview
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={quickBooksHistoryDialogOpen} onOpenChange={setQuickBooksHistoryDialogOpen}>
        <DialogContent className="max-w-4xl border-white/10 bg-neutral-950 text-white">
          <DialogHeader>
            <DialogTitle>QuickBooks sync history</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Review recent preview and sync runs without leaving the ledger.
            </DialogDescription>
          </DialogHeader>

          {quickBooksStatus.recentRuns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-neutral-400">
              No QuickBooks previews or sync runs yet.
            </div>
          ) : (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {quickBooksStatus.recentRuns.map((run) => (
                <div key={run.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${quickBooksRunStatusClass(run.status)}`}
                        >
                          {run.status}
                        </span>
                        <span className="text-sm text-neutral-300">
                          {formatDate(run.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-neutral-400">
                        {run.previewCount} previewed, {run.syncedCount} synced, {run.failedCount}{' '}
                        failed.
                      </p>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {run.seasonId
                        ? seasonNameById.get(run.seasonId) || 'Season run'
                        : 'All seasons'}
                    </div>
                  </div>

                  {run.entryFailures.length > 0 ? (
                    <div className="mt-3 space-y-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
                      {run.entryFailures.map((failure) => (
                        <div key={failure.id} className="text-sm text-red-100">
                          <p className="font-medium">{failure.journalNo}</p>
                          <p className="mt-1 text-xs text-red-100/80">
                            {failure.errorText || 'QuickBooks rejected this journal.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-3xl border-white/10 bg-neutral-950 text-white">
          <DialogHeader>
            <DialogTitle>QuickBooks account mappings</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Choose the QuickBooks accounts used for league journal sync. Default class and
              location are optional.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            {QUICKBOOKS_REQUIRED_MAPPING_FIELDS.map((field) => (
              <div key={field}>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  {QUICKBOOKS_MAPPING_LABELS[field]}
                </label>
                <select
                  value={mappingSelectionIds[field]}
                  onChange={(event) =>
                    setMappingSelectionIds((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="">Select account</option>
                  {mappingOptions?.accounts.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.fullyQualifiedName || option.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {QUICKBOOKS_MAPPING_LABELS.defaultClass}
              </label>
              <select
                value={mappingSelectionIds.defaultClass}
                onChange={(event) =>
                  setMappingSelectionIds((current) => ({
                    ...current,
                    defaultClass: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">No default class</option>
                {mappingOptions?.classes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullyQualifiedName || option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {QUICKBOOKS_MAPPING_LABELS.defaultLocation}
              </label>
              <select
                value={mappingSelectionIds.defaultLocation}
                onChange={(event) =>
                  setMappingSelectionIds((current) => ({
                    ...current,
                    defaultLocation: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">No default location</option>
                {mappingOptions?.locations.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullyQualifiedName || option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <button
              type="button"
              onClick={() => setMappingDialogOpen(false)}
              className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-200 transition hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveQuickBooksMappings}
              disabled={isSavingMappings}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-300 to-cyan-300 px-4 py-3 text-sm font-semibold text-black transition disabled:opacity-50"
            >
              {isSavingMappings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save mappings
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
