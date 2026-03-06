'use client';

/**
 * Checkout Button Component
 *
 * Button that redirects players to Stripe Checkout to pay their fees.
 * Displays payment plan options and amounts before checkout.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Loader2, ExternalLink, Calendar, DollarSign } from 'lucide-react';
import { createCheckoutSession } from '@/lib/payments/payment-actions';
import type { PlayerPayment, PaymentPlanType } from '@/lib/payments/types';

interface CheckoutButtonProps {
  playerPayment: PlayerPayment;
  seasonFee: {
    id: string;
    name: string;
    amount_cents: number;
  };
  successUrl: string;
  cancelUrl: string;
  className?: string;
}

const PAYMENT_PLAN_INFO: Record<PaymentPlanType, { labelKey: string; installments: number }> = {
  full: { labelKey: 'payInFull', installments: 1 },
  two_pay: { labelKey: 'twoPayPlan', installments: 2 },
  three_pay: { labelKey: 'threePayPlan', installments: 3 },
};

export function CheckoutButton({
  playerPayment,
  seasonFee,
  successUrl,
  cancelUrl,
  className = '',
}: CheckoutButtonProps) {
  const t = useTranslations('payments.checkout');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planInfo = PAYMENT_PLAN_INFO[playerPayment.payment_plan];
  const remainingAmount = playerPayment.total_amount_cents - playerPayment.amount_paid_cents;
  const remainingInstallments = playerPayment.total_installments - playerPayment.current_installment;
  const installmentAmount = Math.ceil(remainingAmount / remainingInstallments);

  const handleCheckout = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await createCheckoutSession({
        playerPaymentId: playerPayment.id,
        successUrl,
        cancelUrl,
      });

      if (result.success) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.checkoutUrl;
      } else {
        setError(result.error);
      }
    } catch {
      setError(t('checkoutFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Already fully paid
  if (playerPayment.status === 'paid') {
    return (
      <div className={`bg-green-500/10 border border-green-500/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="font-medium text-green-400">{t('fullyPaid')}</p>
            <p className="text-sm text-green-400/70">
              {t('amountPaid', { amount: `$${(playerPayment.total_amount_cents / 100).toFixed(2)}` })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-800 border border-white/10 rounded-xl overflow-hidden ${className}`}>
      {/* Payment Summary */}
      <div className="p-4 border-b border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-white">{seasonFee.name}</h4>
          <span className="text-sm text-neutral-400">{t(planInfo.labelKey)}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-400">{t('totalAmount')}</span>
            <span className="text-white">
              ${(playerPayment.total_amount_cents / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">{t('amountPaidLabel')}</span>
            <span className="text-green-400">
              ${(playerPayment.amount_paid_cents / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-neutral-300">{t('remaining')}</span>
            <span className="text-rink-500">
              ${(remainingAmount / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Installment Info */}
        {remainingInstallments > 1 && (
          <div className="mt-3 pt-3 border-t border-neutral-700">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Calendar className="h-3 w-3" />
              <span>
                {t('paymentsRemaining', { count: remainingInstallments, amount: `$${(installmentAmount / 100).toFixed(2)}` })}
              </span>
            </div>
          </div>
        )}

        {/* Next Payment Date */}
        {playerPayment.next_payment_date && (
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
            <Calendar className="h-3 w-3" />
            <span>
              {t('nextPaymentDue', { date: new Date(playerPayment.next_payment_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }) })}
            </span>
          </div>
        )}
      </div>

      {/* Checkout Action */}
      <div className="p-4">
        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3 px-6 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('preparingCheckout')}
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              {t('pay', { amount: `$${(installmentAmount / 100).toFixed(2)}` })}
              <ExternalLink className="w-4 h-4 ml-1" />
            </>
          )}
        </button>

        <p className="mt-2 text-xs text-neutral-500 text-center">
          {t('securePayment')}
        </p>
      </div>
    </div>
  );
}

export default CheckoutButton;
