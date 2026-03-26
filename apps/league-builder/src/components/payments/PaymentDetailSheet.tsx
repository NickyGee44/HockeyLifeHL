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
  Archive,
  Trash2,
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
  onSendReminder?: (payment: PlayerPaymentWithDetails) => void;
  onMarkAsPaid?: (payment: PlayerPaymentWithDetails) => void;
  onRefund?: (payment: PlayerPaymentWithDetails) => void;
  onArchive?: (payment: PlayerPaymentWithDetails) => void;
  canPermanentlyDelete?: boolean;
  onRequestPermanentDelete?: (payment: PlayerPaymentWithDetails) => void;
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
  onSendReminder,
  onMarkAsPaid,
  onRefund,
  onArchive,
  canPermanentlyDelete = false,
  onRequestPermanentDelete,
}: PaymentDetailSheetProps) {
  const t = useTranslations('payments.detailSheet');
  const tStatus = useTranslations('payments.history.statusLabels');
  const tTable = useTranslations('payments.statusTable');

  if (!payment) return null;

  const StatusIcon = STATUS_ICON[payment.status];
  const progressPercent =
    payment.total_amount_cents > 0
      ? Math.round((payment.amount_paid_cents / payment.total_amount_cents) * 100)
      : 0;

  const canRemind = ['pending', 'partially_paid', 'overdue'].includes(payment.status);
  const canMarkPaid = ['pending', 'partially_paid', 'overdue'].includes(payment.status);
  const canRefund = ['paid', 'partially_paid'].includes(payment.status) && payment.amount_paid_cents > 0;
  const canArchive =
    !payment.archived_at &&
    payment.amount_paid_cents <= 0 &&
    ['pending', 'overdue', 'cancelled', 'failed'].includes(payment.status);

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

            {payment.archived_at && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="flex items-start gap-3">
                  <Archive className="mt-0.5 h-4 w-4 text-amber-300" />
                  <div>
                    <p className="text-sm font-semibold text-amber-200">{t('archivedTitle')}</p>
                    <p className="mt-1 text-sm text-amber-100/80">
                      {t('archivedOn', { date: formatDate(payment.archived_at) })}
                    </p>
                    {payment.archived_reason && (
                      <p className="mt-2 text-sm text-amber-100">
                        {payment.archived_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

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

            <div className="rounded-xl border border-white/[0.06] bg-neutral-800/50 p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <h4 className="text-sm font-medium text-neutral-300">{t('summaryTitle')}</h4>
              </div>
              <div className="mt-4 space-y-2 text-sm">
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

            <div className="rounded-xl border border-white/[0.06] bg-neutral-800/50 p-4">
              <h4 className="text-sm font-medium text-neutral-300">{t('timelineTitle')}</h4>
              <div className="mt-4 space-y-3">
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
            </div>

            {payment.notes && (
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-neutral-300 mb-2">{t('notes')}</h4>
                <p className="text-sm text-neutral-400 whitespace-pre-wrap">{payment.notes}</p>
              </div>
            )}

            <div className="bg-neutral-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-neutral-300 mb-1">{t('feeName')}</h4>
              <p className="text-sm text-white">{payment.season_fee.name}</p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-neutral-800/50 p-4">
              <h4 className="text-sm font-medium text-neutral-300">{t('actionsTitle')}</h4>
              <p className="mt-1 text-sm text-neutral-400">{t('actionsDescription')}</p>
              <div className="mt-4 grid gap-3">
                {canRemind && onSendReminder && (
                  <button
                    type="button"
                    onClick={() => onSendReminder(payment)}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-black/30"
                  >
                    <span>{tTable('sendReminder')}</span>
                    <Mail className="h-4 w-4 text-neutral-400" />
                  </button>
                )}
                {canMarkPaid && onMarkAsPaid && (
                  <button
                    type="button"
                    onClick={() => onMarkAsPaid(payment)}
                    className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15"
                  >
                    <span>{tTable('markAsPaid')}</span>
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                {canRefund && onRefund && (
                  <button
                    type="button"
                    onClick={() => onRefund(payment)}
                    className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/15"
                  >
                    <span>{tTable('issueRefund')}</span>
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                {canArchive && onArchive && (
                  <button
                    type="button"
                    onClick={() => onArchive(payment)}
                    className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-400/15"
                  >
                    <span>{tTable('archivePayment')}</span>
                    <Archive className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {payment.archived_at && canPermanentlyDelete && onRequestPermanentDelete && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-200">{t('permanentDeleteTitle')}</p>
                <p className="mt-1 text-sm text-red-100/80">
                  {t('permanentDeleteDescription')}
                </p>
                <button
                  type="button"
                  onClick={() => onRequestPermanentDelete(payment)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('permanentDelete')}
                </button>
              </div>
            )}
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
