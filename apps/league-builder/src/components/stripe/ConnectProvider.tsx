'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';
import { createConnectAccountSession } from '@/lib/actions/stripe-connect-payments';

const MAX_FETCH_SECRET_RETRIES = 3;
const FETCH_SECRET_BACKOFF_MS = 2000;

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
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent double-initialization (React strict mode calls effects twice)
  const initializingRef = useRef(false);
  // Track the current leagueId to discard stale results
  const leagueIdRef = useRef(leagueId);
  leagueIdRef.current = leagueId;
  // Track fetchClientSecret call count to prevent infinite retry loops
  const fetchSecretAttemptsRef = useRef(0);
  const lastFetchSecretErrorRef = useRef<string | null>(null);

  const initializeConnect = useCallback(async () => {
    if (!leagueId) {
      setError('League ID is required.');
      setIsLoading(false);
      return;
    }

    if (initializingRef.current) return;
    initializingRef.current = true;

    // Reset retry counter on fresh initialization
    fetchSecretAttemptsRef.current = 0;
    lastFetchSecretErrorRef.current = null;

    try {
      setIsLoading(true);
      setError(null);

      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        setError('Stripe publishable key is not configured.');
        setIsLoading(false);
        return;
      }

      // Initialize Stripe Connect with a dynamic fetchClientSecret.
      // Stripe SDK calls this on init AND whenever it needs a fresh session.
      // We add retry limiting to prevent infinite loops when the server
      // consistently returns errors (e.g., for pending/restricted accounts).
      const instance = await loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          fetchSecretAttemptsRef.current += 1;

          if (fetchSecretAttemptsRef.current > MAX_FETCH_SECRET_RETRIES) {
            const msg = lastFetchSecretErrorRef.current || 'Too many failed attempts to create Stripe session.';
            console.error(`[ConnectProvider] fetchClientSecret exceeded ${MAX_FETCH_SECRET_RETRIES} attempts, aborting. Last error: ${msg}`);
            throw new Error(msg);
          }

          // Exponential backoff after the first attempt
          if (fetchSecretAttemptsRef.current > 1) {
            const delay = FETCH_SECRET_BACKOFF_MS * Math.pow(2, fetchSecretAttemptsRef.current - 2);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          const result = await createConnectAccountSession(leagueIdRef.current);
          if (!result.success) {
            lastFetchSecretErrorRef.current = result.error;
            throw new Error(result.error);
          }

          // Reset counter on success (allows future refresh calls)
          fetchSecretAttemptsRef.current = 0;
          lastFetchSecretErrorRef.current = null;
          return result.data.clientSecret;
        },
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#10b981',
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

      // Only set state if leagueId hasn't changed during async init
      if (leagueIdRef.current === leagueId) {
        setStripeConnectInstance(instance);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[ConnectProvider] Initialization error:', err);
      if (leagueIdRef.current === leagueId) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Stripe Connect.');
        setIsLoading(false);
      }
    } finally {
      initializingRef.current = false;
    }
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
