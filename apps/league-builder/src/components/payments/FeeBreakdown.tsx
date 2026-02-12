'use client';

/**
 * Fee Breakdown Component
 *
 * Player-facing display showing:
 * - Fee amount with discounts/late fees
 * - Payment plan options
 * - Calculated totals
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Check, Clock, Gift, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import type { SeasonFee } from '@/lib/payments/types';

// ============================================================================
// Types
// ============================================================================

interface FeeBreakdownProps {
  fee: SeasonFee;
  showPaymentPlans?: boolean;
  selectedPlan?: 'full' | 'two_pay' | 'three_pay';
  onPlanSelect?: (plan: 'full' | 'two_pay' | 'three_pay') => void;
  className?: string;
}

interface CalculatedFee {
  baseAmount: number;
  discount: number;
  lateFee: number;
  installmentFee: number;
  total: number;
  discountReason?: 'early_bird' | 'none';
  isLate: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatCurrency(cents: number, currency: string = 'usd'): string {
  const symbol = currency === 'cad' ? 'CA$' : '$';
  return `${symbol}${centsToDollars(cents)}`;
}

function calculateFeeAmount(fee: SeasonFee): CalculatedFee {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let discount = 0;
  let discountReason: 'early_bird' | 'none' = 'none';
  let lateFee = 0;
  let isLate = false;

  // Check early bird discount
  if (fee.early_bird_deadline && fee.early_bird_discount_cents > 0) {
    const earlyBirdDate = new Date(fee.early_bird_deadline);
    earlyBirdDate.setHours(0, 0, 0, 0);

    if (today <= earlyBirdDate) {
      discount = fee.early_bird_discount_cents;
      discountReason = 'early_bird';
    }
  }

  // Check late fee
  if (fee.payment_deadline && fee.late_fee_cents > 0) {
    const deadlineDate = new Date(fee.payment_deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (today > deadlineDate) {
      lateFee = fee.late_fee_cents;
      isLate = true;
    }
  }

  const total = fee.amount_cents - discount + lateFee;

  return {
    baseAmount: fee.amount_cents,
    discount,
    lateFee,
    installmentFee: 0, // Calculated per plan
    total,
    discountReason,
    isLate,
  };
}

function calculateInstallmentAmount(
  total: number,
  installments: number,
  installmentFeeCents: number
): { perPayment: number; totalWithFees: number } {
  const totalWithFees = total + installmentFeeCents * installments;
  const perPayment = Math.ceil(totalWithFees / installments);

  return {
    perPayment,
    totalWithFees,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function FeeBreakdown({
  fee,
  showPaymentPlans = true,
  selectedPlan = 'full',
  onPlanSelect,
  className,
}: FeeBreakdownProps) {
  const t = useTranslations('payments.feeBreakdown');
  const calculated = calculateFeeAmount(fee);

  // Calculate payment plan details
  const fullPayment = {
    amount: calculated.total,
    installments: 1,
  };

  const twoPayPlan = fee.allow_two_pay
    ? calculateInstallmentAmount(calculated.total, 2, fee.installment_fee_cents)
    : null;

  const threePayPlan = fee.allow_three_pay
    ? calculateInstallmentAmount(calculated.total, 3, fee.installment_fee_cents)
    : null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Fee Header */}
      <div>
        <h3 className="text-xl font-bold text-white mb-2">{fee.name}</h3>
        {fee.description && <p className="text-sm text-neutral-400">{fee.description}</p>}
      </div>

      {/* Fee Breakdown */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5 space-y-3">
        {/* Base Amount */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-700">
          <span className="text-neutral-400">{t('baseRegistrationFee')}</span>
          <span className="text-lg font-semibold text-white">
            {formatCurrency(calculated.baseAmount, fee.currency)}
          </span>
        </div>

        {/* Early Bird Discount */}
        {calculated.discount > 0 && (
          <div className="flex items-center justify-between text-green-400">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              <span className="text-sm">{t('earlyBirdDiscount')}</span>
            </div>
            <span className="font-semibold">
              -{formatCurrency(calculated.discount, fee.currency)}
            </span>
          </div>
        )}

        {/* Show early bird info if not yet qualified */}
        {!calculated.discount &&
          fee.early_bird_deadline &&
          fee.early_bird_discount_cents > 0 &&
          new Date(fee.early_bird_deadline) >= new Date() && (
            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <div className="text-xs text-green-400">
                <div className="font-semibold mb-1">{t('earlyBirdAvailable')}</div>
                <div>
                  {t('registerBySave', { date: new Date(fee.early_bird_deadline).toLocaleDateString(), amount: formatCurrency(fee.early_bird_discount_cents, fee.currency) })}
                </div>
              </div>
            </div>
          )}

        {/* Late Fee */}
        {calculated.lateFee > 0 && (
          <div className="flex items-center justify-between text-orange-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{t('lateRegistrationFee')}</span>
            </div>
            <span className="font-semibold">
              +{formatCurrency(calculated.lateFee, fee.currency)}
            </span>
          </div>
        )}

        {/* Show late fee warning if deadline approaching */}
        {!calculated.isLate && fee.payment_deadline && fee.late_fee_cents > 0 && (
          <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            <div className="text-xs text-orange-400">
              <div className="font-semibold mb-1">{t('paymentDeadline')}</div>
              <div>
                {t('registerByAvoidFee', { date: new Date(fee.payment_deadline).toLocaleDateString(), amount: formatCurrency(fee.late_fee_cents, fee.currency) })}
              </div>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-700">
          <span className="font-semibold text-white">{t('totalDue')}</span>
          <span className="text-2xl font-bold text-rink-500">
            {formatCurrency(calculated.total, fee.currency)}
          </span>
        </div>
      </div>

      {/* Payment Plans */}
      {showPaymentPlans && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-neutral-400" />
            <h4 className="text-sm font-semibold text-white">{t('choosePaymentPlan')}</h4>
          </div>

          <div className="space-y-2">
            {/* Full Payment */}
            {fee.allow_full_payment && (
              <button
                type="button"
                onClick={() => onPlanSelect?.('full')}
                className={cn(
                  'w-full p-4 rounded-lg border-2 transition-all text-left',
                  selectedPlan === 'full'
                    ? 'border-rink-500 bg-rink-500/10'
                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{t('payInFull')}</span>
                      {selectedPlan === 'full' && (
                        <Check className="w-4 h-4 text-rink-500" />
                      )}
                    </div>
                    <div className="text-xs text-neutral-400">{t('singlePayment')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(fullPayment.amount, fee.currency)}
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* 2 Payments */}
            {twoPayPlan && (
              <button
                type="button"
                onClick={() => onPlanSelect?.('two_pay')}
                className={cn(
                  'w-full p-4 rounded-lg border-2 transition-all text-left',
                  selectedPlan === 'two_pay'
                    ? 'border-rink-500 bg-rink-500/10'
                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{t('twoPayments')}</span>
                      {selectedPlan === 'two_pay' && (
                        <Check className="w-4 h-4 text-rink-500" />
                      )}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {t('perPayment', { amount: formatCurrency(twoPayPlan.perPayment, fee.currency) })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(twoPayPlan.totalWithFees, fee.currency)}
                    </div>
                    {fee.installment_fee_cents > 0 && (
                      <div className="text-xs text-neutral-500">
                        {t('fees', { amount: formatCurrency(fee.installment_fee_cents * 2, fee.currency) })}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )}

            {/* 3 Payments */}
            {threePayPlan && (
              <button
                type="button"
                onClick={() => onPlanSelect?.('three_pay')}
                className={cn(
                  'w-full p-4 rounded-lg border-2 transition-all text-left',
                  selectedPlan === 'three_pay'
                    ? 'border-rink-500 bg-rink-500/10'
                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{t('threePayments')}</span>
                      {selectedPlan === 'three_pay' && (
                        <Check className="w-4 h-4 text-rink-500" />
                      )}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {t('perPayment', { amount: formatCurrency(threePayPlan.perPayment, fee.currency) })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(threePayPlan.totalWithFees, fee.currency)}
                    </div>
                    {fee.installment_fee_cents > 0 && (
                      <div className="text-xs text-neutral-500">
                        {t('fees', { amount: formatCurrency(fee.installment_fee_cents * 3, fee.currency) })}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Deadline Info */}
      {fee.payment_deadline && (
        <div className="flex items-start gap-2 p-3 bg-neutral-800/50 rounded-lg">
          <Calendar className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
          <div className="text-xs text-neutral-400">
            <div className="font-semibold mb-1">{t('paymentDeadline')}</div>
            <div>{new Date(fee.payment_deadline).toLocaleDateString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
