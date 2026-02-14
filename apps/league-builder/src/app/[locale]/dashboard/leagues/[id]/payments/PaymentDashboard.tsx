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

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { PaymentStatusTable } from '@/components/payments/PaymentStatusTable';
import { PaymentDetailSheet } from '@/components/payments/PaymentDetailSheet';
import { RefundModal } from '@/components/payments/RefundModal';
import { PaymentReportExport } from '@/components/payments/PaymentReportExport';
import {
  sendPaymentReminder,
  markPaymentAsPaid,
  sendBulkPaymentReminders,
} from '@/lib/payments/payment-actions';
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
    status: string;
    start_date: string;
    end_date: string | null;
  }>;
  selectedSeason: {
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date: string | null;
  } | null;
  payments: PlayerPaymentWithDetails[];
  summary: PaymentSummary | null;
  total: number;
  currentPage: number;
  limit: number;
  statusFilter?: string;
  teams: { id: string; name: string }[];
  hasStripeConnected: boolean;
}

export function PaymentDashboard({
  locale,
  leagueId,
  leagueName,
  seasons,
  selectedSeason,
  payments: initialPayments,
  summary,
  total,
  currentPage,
  limit,
  statusFilter,
  teams,
  hasStripeConnected,
}: PaymentDashboardProps) {
  const router = useRouter();
  const t = useTranslations('payments.dashboard');
  const [payments] = useState(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState<PlayerPaymentWithDetails | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [_sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);

  const handleSeasonChange = (seasonId: string) => {
    router.push(`/${locale}/dashboard/leagues/${leagueId}/payments?season=${seasonId}`);
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
  };

  const handleRefundClick = (payment: PlayerPaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsRefundModalOpen(true);
  };

  const handleRefundSuccess = (result: RefundResult) => {
    toast.success(t('refundProcessed', { amount: (result.amountRefunded / 100).toFixed(2) }));
    router.refresh();
  };

  const totalPages = Math.ceil(total / limit);

  const collectionPercent =
    summary && summary.totalExpectedCents > 0
      ? Math.round((summary.totalCollectedCents / summary.totalExpectedCents) * 100)
      : 0;

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (selectedSeason) params.set('season', selectedSeason.id);
    if (statusFilter) params.set('status', statusFilter);
    if (page > 1) params.set('page', page.toString());
    router.push(`/${locale}/dashboard/leagues/${leagueId}/payments?${params.toString()}`);
  };

  if (!hasStripeConnected) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToLeague')}
          </Link>

          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('noStripeTitle')}</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              {t('noStripeDescription')}
            </p>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/billing`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-rink-500/20 transition-all"
            >
              <DollarSign className="w-5 h-5" />
              {t('setupPayments')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedSeason) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToLeague')}
          </Link>

          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-rink-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-rink-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('noSeasonsTitle')}</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              {t('noSeasonsDescription')}
            </p>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-rink-500/20 transition-all"
            >
              {t('createSeason')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToLeague')}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">{t('title')}</h1>
              <p className="text-neutral-400 mt-1">{leagueName}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Send All Reminders */}
              <button
                onClick={handleBulkReminders}
                disabled={sendingBulkReminders}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-xl hover:bg-neutral-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Mail className="w-4 h-4" />
                {sendingBulkReminders ? t('sendingReminders') : t('sendAllReminders')}
              </button>

              {/* Season Selector */}
              {seasons.length > 1 && (
                <div>
                  <label htmlFor="season" className="sr-only">
                    {t('selectSeason')}
                  </label>
                  <select
                    id="season"
                    value={selectedSeason.id}
                    onChange={(e) => handleSeasonChange(e.target.value)}
                    className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent"
                  >
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Total Collected */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-neutral-400">{t('totalCollected')}</span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${(summary.totalCollectedCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {t('ofExpected', { amount: (summary.totalExpectedCents / 100).toFixed(2) })}
              </p>
              {/* Collection % */}
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">{t('collectionPercent')}</span>
                  <span className="text-rink-400 font-medium">{collectionPercent}%</span>
                </div>
                <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rink-500 to-arena-500 rounded-full transition-all"
                    style={{ width: `${collectionPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-500" />
                </div>
                <span className="text-sm text-neutral-400">{t('pending')}</span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${(summary.totalOutstandingCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {t('playersPending', { count: summary.playersPending })}
              </p>
            </div>

            {/* Overdue Payments */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm text-neutral-400">{t('overdue')}</span>
              </div>
              <p className="text-2xl font-bold text-white">{summary.playersOverdue}</p>
              <p className="text-xs text-neutral-500 mt-1">{t('playersOverdue')}</p>
            </div>

            {/* Paid in Full */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-rink-500/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-rink-500" />
                </div>
                <span className="text-sm text-neutral-400">{t('paidInFull')}</span>
              </div>
              <p className="text-2xl font-bold text-white">{summary.playersPaidFull}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {t('partiallyPaid', { count: summary.playersPartial })}
              </p>
            </div>
          </div>
        )}

        {/* Export Report */}
        <div className="mb-6">
          <PaymentReportExport
            leagueId={leagueId}
            seasonId={selectedSeason.id}
            seasonName={selectedSeason.name}
          />
        </div>

        {/* Payment Status Table */}
        <PaymentStatusTable
          payments={payments}
          teams={teams}
          onRefund={handleRefundClick}
          onSendReminder={handleSendReminder}
          onViewDetails={handleViewDetails}
          onMarkAsPaid={handleMarkAsPaid}
          isLoading={false}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
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
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-neutral-300">
                {t('pageOf', { current: currentPage, total: totalPages })}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {selectedPayment && (
          <RefundModal
            payment={selectedPayment}
            isOpen={isRefundModalOpen}
            onClose={() => {
              setIsRefundModalOpen(false);
              setSelectedPayment(null);
            }}
            onSuccess={handleRefundSuccess}
          />
        )}

        {/* Payment Detail Sheet */}
        <PaymentDetailSheet
          open={isDetailSheetOpen}
          onOpenChange={(open) => {
            setIsDetailSheetOpen(open);
            if (!open) setSelectedPayment(null);
          }}
          payment={selectedPayment}
        />
      </div>
    </div>
  );
}
