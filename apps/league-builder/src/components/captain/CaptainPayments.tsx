'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Loader2,
} from 'lucide-react';
import { getTeamPayments, getTeamPaymentSummary } from '@/lib/payments/payment-actions';
import type { PlayerPaymentWithDetails, PaymentSummary } from '@/lib/payments/types';

interface CaptainPaymentsProps {
  teamId: string;
}

const STATUS_CLASS_MAP: Record<string, string> = {
  paid: 'bg-green-500/10 text-green-400 border-green-500/30',
  partially_paid: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  pending: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  overdue: 'bg-red-500/10 text-red-400 border-red-500/30',
  refunded: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  cancelled: 'bg-neutral-500/10 text-neutral-500 border-neutral-600/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
  disputed: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  paid: 'paid',
  partially_paid: 'partiallyPaid',
  pending: 'pending',
  processing: 'processing',
  overdue: 'overdue',
  refunded: 'refunded',
  cancelled: 'cancelled',
  failed: 'failed',
  disputed: 'disputed',
};

export default function CaptainPayments({ teamId }: CaptainPaymentsProps) {
  const t = useTranslations('captain.payments');
  const [payments, setPayments] = useState<PlayerPaymentWithDetails[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const [paymentsResult, summaryResult] = await Promise.all([
        getTeamPayments(teamId),
        getTeamPaymentSummary(teamId),
      ]);

      if (paymentsResult.success) {
        setPayments(paymentsResult.data.payments);
      } else {
        setError(paymentsResult.error);
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }

      setLoading(false);
    }

    loadData();
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-500" />
        <p className="text-neutral-400">{error}</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-16 h-16 mx-auto mb-4 text-neutral-600" />
        <h3 className="text-lg font-bold text-white mb-2">{t('noFeesTitle')}</h3>
        <p className="text-neutral-400">
          {t('noFeesDescription')}
        </p>
      </div>
    );
  }

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title={t('totalDue')}
            value={formatCents(summary.totalExpectedCents)}
            icon={<DollarSign className="w-5 h-5 text-rink-500" />}
            subtitle={`${summary.playersPaidFull + summary.playersPartial + summary.playersPending + summary.playersOverdue} ${t('players')}`}
          />
          <SummaryCard
            title={t('collected')}
            value={formatCents(summary.totalCollectedCents)}
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            subtitle={t('fullyPaid', { count: summary.playersPaidFull })}
          />
          <SummaryCard
            title={t('outstanding')}
            value={formatCents(summary.totalOutstandingCents)}
            icon={<Clock className="w-5 h-5 text-yellow-500" />}
            subtitle={t('pendingCount', { count: summary.playersPartial + summary.playersPending })}
          />
          <SummaryCard
            title={t('overdue')}
            value={summary.playersOverdue}
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            subtitle={t('players')}
            highlight={summary.playersOverdue > 0}
          />
        </div>
      )}

      {/* Progress Bar */}
      {summary && summary.totalExpectedCents > 0 && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-400">{t('collectionProgress')}</span>
            <span className="text-sm font-medium text-white">
              {Math.round((summary.totalCollectedCents / summary.totalExpectedCents) * 100)}%
            </span>
          </div>
          <div className="w-full h-3 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rink-500 to-arena-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (summary.totalCollectedCents / summary.totalExpectedCents) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Payment Table */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('playerPayments')}
        </h3>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">
                    {t('playerHeader')}
                  </th>
                  <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">
                    {t('feeHeader')}
                  </th>
                  <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">
                    {t('amountHeader')}
                  </th>
                  <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">
                    {t('paidHeader')}
                  </th>
                  <th className="text-center text-xs font-medium text-neutral-500 uppercase tracking-wider px-4 py-3">
                    {t('statusHeader')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700/50">
                {payments.map((payment) => {
                  const statusClassName = STATUS_CLASS_MAP[payment.status] || STATUS_CLASS_MAP.pending;
                  const statusLabelKey = STATUS_LABEL_KEYS[payment.status] || STATUS_LABEL_KEYS.pending;
                  const progress = payment.total_amount_cents > 0
                    ? Math.round((payment.amount_paid_cents / payment.total_amount_cents) * 100)
                    : 0;

                  return (
                    <tr key={payment.id} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {payment.player?.avatar_url ? (
                            <img
                              src={payment.player.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-300">
                              {(payment.player?.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-white">
                              {payment.player?.full_name || t('unknown')}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {payment.player?.email || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-neutral-300">
                          {payment.season_fee?.name || t('seasonFee')}
                        </div>
                        <div className="text-xs text-neutral-500 capitalize">
                          {t('paymentPlan', { plan: payment.payment_plan.replace('_', '-') })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-medium text-white">
                          {formatCents(payment.total_amount_cents)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-neutral-300">
                          {formatCents(payment.amount_paid_cents)}
                        </div>
                        {payment.total_amount_cents > 0 && (
                          <div className="w-16 h-1.5 bg-neutral-700 rounded-full overflow-hidden ml-auto mt-1">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                progress >= 100 ? 'bg-green-500' : progress > 0 ? 'bg-yellow-500' : 'bg-neutral-600'
                              )}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 text-xs font-medium rounded-full border',
                            statusClassName
                          )}
                        >
                          {t(`status.${statusLabelKey}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-4 border transition-all',
        highlight
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-neutral-800/50 border-neutral-700'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {subtitle && (
        <div
          className={cn(
            'text-xs',
            highlight ? 'text-red-400' : 'text-neutral-500'
          )}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
