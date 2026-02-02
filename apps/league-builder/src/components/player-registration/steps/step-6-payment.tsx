'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { CreditCard, Shield, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { cn } from '@hockey-life/ui/lib/utils';
import { useRegistrationContext } from '../registration-wizard-container';
import { createRegistrationPaymentIntent } from '@/lib/actions/player-registration';
import type { RegistrationFormData } from '@/lib/schemas/player-registration';

// Note: In a real implementation, you would integrate Stripe Elements here
// This is a simplified version showing the structure

export function Step6Payment() {
  const { registrationFee, leagueName, leagueId, seasonId } = useRegistrationContext();
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<RegistrationFormData>();

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = React.useState(false);

  const paymentStatus = watch('payment_status');

  // Format amount for display
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(registrationFee / 100);

  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      // In a real implementation, this would:
      // 1. Create a PaymentIntent via server action
      // 2. Use Stripe Elements to collect card details
      // 3. Confirm the payment with Stripe
      // 4. Update the form with the payment status

      const result = await createRegistrationPaymentIntent(
        leagueId,
        seasonId,
        registrationFee
      );

      if (!result.success) {
        setPaymentError(result.error);
        return;
      }

      // Simulate payment success (in real app, this would be after Stripe confirmation)
      setValue('payment_intent_id', result.data?.paymentIntentId);
      setValue('payment_status', 'completed');
      setValue('amount_cents', registrationFee);
      setPaymentSuccess(true);
    } catch (error) {
      setPaymentError('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // If payment is already completed
  if (paymentStatus === 'completed' || paymentSuccess) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Payment Complete
          </h2>
          <p className="text-neutral-400">
            Your registration fee has been processed
          </p>
        </div>

        {/* Success Card */}
        <div className="p-8 rounded-xl border border-green-500/30 bg-green-500/10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Payment Successful
          </h3>
          <p className="text-neutral-400 mb-4">
            {formattedAmount} has been charged to your card
          </p>
          <p className="text-sm text-green-400">
            Click "Continue" to complete your registration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Registration Fee
        </h2>
        <p className="text-neutral-400">
          Complete payment to finalize your registration for {leagueName}
        </p>
      </div>

      {/* Amount Card */}
      <div className="p-6 rounded-xl border border-neutral-700 bg-neutral-800/30">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-neutral-400">Registration Fee</p>
            <p className="text-3xl font-bold text-gold-500">{formattedAmount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-gold-500" />
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="space-y-2 py-4 border-t border-neutral-700">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Season registration</span>
            <span className="text-white">{formattedAmount}</span>
          </div>
        </div>

        <div className="flex justify-between text-lg font-semibold pt-4 border-t border-neutral-700">
          <span className="text-white">Total</span>
          <span className="text-gold-500">{formattedAmount}</span>
        </div>
      </div>

      {/* Payment Form Placeholder */}
      <div className="p-6 rounded-xl border border-neutral-700 bg-neutral-800/30 space-y-6">
        <div className="flex items-center gap-2 text-white mb-2">
          <CreditCard className="w-5 h-5 text-gold-500" />
          <h3 className="font-semibold">Payment Details</h3>
        </div>

        {/* Stripe Elements would go here */}
        <div className="p-4 rounded-lg border border-dashed border-neutral-600 bg-neutral-900/50 text-center">
          <p className="text-neutral-400 text-sm">
            Stripe Elements card form will be rendered here
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            (Card Number, Expiry, CVC)
          </p>
        </div>

        {/* Error Display */}
        {paymentError && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Payment Failed</p>
              <p className="text-sm text-neutral-300">{paymentError}</p>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <Button
          type="button"
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Pay {formattedAmount}
            </>
          )}
        </Button>

        {/* Security Note */}
        <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
          <Shield className="w-4 h-4" />
          <span>Secured by Stripe. Your card details are never stored.</span>
        </div>
      </div>

      {/* Refund Policy */}
      <div className="p-4 rounded-lg border border-neutral-700 bg-neutral-800/30">
        <h4 className="font-medium text-white mb-2">Refund Policy</h4>
        <p className="text-sm text-neutral-400">
          Registration fees are refundable up to 7 days before the season starts.
          After that, refunds may be prorated based on games played. Contact the
          league administrator for refund requests.
        </p>
      </div>
    </div>
  );
}
