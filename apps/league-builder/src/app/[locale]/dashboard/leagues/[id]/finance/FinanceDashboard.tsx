'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from 'lucide-react';
import type {
  CreateLeagueFinanceCustomItemInput,
  LeagueFinanceDashboardData,
} from '@/lib/actions/league-finance';
import {
  createLeagueFinanceCustomItem,
  deleteLeagueFinanceCustomItem,
  exportLeagueFinanceQuickBooksCsv,
} from '@/lib/actions/league-finance';

interface FinanceDashboardProps {
  locale: string;
  leagueId: string;
  requestedSeason: string;
  data: LeagueFinanceDashboardData;
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
  includePendingPayroll: boolean;
  includePaidPayroll: boolean;
  includeManualItems: boolean;
};

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

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-neutral-400">{detail}</p>
    </div>
  );
}

export function FinanceDashboard({
  locale,
  leagueId,
  requestedSeason,
  data,
}: FinanceDashboardProps) {
  const router = useRouter();
  const [isCreatingItem, startCreateItem] = useTransition();
  const [isExporting, startExport] = useTransition();
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

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
    includePendingPayroll: true,
    includePaidPayroll: true,
    includeManualItems: true,
  });

  const handleSeasonChange = (seasonValue: string) => {
    const params = new URLSearchParams();
    params.set('season', seasonValue);
    router.push(`/${locale}/dashboard/leagues/${leagueId}/finance?${params.toString()}`);
  };

  const handleCreateItem = () => {
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
      router.refresh();
    });
  };

  const handleDeleteItem = async (itemId: string) => {
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

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}`}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to league
        </Link>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-rink-400">
              League Finance
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
              {data.league.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Collections, payouts, manual finance items, and QuickBooks-ready journal export in
              one owner view.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <label htmlFor="finance-season" className="block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Season Scope
            </label>
            <select
              id="finance-season"
              value={requestedSeason}
              onChange={(event) => handleSeasonChange(event.target.value)}
              className="mt-3 min-w-[240px] rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">All seasons</option>
              {data.seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-neutral-500">
              {data.selectedSeason ? `${data.selectedSeason.name} finance view` : 'All season finance view'}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
          Cash totals avoid double-counting team billing by adding player collections and team-side
          invoice payments separately. Team invoice totals still show the full invoice position,
          including player contributions allocated against a team invoice.
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Cash Collected"
            value={formatCurrency(data.snapshot.cashCollectedCents)}
            detail="Player collections + team-side invoice payments + manual income items."
          />
          <StatCard
            label="Tracked Expenses"
            value={formatCurrency(data.snapshot.trackedExpensesCents)}
            detail="Stripe fees, referee payroll, and manual expense entries."
          />
          <StatCard
            label="Net Tracked Position"
            value={formatCurrency(data.snapshot.netTrackedPositionCents)}
            detail="Operational view, not a full accounting close."
          />
          <StatCard
            label="Registration Outstanding"
            value={formatCurrency(data.registrationSummary.totalOutstandingCents)}
            detail={`${data.registrationSummary.playersPending} pending and ${data.registrationSummary.playersOverdue} overdue player records.`}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rink-500/10 p-2.5">
                  <Wallet className="h-5 w-5 text-rink-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Collections Overview</h2>
                  <p className="text-sm text-neutral-400">
                    Individual player billing, team invoice payments, and payment processor drag.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Player Billing"
                  value={formatCurrency(data.registrationSummary.totalCollectedCents)}
                  detail={`${formatCurrency(data.registrationSummary.totalExpectedCents)} expected with ${formatCurrency(data.registrationSummary.totalOutstandingCents)} still open.`}
                />
                <StatCard
                  label="Team-Side Invoice Cash"
                  value={formatCurrency(data.teamBillingSummary.teamSideCollectedCents)}
                  detail="Separate captain/team payments recorded on invoices only."
                />
                <StatCard
                  label="Stripe Fees"
                  value={formatCurrency(data.stripeSummary.totalFeesPaidCents)}
                  detail={`${data.stripeSummary.paymentCount} successful Stripe payments at ${data.stripeSummary.successRate}% success.`}
                />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <StatCard
                  label="Team Invoice Position"
                  value={formatCurrency(data.teamBillingSummary.totalInvoicedCents)}
                  detail={`${formatCurrency(data.teamBillingSummary.invoiceOutstandingCents)} still outstanding across ${data.teamBillingSummary.teamCount} invoices.`}
                />
                <StatCard
                  label="Referee Payroll"
                  value={formatCurrency(data.refereePayroll.totalAmountCents)}
                  detail={`${formatCurrency(data.refereePayroll.pendingAmountCents)} pending with ${data.refereePayroll.unlinkedAssignments} unlinked assignments.`}
                />
              </div>

              {data.stripeSummary.filteredBySeasonWindow && (
                <p className="mt-4 text-xs text-neutral-500">
                  Stripe totals are scoped by transaction date inside the selected season window
                  because the Stripe payments table does not carry a season foreign key yet.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-400/10 p-2.5">
                  <Receipt className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Manual Finance Items</h2>
                  <p className="text-sm text-neutral-400">
                    Track off-platform income, expenses, or neutral journal items with QuickBooks
                    debit and credit mappings.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Type</label>
                  <select
                    value={manualItemForm.impactType}
                    onChange={(event) => setManualItemForm((current) => ({ ...current, impactType: event.target.value as ManualItemFormState['impactType'] }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="neutral">Neutral journal item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Season</label>
                  <select
                    value={manualItemForm.seasonId}
                    onChange={(event) => setManualItemForm((current) => ({ ...current, seasonId: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="">League-wide</option>
                    {data.seasons.map((season) => (
                      <option key={season.id} value={season.id}>{season.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Title</label>
                  <input
                    value={manualItemForm.title}
                    onChange={(event) => setManualItemForm((current) => ({ ...current, title: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                    placeholder="Scorekeeper contractor payout"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Date</label>
                  <input
                    type="date"
                    value={manualItemForm.entryDate}
                    onChange={(event) => setManualItemForm((current) => ({ ...current, entryDate: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualItemForm.amount}
                    onChange={(event) => setManualItemForm((current) => ({ ...current, amount: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Debit account</label>
                  <input
                    value={manualItemForm.debitAccountName}
                    onChange={(event) => setManualItemForm((current) => ({ ...current, debitAccountName: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Credit account</label>
                  <input
                    value={manualItemForm.creditAccountName}
                    onChange={(event) => setManualItemForm((current) => ({ ...current, creditAccountName: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Notes</label>
                  <textarea
                    value={manualItemForm.notes}
                    onChange={(event) => setManualItemForm((current) => ({ ...current, notes: event.target.value }))}
                    className="mt-2 min-h-[96px] w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateItem}
                disabled={isCreatingItem}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rink-500 to-arena-500 px-4 py-3 text-sm font-semibold text-black transition disabled:opacity-60"
              >
                {isCreatingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add finance item
              </button>

              <div className="mt-6 space-y-3">
                {data.manualItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
                    No manual finance items yet.
                  </div>
                ) : (
                  data.manualItems.map((item) => (
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
                  <h2 className="text-lg font-bold text-white">QuickBooks Export</h2>
                  <p className="text-sm text-neutral-400">
                    Generate a journal-entry CSV with balanced debit and credit rows for QuickBooks Online import.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
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
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</label>
                    <input
                      value={exportOptions[key as keyof ExportOptionsState] as string}
                      onChange={(event) => setExportOptions((current) => ({ ...current, [key]: event.target.value }))}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                ))}
                <label className="flex items-center gap-3 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.includePendingPayroll}
                    onChange={(event) => setExportOptions((current) => ({ ...current, includePendingPayroll: event.target.checked }))}
                  />
                  Include pending referee payroll as payable journals
                </label>
                <label className="flex items-center gap-3 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.includePaidPayroll}
                    onChange={(event) => setExportOptions((current) => ({ ...current, includePaidPayroll: event.target.checked }))}
                  />
                  Include paid referee payroll as cash journals
                </label>
                <label className="flex items-center gap-3 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeManualItems}
                    onChange={(event) => setExportOptions((current) => ({ ...current, includeManualItems: event.target.checked }))}
                  />
                  Include manual finance items
                </label>
              </div>

              <button
                type="button"
                onClick={handleQuickBooksExport}
                disabled={isExporting}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-3 text-sm font-semibold text-black transition disabled:opacity-60"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export QuickBooks journal CSV
              </button>

              <p className="mt-3 text-xs text-neutral-500">
                Use QuickBooks Online journal-entry import and map the CSV columns once for your company file.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-bold text-white">Manual Item Rollup</h2>
              <div className="mt-4 space-y-3 text-sm text-neutral-300">
                <div className="flex items-center justify-between">
                  <span>Manual income</span>
                  <span>{formatCurrency(data.manualSummary.incomeCents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Manual expense</span>
                  <span>{formatCurrency(data.manualSummary.expenseCents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Neutral journals</span>
                  <span>{formatCurrency(data.manualSummary.neutralCents)}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
