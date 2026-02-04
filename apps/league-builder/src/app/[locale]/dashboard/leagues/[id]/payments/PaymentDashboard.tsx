'use client';

/**
 * Payment Dashboard Component
 *
 * Main dashboard for league owners to track and manage player payments.
 * Features:
 * - Payment summary stats
 * - Payment status table with filtering and search
 * - Send payment reminders
 * - Process refunds
 * - Export payment reports
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  Download,
  RefreshCw,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PaymentStatusTable } from '@/components/payments/PaymentStatusTable';
import { RefundModal } from '@/components/payments/RefundModal';
import { PaymentReportExport } from '@/components/payments/PaymentReportExport';
import { sendPaymentReminder } from '@/lib/payments/payment-actions';
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
  hasStripeConnected,
}: PaymentDashboardProps) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState<PlayerPaymentWithDetails | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const handleSeasonChange = (seasonId: string) => {
    router.push(`/${locale}/dashboard/leagues/${leagueId}/payments?season=${seasonId}`);
  };

  const handleSendReminder = async (payment: PlayerPaymentWithDetails) => {
    setSendingReminder(payment.id);
    try {
      const result = await sendPaymentReminder(payment.id);
      if (result.success) {
        // Show success toast (you can add a toast library)
        alert('Payment reminder sent successfully!');
        router.refresh();
      } else {
        alert(`Failed to send reminder: ${result.error}`);
      }
    } catch (error) {
      alert('An unexpected error occurred');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleRefundClick = (payment: PlayerPaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsRefundModalOpen(true);
  };

  const handleRefundSuccess = (result: RefundResult) => {
    // Show success toast
    alert(`Refund processed: $${(result.amountRefunded / 100).toFixed(2)}`);
    router.refresh();
  };

  const totalPages = Math.ceil(total / limit);

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
            Back to League
          </Link>

          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Stripe Connect Not Set Up</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              To start collecting player payments, you need to connect your Stripe account first.
            </p>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/billing`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-rink-500/20 transition-all"
            >
              <DollarSign className="w-5 h-5" />
              Set Up Payments
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
            Back to League
          </Link>

          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-rink-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-rink-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Seasons Found</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              Create a season first to start tracking player payments.
            </p>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-rink-500/20 transition-all"
            >
              Create Season
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
            Back to League
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Payment Tracking</h1>
              <p className="text-neutral-400 mt-1">{leagueName}</p>
            </div>

            {/* Season Selector */}
            {seasons.length > 1 && (
              <div>
                <label htmlFor="season" className="sr-only">
                  Select Season
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

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Total Collected */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-neutral-400">Total Collected</span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${(summary.totalCollectedCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                of ${(summary.totalExpectedCents / 100).toFixed(2)} expected
              </p>
            </div>

            {/* Pending Payments */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-500" />
                </div>
                <span className="text-sm text-neutral-400">Pending</span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${(summary.totalOutstandingCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {summary.playersPending} players pending
              </p>
            </div>

            {/* Overdue Payments */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm text-neutral-400">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-white">{summary.playersOverdue}</p>
              <p className="text-xs text-neutral-500 mt-1">players overdue</p>
            </div>

            {/* Paid in Full */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-rink-500/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-rink-500" />
                </div>
                <span className="text-sm text-neutral-400">Paid in Full</span>
              </div>
              <p className="text-2xl font-bold text-white">{summary.playersPaidFull}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {summary.playersPartial} partially paid
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
          onRefund={handleRefundClick}
          onSendReminder={handleSendReminder}
          isLoading={false}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Showing {(currentPage - 1) * limit + 1} to{' '}
              {Math.min(currentPage * limit, total)} of {total} payments
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
                Page {currentPage} of {totalPages}
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
      </div>
    </div>
  );
}
