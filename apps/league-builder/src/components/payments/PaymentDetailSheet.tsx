'use client';

/**
 * Payment Detail Sheet
 *
 * Slide-over panel showing detailed payment information.
 * Uses Dialog styled as a right-side sheet.
 */

import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DollarSign,
  User,
  Users,
  Calendar,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  XCircle,
  FileText,
} from 'lucide-react';
import type {
  PlayerPaymentWithDetails,
  PlayerPaymentStatus,
  PaymentPlanType,
} from '@/lib/payments/types';

interface PaymentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PlayerPaymentWithDetails | null;
}

const STATUS_ICON: Record<PlayerPaymentStatus, typeof CheckCircle> = {
  pending: Clock,
  processing: RefreshCw,
  paid: CheckCircle,
  partially_paid: DollarSign,
  overdue: AlertCircle,
  refunded: RefreshCw,
  partially_refunded: RefreshCw,
  cancelled: XCircle,
  failed: XCircle,
  disputed: AlertCircle,
};

const STATUS_CLASS: Record<PlayerPaymentStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  processing: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  paid: 'bg-green-500/10 text-green-500 border-green-500/30',
  partially_paid: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  overdue: 'bg-red-500/10 text-red-500 border-red-500/30',
  refunded: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  partially_refunded: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  cancelled: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/30',
  failed: 'bg-red-500/10 text-red-500 border-red-500/30',
  disputed: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
};

const PLAN_LABELS: Record<PaymentPlanType, string> = {
  full: 'Full Payment',
  two_pay: '2-Payment Plan',
  three_pay: '3-Payment Plan',
};

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PaymentDetailSheet({
  open,
  onOpenChange,
  payment,
}: PaymentDetailSheetProps) {
  const t = useTranslations('payments.detailSheet');
  const tStatus = useTranslations('payments.history.statusLabels');

  if (!payment) return null;

  const StatusIcon = STATUS_ICON[payment.status];
  const progressPercent =
    payment.total_amount_cents > 0
      ? Math.round((payment.amount_paid_cents / payment.total_amount_cents) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'bg-neutral-900 border-white/10 p-0',
          'fixed right-0 top-0 left-auto h-full max-h-full w-full max-w-md',
          'translate-x-0 translate-y-0 rounded-none sm:rounded-l-xl',
          'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          '!left-auto !top-0 !translate-x-0 !translate-y-0'
        )}
      >
        <div className="flex flex-col h-full max-h-screen overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <DialogTitle className="text-white text-lg font-bold">
              {t('title')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Player Info */}
            <div className="flex items-center gap-4">
              <img
                src={payment.player.avatar_url || '/blank_player.png'}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="text-lg font-semibold text-white">
                  {payment.player.full_name}
                </p>
                <p className="text-sm text-neutral-400">{payment.player.email}</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border ${STATUS_CLASS[payment.status]}`}
              >
                <StatusIcon className="h-4 w-4" />
                {tStatus(payment.status === 'partially_paid' ? 'partiallyPaid' : payment.status === 'partially_refunded' ? 'partiallyRefunded' : payment.status)}
              </span>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-400">{t('paymentProgress')}</span>
                <span className="text-white font-medium">{progressPercent}%</span>
              </div>
              <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    progressPercent >= 100
                      ? 'bg-green-500'
                      : progressPercent > 0
                        ? 'bg-gradient-to-r from-rink-500 to-arena-500'
                        : 'bg-neutral-600'
                  )}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {formatCurrency(payment.amount_paid_cents)} / {formatCurrency(payment.total_amount_cents)}
              </p>
            </div>

            {/* Amount Breakdown */}
            <div className="bg-neutral-800/50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('amountBreakdown')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('baseFee')}</span>
                  <span className="text-white">{formatCurrency(payment.base_amount_cents)}</span>
                </div>
                {payment.discount_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-400">{t('earlyBirdDiscount')}</span>
                    <span className="text-green-400">-{formatCurrency(payment.discount_cents)}</span>
                  </div>
                )}
                {payment.late_fee_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-400">{t('lateFee')}</span>
                    <span className="text-red-400">+{formatCurrency(payment.late_fee_cents)}</span>
                  </div>
                )}
                {payment.installment_fee_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t('installmentFee')}</span>
                    <span className="text-white">+{formatCurrency(payment.installment_fee_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-neutral-700 font-medium">
                  <span className="text-white">{t('total')}</span>
                  <span className="text-white">{formatCurrency(payment.total_amount_cents)}</span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              <DetailRow
                icon={Users}
                label={t('team')}
                value={payment.team?.name || t('noTeam')}
              />
              <DetailRow
                icon={FileText}
                label={t('paymentPlan')}
                value={PLAN_LABELS[payment.payment_plan]}
              />
              {payment.total_installments > 1 && (
                <DetailRow
                  icon={DollarSign}
                  label={t('installmentProgress')}
                  value={`${payment.current_installment} / ${payment.total_installments}`}
                />
              )}
              <DetailRow
                icon={Calendar}
                label={t('created')}
                value={formatDate(payment.created_at)}
              />
              {payment.paid_at && (
                <DetailRow
                  icon={CheckCircle}
                  label={t('paidOn')}
                  value={formatDate(payment.paid_at)}
                />
              )}
              {payment.next_payment_date && payment.status !== 'paid' && (
                <DetailRow
                  icon={Clock}
                  label={t('nextPaymentDue')}
                  value={formatDate(payment.next_payment_date)}
                />
              )}
              <DetailRow
                icon={Mail}
                label={t('remindersSent')}
                value={String(payment.reminder_sent_count || 0)}
              />
              {payment.last_reminder_sent_at && (
                <DetailRow
                  icon={Clock}
                  label={t('lastReminderSent')}
                  value={formatDate(payment.last_reminder_sent_at)}
                />
              )}
            </div>

            {/* Notes */}
            {payment.notes && (
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-neutral-300 mb-2">{t('notes')}</h4>
                <p className="text-sm text-neutral-400 whitespace-pre-wrap">{payment.notes}</p>
              </div>
            )}

            {/* Fee Name */}
            <div className="bg-neutral-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-neutral-300 mb-1">{t('feeName')}</h4>
              <p className="text-sm text-white">{payment.season_fee.name}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}
