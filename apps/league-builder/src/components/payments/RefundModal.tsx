'use client';

/**
 * Refund Modal Component
 *
 * Modal for league admins to process refunds for player payments.
 * Supports full and partial refunds with reason selection.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  DollarSign,
  User,
  Info,
} from 'lucide-react';
import { refundPlayerPayment } from '@/lib/payments/payment-actions';
import type { PlayerPaymentWithDetails, RefundResult } from '@/lib/payments/types';

interface RefundModalProps {
  payment: PlayerPaymentWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: RefundResult) => void;
}

type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer';

const REFUND_REASONS: { value: RefundReason; labelKey: string; descKey: string }[] = [
  {
    value: 'requested_by_customer',
    labelKey: 'requestedByPlayer',
    descKey: 'requestedByPlayerDesc',
  },
  {
    value: 'duplicate',
    labelKey: 'duplicatePayment',
    descKey: 'duplicatePaymentDesc',
  },
  {
    value: 'fraudulent',
    labelKey: 'fraudulent',
    descKey: 'fraudulentDesc',
  },
];

export function RefundModal({ payment, isOpen, onClose, onSuccess }: RefundModalProps) {
  const t = useTranslations('payments.refund');
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialAmountDollars, setPartialAmountDollars] = useState('');
  const [reason, setReason] = useState<RefundReason>('requested_by_customer');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxRefundCents = payment.amount_paid_cents;
  const maxRefundDollars = (maxRefundCents / 100).toFixed(2);

  const refundAmountCents =
    refundType === 'full'
      ? maxRefundCents
      : Math.min(
          Math.round(parseFloat(partialAmountDollars || '0') * 100),
          maxRefundCents
        );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (refundType === 'partial') {
      if (!partialAmountDollars || refundAmountCents <= 0) {
        setError(t('invalidAmount'));
        return;
      }
      if (refundAmountCents > maxRefundCents) {
        setError(t('exceedsMax', { amount: maxRefundDollars }));
        return;
      }
    }

    setLoading(true);

    try {
      const result = await refundPlayerPayment({
        playerPaymentId: payment.id,
        amountCents: refundType === 'partial' ? refundAmountCents : undefined,
        reason,
        notes: notes || undefined,
      });

      if (result.success) {
        onSuccess?.(result.data);
        onClose();
      } else {
        setError(result.error);
      }
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setRefundType('full');
      setPartialAmountDollars('');
      setReason('requested_by_customer');
      setNotes('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-neutral-800 border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('title')}</h2>
              <p className="text-sm text-neutral-400">{t('subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Payment Info */}
            <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-rink-500/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-rink-500" />
                </div>
                <div>
                  <p className="font-medium text-white">{payment.player.full_name}</p>
                  <p className="text-sm text-neutral-400">{payment.player.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500">{t('fee')}</p>
                  <p className="text-white">{payment.season_fee.name}</p>
                </div>
                <div>
                  <p className="text-neutral-500">{t('amountPaid')}</p>
                  <p className="text-white font-medium">
                    ${(payment.amount_paid_cents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Refund Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                {t('refundAmount')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRefundType('full')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    refundType === 'full'
                      ? 'bg-rink-500/10 border-rink-500/50'
                      : 'bg-neutral-900/50 border-neutral-700 hover:border-rink-500/30'
                  }`}
                >
                  <p
                    className={`font-medium ${
                      refundType === 'full' ? 'text-rink-500' : 'text-neutral-300'
                    }`}
                  >
                    {t('fullRefund')}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    ${maxRefundDollars}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundType('partial')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    refundType === 'partial'
                      ? 'bg-rink-500/10 border-rink-500/50'
                      : 'bg-neutral-900/50 border-neutral-700 hover:border-rink-500/30'
                  }`}
                >
                  <p
                    className={`font-medium ${
                      refundType === 'partial' ? 'text-rink-500' : 'text-neutral-300'
                    }`}
                  >
                    {t('partialRefund')}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{t('customAmount')}</p>
                </button>
              </div>
            </div>

            {/* Partial Amount Input */}
            {refundType === 'partial' && (
              <div>
                <label
                  htmlFor="partialAmount"
                  className="block text-sm font-medium text-neutral-300 mb-2"
                >
                  {t('refundAmount')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    $
                  </span>
                  <input
                    type="number"
                    id="partialAmount"
                    value={partialAmountDollars}
                    onChange={(e) => setPartialAmountDollars(e.target.value)}
                    min="0.01"
                    max={maxRefundDollars}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-black/50 border border-rink-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent transition-all"
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {t('maxRefundable', { amount: `$${maxRefundDollars}` })}
                </p>
              </div>
            )}

            {/* Refund Reason */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                {t('reasonForRefund')}
              </label>
              <div className="space-y-2">
                {REFUND_REASONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReason(option.value)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      reason === option.value
                        ? 'bg-rink-500/10 border-rink-500/50'
                        : 'bg-neutral-900/50 border-neutral-700 hover:border-rink-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          reason === option.value
                            ? 'border-rink-500 bg-rink-500'
                            : 'border-neutral-500'
                        }`}
                      >
                        {reason === option.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </div>
                      <div>
                        <p
                          className={`font-medium ${
                            reason === option.value
                              ? 'text-rink-500'
                              : 'text-neutral-300'
                          }`}
                        >
                          {t(option.labelKey)}
                        </p>
                        <p className="text-xs text-neutral-500">{t(option.descKey)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-neutral-300 mb-2"
              >
                {t('notesOptional')}
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={t('notesPlaceholder')}
                className="w-full px-4 py-3 bg-black/50 border border-rink-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-200 font-medium">
                    {t('refundImmediate')}
                  </p>
                  <p className="text-xs text-amber-200/70 mt-1">
                    {t('refundImmediateDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-300">
                  {t('refundSummary')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">{t('amountToRefund')}</span>
                <span className="text-xl font-bold text-white">
                  ${(refundAmountCents / 100).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                <Info className="h-3 w-3 inline mr-1" />
                {t('platformFeeRefund')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-neutral-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-3 px-6 border border-neutral-600 text-neutral-300 font-medium rounded-xl hover:bg-neutral-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || refundAmountCents <= 0}
              className="flex-1 py-3 px-6 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  {t('processRefund')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RefundModal;
