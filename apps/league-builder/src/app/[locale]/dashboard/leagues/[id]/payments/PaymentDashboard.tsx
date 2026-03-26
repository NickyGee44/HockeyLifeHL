'use client';

/**
 * Payment Dashboard Component
 *
 * Main dashboard for league owners to track and manage player payments.
 * Features:
 * - Payment summary stats with collection percentage
 * - Payment status table with team filtering, search, and mark as paid
 * - Send individual and bulk payment reminders
 * - Process refunds
 * - Export payment reports
 * - Payment detail slide-over sheet
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  Wallet,
} from 'lucide-react';
import { PaymentStatusTable } from '@/components/payments/PaymentStatusTable';
import { PaymentDetailSheet } from '@/components/payments/PaymentDetailSheet';
import { PaymentCleanupDialog } from '@/components/payments/PaymentCleanupDialog';
import { RefundModal } from '@/components/payments/RefundModal';
import { PaymentReportExport } from '@/components/payments/PaymentReportExport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  archivePlayerPayment,
  sendPaymentReminder,
  markPaymentAsPaid,
  permanentlyDeletePlayerPayment,
  sendBulkPaymentReminders,
} from '@/lib/payments/payment-actions';
import type { BillingReadiness } from '@/lib/payments/billing-readiness';
import type {
  PlayerPaymentWithDetails,
  PaymentSummary,
  RefundResult,
} from '@/lib/payments/types';

interface PaymentDashboardProps {
  locale: string;
  leagueId: string;
  leagueName: string;
  seasons: Array<{
    id: string;
    name: string;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
  }>;
  selectedSeason: {
    id: string;
    name: string;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;
  payments: PlayerPaymentWithDetails[];
  summary: PaymentSummary | null;
  total: number;
  currentPage: number;
  limit: number;
  statusFilter?: string;
  includeArchived: boolean;
  teams: { id: string; name: string }[];
  billingReadiness: BillingReadiness;
  focusedPayment: PlayerPaymentWithDetails | null;
  viewerRole: 'owner' | 'admin';
}

export function PaymentDashboard({
  locale,
  leagueId,
  leagueName,
  seasons: _seasons,
  selectedSeason,
  payments: initialPayments,
  summary,
  total,
  currentPage,
  limit,
  statusFilter,
  includeArchived,
  teams,
  billingReadiness,
  focusedPayment,
  viewerRole,
}: PaymentDashboardProps) {
  const router = useRouter();
  const t = useTranslations('payments.dashboard');
  const payments = initialPayments;
  const [selectedPayment, setSelectedPayment] = useState<PlayerPaymentWithDetails | null>(
    focusedPayment
  );
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(Boolean(focusedPayment));
  const [_sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<'archive' | 'delete'>('archive');
  const [cleanupTarget, setCleanupTarget] = useState<PlayerPaymentWithDetails | null>(null);
  const [cleanupReason, setCleanupReason] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [cleanupPending, setCleanupPending] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    setSelectedPayment(focusedPayment);
    setIsDetailSheetOpen(Boolean(focusedPayment));
  }, [focusedPayment]);

  const buildListParams = ({
    paymentId,
    page,
  }: {
    paymentId?: string | null;
    page?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (selectedSeason) params.set('season', selectedSeason.id);
    if (statusFilter) params.set('status', statusFilter);
    if (includeArchived) params.set('archived', '1');
    if (page && page > 1) params.set('page', String(page));
    if (paymentId) params.set('payment', paymentId);
    return params;
  };

  const handleSendReminder = async (payment: PlayerPaymentWithDetails) => {
    setSendingReminder(payment.id);
    try {
      const result = await sendPaymentReminder(payment.id);
      if (result.success) {
        toast.success(t('reminderSent'));
        router.refresh();
      } else {
        toast.error(result.error || t('reminderFailed'));
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setSendingReminder(null);
    }
  };

  const handleMarkAsPaid = async (payment: PlayerPaymentWithDetails) => {
    try {
      const result = await markPaymentAsPaid(payment.id);
      if (result.success) {
        toast.success(t('markedAsPaid'));
        router.refresh();
      } else {
        toast.error(result.error || t('markAsPaidFailed'));
      }
    } catch {
      toast.error(t('unexpectedError'));
    }
  };

  const handleBulkReminders = async () => {
    if (!selectedSeason) return;
    if (!confirm(t('confirmBulkReminder'))) return;

    setSendingBulkReminders(true);
    try {
      const result = await sendBulkPaymentReminders(leagueId, selectedSeason.id);
      if (result.success) {
        toast.success(t('remindersSentCount', { count: result.data.remindersSent }));
        router.refresh();
      } else {
        toast.error(result.error || t('bulkReminderFailed'));
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setSendingBulkReminders(false);
    }
  };

  const handleViewDetails = (payment: PlayerPaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsDetailSheetOpen(true);
    router.push(
      `/${locale}/dashboard/leagues/${leagueId}/payments?${buildListParams({
        paymentId: payment.id,
        page: currentPage,
      }).toString()}`
    );
  };

  const handleRefundClick = (payment: PlayerPaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsRefundModalOpen(true);
  };

  const handleRefundSuccess = (result: RefundResult) => {
    toast.success(t('refundProcessed', { amount: (result.amountRefunded / 100).toFixed(2) }));
    router.refresh();
  };

  const openCleanupDialog = (
    payment: PlayerPaymentWithDetails,
    mode: 'archive' | 'delete'
  ) => {
    setCleanupMode(mode);
    setCleanupTarget(payment);
    setCleanupReason('');
    setDeleteConfirmationText('');
  };

  const handleConfirmCleanup = async () => {
    if (!cleanupTarget) return;

    setCleanupPending(true);
    try {
      const result =
        cleanupMode === 'archive'
          ? await archivePlayerPayment({
              paymentId: cleanupTarget.id,
              reason: cleanupReason,
            })
          : await permanentlyDeletePlayerPayment({
              paymentId: cleanupTarget.id,
              reason: cleanupReason,
              confirmationText: deleteConfirmationText,
            });

      if (!result.success) {
        toast.error(result.error || t('cleanupFailed'));
        return;
      }

      if (cleanupMode === 'archive') {
        toast.success(t('paymentArchived'));
      } else {
        toast.success(t('paymentDeleted'));
        if (selectedPayment?.id === cleanupTarget.id) {
          setIsDetailSheetOpen(false);
          setSelectedPayment(null);
        }
      }

      setCleanupTarget(null);
      setCleanupReason('');
      setDeleteConfirmationText('');
      router.refresh();
    } catch {
      toast.error(t('cleanupFailed'));
    } finally {
      setCleanupPending(false);
    }
  };

  const handleArchivedToggle = () => {
    const params = buildListParams();
    if (!includeArchived) {
      params.set('archived', '1');
    }
    router.push(`/${locale}/dashboard/leagues/${leagueId}/payments?${params.toString()}`);
  };

  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (page: number) => {
    router.push(
      `/${locale}/dashboard/leagues/${leagueId}/payments?${buildListParams({ page }).toString()}`
    );
  };

  if (!selectedSeason) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rink-500/10">
          <AlertCircle className="h-8 w-8 text-rink-300" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-white">{t('noSeasonsTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-neutral-400">{t('noSeasonsDescription')}</p>
        <a
          href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
          className="mt-6 inline-flex items-center rounded-2xl bg-rink-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-rink-200"
        >
          {t('createSeason')}
        </a>
      </div>
    );
  }

  const topMetrics = summary
    ? [
        {
          id: 'collected',
          label: t('totalCollected'),
          value: `$${(summary.totalCollectedCents / 100).toFixed(2)}`,
          note: t('ofExpected', { amount: (summary.totalExpectedCents / 100).toFixed(2) }),
          icon: Wallet,
        },
        {
          id: 'outstanding',
          label: t('pending'),
          value: `$${(summary.totalOutstandingCents / 100).toFixed(2)}`,
          note: t('playersPending', { count: summary.playersPending }),
          icon: AlertCircle,
        },
        {
          id: 'healthy',
          label: t('paidInFull'),
          value: String(summary.playersPaidFull),
          note: t('partiallyPaid', { count: summary.playersPartial }),
          icon: CheckCircle2,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              {selectedSeason.name}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">{t('title')}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              {leagueName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleArchivedToggle}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                includeArchived
                  ? 'border-amber-300/30 bg-amber-400/10 text-amber-100'
                  : 'border-white/10 bg-black/20 text-neutral-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {includeArchived ? t('hideArchived') : t('showArchived')}
            </button>
            <button
              onClick={handleBulkReminders}
              disabled={sendingBulkReminders}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {sendingBulkReminders ? t('sendingReminders') : t('sendAllReminders')}
            </button>
            <button
              type="button"
              onClick={() => setExportDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-rink-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-rink-200"
            >
              <Download className="h-4 w-4" />
              {t('exportAction')}
            </button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid gap-3 lg:grid-cols-3">
          {topMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.id}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    {metric.label}
                  </p>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-2 text-rink-300">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-black tracking-tight text-white">{metric.value}</p>
                <p className="mt-2 text-sm text-neutral-400">{metric.note}</p>
              </div>
            );
          })}
        </section>
      )}

      <section className="space-y-4">
        {billingReadiness.needsOwnerAttention && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-200">Payments need attention</p>
                  <p className="text-sm text-amber-100/80">{billingReadiness.message}</p>
                </div>
              </div>
              <a
                href={`/${locale}${billingReadiness.ctaUrl}`}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/20"
              >
                <Wallet className="h-4 w-4" />
                {billingReadiness.ctaLabel}
              </a>
            </div>
          </div>
        )}

        {!billingReadiness.canAcceptPayments && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-400" />
              <div>
                <p className="font-semibold text-red-200">Card payments are currently blocked</p>
                <p className="text-sm text-red-100/80">
                  Owners can still review balances here, but Stripe needs attention before online checkout will work.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-3 sm:p-4">
        <PaymentStatusTable
          payments={payments}
          teams={teams}
          onViewDetails={handleViewDetails}
          isLoading={false}
        />
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">
            {t('showing', {
              from: (currentPage - 1) * limit + 1,
              to: Math.min(currentPage * limit, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-xl border border-white/10 p-2 text-neutral-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-neutral-300">
              {t('pageOf', { current: currentPage, total: totalPages })}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-white/10 p-2 text-neutral-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {selectedPayment && (
        <RefundModal
          payment={selectedPayment}
          isOpen={isRefundModalOpen}
          onClose={() => {
            setIsRefundModalOpen(false);
          }}
          onSuccess={handleRefundSuccess}
        />
      )}

      <PaymentDetailSheet
        open={isDetailSheetOpen}
        onOpenChange={(open) => {
          setIsDetailSheetOpen(open);
          if (!open) {
            setSelectedPayment(null);
            router.push(
              `/${locale}/dashboard/leagues/${leagueId}/payments?${buildListParams({
                page: currentPage,
              }).toString()}`
            );
          }
        }}
        payment={selectedPayment}
        onSendReminder={handleSendReminder}
        onMarkAsPaid={handleMarkAsPaid}
        onRefund={handleRefundClick}
        onArchive={(payment) => openCleanupDialog(payment, 'archive')}
        canPermanentlyDelete={viewerRole === 'owner' && Boolean(selectedPayment?.archived_at)}
        onRequestPermanentDelete={(payment) => openCleanupDialog(payment, 'delete')}
      />

      <PaymentCleanupDialog
        open={Boolean(cleanupTarget)}
        mode={cleanupMode}
        payment={cleanupTarget}
        reason={cleanupReason}
        confirmationText={deleteConfirmationText}
        pending={cleanupPending}
        onReasonChange={setCleanupReason}
        onConfirmationTextChange={setDeleteConfirmationText}
        onOpenChange={(open) => {
          if (!open) {
            setCleanupTarget(null);
            setCleanupReason('');
            setDeleteConfirmationText('');
          }
        }}
        onConfirm={handleConfirmCleanup}
      />

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-neutral-950 text-white">
          <DialogHeader>
            <DialogTitle>{t('exportDialogTitle')}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {t('exportDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <PaymentReportExport
            leagueId={leagueId}
            seasonId={selectedSeason.id}
            seasonName={selectedSeason.name}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
