'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowUpRight, Building2, CircleAlert, Landmark, Wallet } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Switch } from '@/components/ui/switch';
import type {
  FinancialWorkspaceCommonData,
  FinancialWorkspaceOverviewData,
} from '@/lib/financial-workspace/get-financial-workspace-data';

interface FinancialWorkspaceShellProps {
  common: FinancialWorkspaceCommonData;
  overview?: FinancialWorkspaceOverviewData;
  children: ReactNode;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

function buildAttentionItems({
  common,
  overview,
  t,
}: {
  common: FinancialWorkspaceCommonData;
  overview?: FinancialWorkspaceOverviewData;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (!overview) {
    return [];
  }

  const { financeData, quickBooksStatus } = overview;
  const basePath = `/${common.locale}/dashboard/leagues/${common.leagueId}`;
  const paymentSeason = financeData.selectedSeason?.id || common.selectedSeason?.id || '';
  const paymentQuery = paymentSeason ? `?season=${paymentSeason}` : '';
  const items = [];

  if (financeData.registrationSummary.playersOverdue > 0) {
    items.push({
      id: 'overdue',
      tone: 'urgent',
      label: common.activeTab === 'payments' ? t('tabs.payments') : t('overview.openPayments'),
      title: t('overview.attentionItems.overdueTitle', {
        count: financeData.registrationSummary.playersOverdue,
      }),
      description: t('overview.attentionItems.overdueDescription', {
        amount: formatCurrency(financeData.registrationSummary.totalOutstandingCents),
      }),
      href: `${basePath}/payments${paymentQuery}${paymentQuery ? '&' : '?'}status=overdue`,
    });
  }

  if (common.billingReadiness.needsOwnerAttention) {
    items.push({
      id: 'billing',
      tone: 'warning',
      label: common.billingReadiness.ctaLabel,
      title: t('overview.attentionItems.billingTitle'),
      description: common.billingReadiness.message,
      href: `/${common.locale}${common.billingReadiness.ctaUrl}`,
    });
  }

  if (!quickBooksStatus.available) {
    items.push({
      id: 'quickbooks-env',
      tone: 'muted',
      label: t('tabs.accounting'),
      title: t('overview.attentionItems.quickbooksDisabledTitle'),
      description: t('overview.attentionItems.quickbooksDisabledDescription'),
      href: common.tabLinks.accounting,
    });
  } else if (quickBooksStatus.connection?.status !== 'active') {
    items.push({
      id: 'quickbooks-connect',
      tone: 'warning',
      label: t('tabs.accounting'),
      title: t('overview.attentionItems.quickbooksConnectTitle'),
      description: t('overview.attentionItems.quickbooksConnectDescription'),
      href: common.tabLinks.accounting,
    });
  } else if (quickBooksStatus.missingMappings.length > 0) {
    items.push({
      id: 'quickbooks-mappings',
      tone: 'warning',
      label: t('tabs.accounting'),
      title: t('overview.attentionItems.quickbooksMappingsTitle'),
      description: t('overview.attentionItems.quickbooksMappingsDescription', {
        count: quickBooksStatus.missingMappings.length,
      }),
      href: common.tabLinks.accounting,
    });
  }

  if (financeData.teamBillingSummary.invoiceOutstandingCents > 0) {
    items.push({
      id: 'team-invoices',
      tone: 'muted',
      label: t('tabs.accounting'),
      title: t('overview.attentionItems.teamInvoicesTitle'),
      description: t('overview.attentionItems.teamInvoicesDescription', {
        amount: formatCurrency(financeData.teamBillingSummary.invoiceOutstandingCents),
      }),
      href: common.tabLinks.accounting,
    });
  }

  return items.slice(0, 4);
}

function attentionToneClass(tone: 'urgent' | 'warning' | 'muted') {
  if (tone === 'urgent') {
    return 'border-red-400/25 bg-red-500/[0.06] text-red-50';
  }
  if (tone === 'warning') {
    return 'border-amber-300/25 bg-amber-400/[0.06] text-amber-50';
  }
  return 'border-white/10 bg-white/[0.03] text-white';
}

function FinancialOverview({
  common,
  overview,
}: {
  common: FinancialWorkspaceCommonData;
  overview: FinancialWorkspaceOverviewData;
}) {
  const t = useTranslations('financialWorkspace');
  const attentionItems = buildAttentionItems({ common, overview, t });
  const metrics = [
    {
      id: 'cash-in',
      label: t('overview.metrics.cashIn'),
      value: formatCurrency(overview.financeData.snapshot.cashCollectedCents),
      note: t('overview.metrics.cashInNote'),
      icon: Wallet,
    },
    {
      id: 'outstanding',
      label: t('overview.metrics.outstanding'),
      value: formatCurrency(overview.financeData.registrationSummary.totalOutstandingCents),
      note: t('overview.metrics.outstandingNote', {
        pending: overview.financeData.registrationSummary.playersPending,
      }),
      icon: CircleAlert,
    },
    {
      id: 'expenses',
      label: t('overview.metrics.expenses'),
      value: formatCurrency(overview.financeData.snapshot.trackedExpensesCents),
      note: t('overview.metrics.expensesNote'),
      icon: Building2,
    },
    {
      id: 'net',
      label: t('overview.metrics.net'),
      value: formatCurrency(overview.financeData.snapshot.netTrackedPositionCents),
      note: t('overview.metrics.netNote'),
      icon: Landmark,
    },
    {
      id: 'overdue',
      label: t('overview.metrics.overdue'),
      value: String(overview.financeData.registrationSummary.playersOverdue),
      note: t('overview.metrics.overdueNote'),
      icon: CircleAlert,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  {metric.label}
                </p>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-rink-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-white">{metric.value}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{metric.note}</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                {t('overview.attentionLabel')}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                {t('overview.attentionTitle')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                {t('overview.attentionDescription')}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {attentionItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-6 text-sm text-neutral-400">
                {t('overview.allClear')}
              </div>
            ) : (
              attentionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex flex-col gap-3 rounded-2xl border px-5 py-4 transition hover:border-white/20 hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between',
                    attentionToneClass(item.tone as 'urgent' | 'warning' | 'muted')
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-current/75">{item.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold">
                    {item.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                {t('overview.recentLabel')}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                {t('overview.recentTitle')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                {t('overview.recentDescription')}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {overview.recentLedgerRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-6 text-sm text-neutral-400">
                {t('overview.noMovement')}
              </div>
            ) : (
              overview.recentLedgerRows.map((row) => (
                <Link
                  key={row.id}
                  href={`/${common.locale}${row.href}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{row.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                      {row.source.replace(/_/g, ' ')}
                    </p>
                    <p className="mt-2 text-sm text-neutral-400">
                      {row.counterparty || t('overview.unknownCounterparty')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCurrency(row.amountCents)}</p>
                    <p className="mt-1 text-xs text-neutral-500">{row.status}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function FinancialWorkspaceShell({
  common,
  overview,
  children,
}: FinancialWorkspaceShellProps) {
  const t = useTranslations('financialWorkspace');
  const router = useRouter();

  const activeSeasonValue =
    common.route === 'finance' ? common.requestedSeason || 'all' : common.requestedSeason;

  const seasonScopeLabel =
    common.route === 'finance'
      ? common.requestedSeason === 'all'
        ? t('allSeasons')
        : common.seasons.find((season) => season.id === common.requestedSeason)?.name ||
          t('allSeasons')
      : common.selectedSeason?.name || t('payments.noSeasonSelected');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(81,205,255,0.09),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,215,150,0.08),transparent_28%),#09090b]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/${common.locale}/dashboard/leagues/${common.leagueId}`}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToLeague')}
        </Link>

        <div className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rink-300">
                {t('eyebrow')}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {t('title')}
              </h1>
              <p className="mt-3 text-lg text-neutral-200">{common.leagueName}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                {t('subtitle')}
              </p>
            </div>

            <div className="grid gap-3 sm:min-w-[280px]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  {t('seasonScope')}
                </p>
                {common.seasonOptions.length > 0 ? (
                  <select
                    value={activeSeasonValue}
                    onChange={(event) => {
                      const option = common.seasonOptions.find(
                        (item) => item.value === event.target.value
                      );
                      if (option) {
                        router.push(option.href);
                      }
                    }}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none"
                  >
                    {common.seasonOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value === 'all' ? t('allSeasons') : option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-3 text-sm text-neutral-400">{t('payments.noSeasonSelected')}</p>
                )}
                <p className="mt-3 text-xs text-neutral-500">{seasonScopeLabel}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      {t('onlinePayments')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {common.billingReadiness.canAcceptPayments
                        ? t('payments.live')
                        : t('payments.needsAttention')}
                    </p>
                  </div>
                  <Switch checked={common.billingReadiness.canAcceptPayments} disabled />
                </div>
                <p className="mt-3 text-xs leading-5 text-neutral-400">
                  {common.billingReadiness.message}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
            {(['overview', 'payments', 'accounting'] as const).map((tab) => (
              <Link
                key={tab}
                href={common.tabLinks[tab]}
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm font-semibold transition',
                  common.activeTab === tab
                    ? 'bg-rink-300 text-black shadow-[0_14px_40px_rgba(81,205,255,0.28)]'
                    : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                {t(`tabs.${tab}`)}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {common.activeTab === 'overview' && overview ? (
            <FinancialOverview common={common} overview={overview} />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
