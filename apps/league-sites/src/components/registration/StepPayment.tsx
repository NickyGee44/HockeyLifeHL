'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { EmbeddedPaymentCheckout } from '@/components/payments/EmbeddedCheckout';
import type { RegistrationDraftData } from '@/lib/actions/registration';
import type { RegistrationPaymentMode } from '@/lib/registration/fee-collection-model';
import { saveRegistrationDraft } from '@/lib/actions/registration';
import { createPaymentDraft } from '@/lib/registration/payment';
import { getSessionPaymentIntentId } from '@/lib/actions/registration-payments';

interface StepPaymentProps {
  formData: RegistrationDraftData;
  registrationFee: number;
  paymentMode: RegistrationPaymentMode;
  leagueId: string;
  seasonId: string;
  leagueSlug: string;
  onUpdate: (updates: Partial<RegistrationDraftData>) => void;
  onNext?: () => void;
}

export function StepPayment({
  formData,
  registrationFee,
  paymentMode,
  leagueId,
  seasonId,
  leagueSlug,
  onUpdate,
  onNext,
}: StepPaymentProps) {
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const isPaid = formData.payment_status === 'completed';
  const isOptionalPayment = paymentMode === 'optional';

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);

  const handleInitiatePayment = async () => {
    setIsCreatingDraft(true);
    try {
      const draftId = await createPaymentDraft(
        saveRegistrationDraft,
        leagueId,
        seasonId,
        formData
      );
      if (draftId) setRegistrationId(draftId);
    } catch {
      // Error handled by the component
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const handlePaymentComplete = async () => {
    // Fetch the payment_intent ID from the completed checkout session so
    // the server can verify it on final submission.
    if (registrationId) {
      const result = await getSessionPaymentIntentId(registrationId);
      if (result.success && result.data) {
        onUpdate({
          payment_status: 'completed',
          payment_intent_id: result.data.paymentIntentId,
        });
      } else {
        onUpdate({ payment_status: 'completed' });
      }
    } else {
      onUpdate({ payment_status: 'completed' });
    }
    // Auto-advance to confirmation step after payment
    if (onNext) {
      setTimeout(() => onNext(), 1500);
    }
  };

  const handleSkip = () => {
    onUpdate({
      payment_status: 'not_required',
      payment_intent_id: '',
      amount_cents: 0,
    });
    if (onNext) {
      setTimeout(() => onNext(), 150);
    }
  };

  if (isPaid) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[var(--league-primary)]" />
            Payment
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center p-8 bg-green-500/10 rounded-xl border border-green-500/20">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
          <p className="text-green-400 text-center text-lg font-medium">Payment Complete</p>
          <p className="text-[var(--color-text-secondary)] text-center mt-2">
            {formatCurrency(registrationFee)} has been processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[var(--league-primary)]" />
          {isOptionalPayment ? 'Optional Player Payment' : 'Registration Fee'}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isOptionalPayment
            ? 'Pay now or continue and have your team billing cover the fee later.'
            : 'Complete payment to finalize your registration.'}
        </p>
      </div>

      {/* Fee Summary */}
      <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-secondary)]">Registration Fee</span>
          <span className="text-lg font-bold text-[var(--color-text-primary)]">
            {formatCurrency(registrationFee)}
          </span>
        </div>
        {isOptionalPayment && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Skipping this step keeps your registration valid and leaves the outstanding amount on
            the team billing side.
          </p>
        )}
      </div>

      {/* Payment Form */}
      {registrationId ? (
        <EmbeddedPaymentCheckout
          registrationId={registrationId}
          returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/${leagueSlug}/register?payment=success`}
          onComplete={handlePaymentComplete}
        />
      ) : (
        <div className="text-center">
          <button
            type="button"
            onClick={handleInitiatePayment}
            disabled={isCreatingDraft}
            aria-busy={isCreatingDraft}
            className="px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isCreatingDraft ? 'Preparing...' : `Pay ${formatCurrency(registrationFee)}`}
          </button>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Payments are securely processed by Stripe.
          </p>
          {isOptionalPayment && (
            <button
              type="button"
              onClick={handleSkip}
              className="mt-3 text-sm font-medium text-[var(--league-primary)] hover:underline"
            >
              Skip for now and let my team handle payment
            </button>
          )}
        </div>
      )}
    </div>
  );
}
