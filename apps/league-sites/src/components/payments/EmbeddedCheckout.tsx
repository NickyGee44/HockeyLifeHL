'use client';

import { useCallback, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { createEmbeddedCheckout } from '@/lib/actions/registration-payments';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface EmbeddedPaymentCheckoutProps {
  registrationId: string;
  returnUrl: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function EmbeddedPaymentCheckout({
  registrationId,
  returnUrl,
  onComplete,
  onError,
}: EmbeddedPaymentCheckoutProps) {
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    const result = await createEmbeddedCheckout(registrationId, returnUrl);

    if (!result.success) {
      const errorMessage = result.error || 'Failed to initialize payment';
      setError(errorMessage);
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }

    return result.data!.clientSecret;
  }, [registrationId, returnUrl, onError]);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    onComplete?.();
  }, [onComplete]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 rounded-xl border border-red-500/20">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-400 text-center">{error}</p>
        <button
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-green-500/10 rounded-xl border border-green-500/20">
        <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
        <p className="text-green-400 text-center text-lg font-medium">Payment Successful!</p>
        <p className="text-[var(--color-text-secondary)] text-center mt-2">
          Your registration payment has been processed.
        </p>
      </div>
    );
  }

  return (
    <div id="checkout" className="min-h-[400px]">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{
          fetchClientSecret,
          onComplete: handleComplete,
        }}
      >
        <EmbeddedCheckout className="stripe-embedded-checkout" />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

// Simple loading placeholder
export function CheckoutLoading() {
  return (
    <div className="flex items-center justify-center p-12 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--league-primary)] mx-auto mb-4" />
        <p className="text-[var(--color-text-secondary)]">Loading payment form...</p>
      </div>
    </div>
  );
}
