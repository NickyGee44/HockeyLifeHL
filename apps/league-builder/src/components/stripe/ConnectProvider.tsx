'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';
import { createConnectAccountSession } from '@/lib/actions/stripe-connect-payments';

interface ConnectContextValue {
  stripeConnectInstance: StripeConnectInstance | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ConnectContext = createContext<ConnectContextValue>({
  stripeConnectInstance: null,
  isLoading: true,
  error: null,
  refresh: async () => {},
});

export function useStripeConnect() {
  return useContext(ConnectContext);
}

interface ConnectProviderProps {
  leagueId: string;
  children: React.ReactNode;
}

export function ConnectProvider({ leagueId, children }: ConnectProviderProps) {
  const t = useTranslations('stripe');

  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeConnect = useCallback(async () => {
    if (!leagueId) {
      setError(t('leagueIdRequired'));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch client secret from server
      const result = await createConnectAccountSession(leagueId);

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        setError(t('publishableKeyNotConfigured'));
        setIsLoading(false);
        return;
      }

      // Initialize Stripe Connect
      const instance = await loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => result.data.clientSecret,
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#10b981', // emerald-500 to match app theme
            colorBackground: '#0a0a0a',
            colorText: '#ffffff',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSizeBase: '14px',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
        },
      });

      setStripeConnectInstance(instance);
      setIsLoading(false);
    } catch (err) {
      console.error('[ConnectProvider] Initialization error:', err);
      setError(err instanceof Error ? err.message : t('failedInitialize'));
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from next-intl, only re-init when leagueId changes
  }, [leagueId]);

  useEffect(() => {
    initializeConnect();
  }, [initializeConnect]);

  const refresh = useCallback(async () => {
    await initializeConnect();
  }, [initializeConnect]);

  const contextValue = useMemo(
    () => ({ stripeConnectInstance, isLoading, error, refresh }),
    [stripeConnectInstance, isLoading, error, refresh]
  );

  return (
    <ConnectContext.Provider value={contextValue}>
      {children}
    </ConnectContext.Provider>
  );
}
