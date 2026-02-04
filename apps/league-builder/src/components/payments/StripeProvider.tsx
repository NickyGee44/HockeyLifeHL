'use client';

import * as React from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

interface StripeProviderProps {
  children: React.ReactNode;
  publishableKey: string;
}

/**
 * StripeProvider - Wraps components with Stripe Elements context
 *
 * This provider initializes Stripe.js with the publishable key and provides
 * the Elements context to child components, enabling them to use Stripe payment elements.
 *
 * Usage:
 * ```tsx
 * <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
 *   <YourPaymentForm />
 * </StripeProvider>
 * ```
 */
export function StripeProvider({ children, publishableKey }: StripeProviderProps) {
  const [stripePromise, setStripePromise] = React.useState<Promise<Stripe | null> | null>(null);

  React.useEffect(() => {
    if (!publishableKey) {
      console.error('StripeProvider: Missing publishable key');
      return;
    }

    // Load Stripe.js asynchronously
    setStripePromise(loadStripe(publishableKey));
  }, [publishableKey]);

  if (!publishableKey) {
    return (
      <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
        <p className="text-red-400 text-sm">
          Stripe payment system is not configured. Please contact support.
        </p>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rink-500"></div>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#10b981',
            colorBackground: '#1f2937',
            colorText: '#f3f4f6',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '8px',
          },
          rules: {
            '.Input': {
              backgroundColor: '#111827',
              border: '1px solid #374151',
              padding: '12px',
            },
            '.Input:focus': {
              border: '1px solid #10b981',
              boxShadow: '0 0 0 1px #10b981',
            },
            '.Label': {
              color: '#9ca3af',
              fontSize: '14px',
              fontWeight: '500',
            },
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}
