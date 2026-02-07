'use client';

/**
 * Payment History Card Component
 *
 * Displays a player's payment history including all transactions.
 * Shows payment progress, installments, and transaction details.
 */

import { useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  XCircle,
  CreditCard,
  Receipt,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import type {
  PlayerPayment,
  PaymentTransaction,
  PlayerPaymentStatus,
  PaymentTransactionType,
} from '@/lib/payments/types';

interface PaymentHistoryCardProps {
  payment: PlayerPayment;
  transactions: PaymentTransaction[];
  feeName: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  PlayerPaymentStatus,
  { label: string; icon: typeof CheckCircle; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-500',
  },
  processing: {
    label: 'Processing',
    icon: RefreshCw,
    className: 'bg-blue-500/10 text-blue-500',
  },
  paid: {
    label: 'Paid in Full',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-500',
  },
  partially_paid: {
    label: 'Partially Paid',
    icon: CreditCard,
    className: 'bg-amber-500/10 text-amber-500',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-500',
  },
  refunded: {
    label: 'Refunded',
    icon: RefreshCw,
    className: 'bg-purple-500/10 text-purple-500',
  },
  partially_refunded: {
    label: 'Partially Refunded',
    icon: RefreshCw,
    className: 'bg-purple-500/10 text-purple-500',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-neutral-500/10 text-neutral-500',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-500',
  },
  disputed: {
    label: 'Disputed',
    icon: AlertCircle,
    className: 'bg-orange-500/10 text-orange-500',
  },
};

const TRANSACTION_TYPE_CONFIG: Record<
  PaymentTransactionType,
  { label: string; icon: typeof ArrowDownRight; positive: boolean }
> = {
  payment: { label: 'Payment', icon: ArrowDownRight, positive: true },
  installment: { label: 'Installment', icon: ArrowDownRight, positive: true },
  refund: { label: 'Refund', icon: ArrowUpRight, positive: false },
  late_fee: { label: 'Late Fee', icon: ArrowDownRight, positive: true },
  adjustment: { label: 'Adjustment', icon: RefreshCw, positive: true },
};

export function PaymentHistoryCard({
  payment,
  transactions,
  feeName,
  className = '',
}: PaymentHistoryCardProps) {
  const statusConfig = STATUS_CONFIG[payment.status];
  const StatusIcon = statusConfig.icon;

  const progressPercent = useMemo(() => {
    if (payment.total_amount_cents === 0) return 0;
    return Math.round((payment.amount_paid_cents / payment.total_amount_cents) * 100);
  }, [payment.amount_paid_cents, payment.total_amount_cents]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [transactions]);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={`bg-neutral-800 border border-white/10 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rink-500/10 rounded-full flex items-center justify-center">
              <Receipt className="h-5 w-5 text-rink-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{feeName}</h3>
              <p className="text-sm text-neutral-400">
                {payment.payment_plan === 'full'
                  ? 'Full Payment'
                  : payment.payment_plan === 'two_pay'
                    ? '2-Pay Plan'
                    : '3-Pay Plan'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${statusConfig.className}`}
          >
            <StatusIcon className="h-4 w-4" />
            {statusConfig.label}
          </span>
        </div>

        {/* Payment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Payment Progress</span>
            <span className="text-white">
              {formatCurrency(payment.amount_paid_cents)} /{' '}
              {formatCurrency(payment.total_amount_cents)}
            </span>
          </div>
          <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progressPercent >= 100 ? 'bg-green-500' : 'bg-rink-500'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>
              Installment {payment.current_installment} of {payment.total_installments}
            </span>
            <span>{progressPercent}% complete</span>
          </div>
        </div>

        {/* Remaining / Next Payment */}
        {payment.status !== 'paid' &&
          payment.status !== 'cancelled' &&
          payment.status !== 'refunded' && (
            <div className="mt-4 pt-4 border-t border-neutral-700 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500 mb-1">Remaining Balance</p>
                <p className="text-lg font-semibold text-rink-500">
                  {formatCurrency(payment.total_amount_cents - payment.amount_paid_cents)}
                </p>
              </div>
              {payment.next_payment_date && (
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Next Payment Due</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <p className="text-sm text-white">
                      {formatDate(payment.next_payment_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Transaction History */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-neutral-300 mb-4">Transaction History</h4>

        {sortedTransactions.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-4">
            No transactions yet
          </p>
        ) : (
          <div className="space-y-3">
            {sortedTransactions.map((transaction) => {
              const typeConfig = TRANSACTION_TYPE_CONFIG[transaction.transaction_type];
              const TypeIcon = typeConfig.icon;
              const isPositive =
                typeConfig.positive && transaction.transaction_type !== 'refund';

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isPositive
                          ? 'bg-green-500/10'
                          : transaction.status === 'failed'
                            ? 'bg-red-500/10'
                            : 'bg-purple-500/10'
                      }`}
                    >
                      <TypeIcon
                        className={`h-4 w-4 ${
                          isPositive
                            ? 'text-green-500'
                            : transaction.status === 'failed'
                              ? 'text-red-500'
                              : 'text-purple-500'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {typeConfig.label}
                        {transaction.installment_number &&
                          ` #${transaction.installment_number}`}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(transaction.created_at)} at{' '}
                        {formatTime(transaction.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        isPositive
                          ? 'text-green-400'
                          : transaction.status === 'failed'
                            ? 'text-red-400'
                            : 'text-purple-400'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                      {formatCurrency(transaction.amount_cents)}
                    </p>
                    <p
                      className={`text-xs ${
                        transaction.status === 'succeeded'
                          ? 'text-green-500'
                          : transaction.status === 'failed'
                            ? 'text-red-500'
                            : transaction.status === 'pending'
                              ? 'text-yellow-500'
                              : 'text-neutral-500'
                      }`}
                    >
                      {transaction.status.charAt(0).toUpperCase() +
                        transaction.status.slice(1)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Details Footer */}
      {payment.paid_at && (
        <div className="px-6 pb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
            <p className="text-sm text-green-400">
              <CheckCircle className="h-4 w-4 inline mr-1.5" />
              Paid in full on {formatDate(payment.paid_at)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentHistoryCard;
