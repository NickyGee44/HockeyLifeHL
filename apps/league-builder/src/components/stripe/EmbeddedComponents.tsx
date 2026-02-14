'use client';

import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useStripeConnect } from './ConnectProvider';
import { Loader2, AlertCircle } from 'lucide-react';

// ============================================================================
// Stripe Error Boundary
// ============================================================================

interface StripeErrorBoundaryProps {
  children: ReactNode;
  fallbackHeight?: number;
}

interface StripeErrorBoundaryState {
  hasError: boolean;
}

export class StripeErrorBoundary extends Component<StripeErrorBoundaryProps, StripeErrorBoundaryState> {
  constructor(props: StripeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): StripeErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center justify-center bg-red-500/10 rounded-xl border border-red-500/20 p-6"
          style={{ minHeight: this.props.fallbackHeight ?? 200 }}
        >
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-400">
              Failed to load Stripe component. Please refresh the page.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading placeholder component
function LoadingPlaceholder({ height = 400 }: { height?: number }) {
  const t = useTranslations('stripe');
  return (
    <div
      className="flex items-center justify-center bg-neutral-900/50 rounded-xl border border-neutral-800"
      style={{ minHeight: height }}
    >
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
        <p className="text-sm text-neutral-400">{t('loadingStripe')}</p>
      </div>
    </div>
  );
}

// Error display component
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center bg-red-500/10 rounded-xl border border-red-500/20 p-6">
      <div className="text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Account Onboarding Component
// ============================================================================

interface EmbeddedOnboardingProps {
  onComplete?: () => void;
  className?: string;
}

export function EmbeddedOnboarding({ onComplete, className }: EmbeddedOnboardingProps) {
  const { stripeConnectInstance, isLoading, error } = useStripeConnect();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!stripeConnectInstance || !containerRef.current || mounted) return;

    const component = stripeConnectInstance.create('account-onboarding');
    component.setOnExit(() => {
      onComplete?.();
    });
    containerRef.current.appendChild(component);
    setMounted(true); // eslint-disable-line -- track Stripe component mount state

    return () => {
      (component as unknown as { destroy?: () => void }).destroy?.();
      setMounted(false);
    };
  }, [stripeConnectInstance, onComplete, mounted]);

  if (isLoading) return <LoadingPlaceholder height={500} />;
  if (error) return <ErrorDisplay error={error} />;

  return <div ref={containerRef} className={className} />;
}

// ============================================================================
// Account Management Component
// ============================================================================

interface EmbeddedAccountManagementProps {
  className?: string;
}

export function EmbeddedAccountManagement({ className }: EmbeddedAccountManagementProps) {
  const { stripeConnectInstance, isLoading, error } = useStripeConnect();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!stripeConnectInstance || !containerRef.current || mounted) return;

    const component = stripeConnectInstance.create('account-management');
    containerRef.current.appendChild(component);
    setMounted(true); // eslint-disable-line -- track Stripe component mount state

    return () => {
      (component as unknown as { destroy?: () => void }).destroy?.();
      setMounted(false);
    };
  }, [stripeConnectInstance, mounted]);

  if (isLoading) return <LoadingPlaceholder height={400} />;
  if (error) return <ErrorDisplay error={error} />;

  return <div ref={containerRef} className={className} />;
}

// ============================================================================
// Payments Component (shows payments received)
// ============================================================================

interface EmbeddedPaymentsProps {
  className?: string;
}

export function EmbeddedPayments({ className }: EmbeddedPaymentsProps) {
  const { stripeConnectInstance, isLoading, error } = useStripeConnect();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!stripeConnectInstance || !containerRef.current || mounted) return;

    const component = stripeConnectInstance.create('payments');
    containerRef.current.appendChild(component);
    setMounted(true); // eslint-disable-line -- track Stripe component mount state

    return () => {
      (component as unknown as { destroy?: () => void }).destroy?.();
      setMounted(false);
    };
  }, [stripeConnectInstance, mounted]);

  if (isLoading) return <LoadingPlaceholder height={500} />;
  if (error) return <ErrorDisplay error={error} />;

  return <div ref={containerRef} className={className} />;
}

// ============================================================================
// Payouts Component
// ============================================================================

interface EmbeddedPayoutsProps {
  className?: string;
}

export function EmbeddedPayouts({ className }: EmbeddedPayoutsProps) {
  const { stripeConnectInstance, isLoading, error } = useStripeConnect();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!stripeConnectInstance || !containerRef.current || mounted) return;

    const component = stripeConnectInstance.create('payouts');
    containerRef.current.appendChild(component);
    setMounted(true); // eslint-disable-line -- track Stripe component mount state

    return () => {
      (component as unknown as { destroy?: () => void }).destroy?.();
      setMounted(false);
    };
  }, [stripeConnectInstance, mounted]);

  if (isLoading) return <LoadingPlaceholder height={400} />;
  if (error) return <ErrorDisplay error={error} />;

  return <div ref={containerRef} className={className} />;
}

// ============================================================================
// Balances Component
// ============================================================================

interface EmbeddedBalancesProps {
  className?: string;
}

export function EmbeddedBalances({ className }: EmbeddedBalancesProps) {
  const { stripeConnectInstance, isLoading, error } = useStripeConnect();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!stripeConnectInstance || !containerRef.current || mounted) return;

    const component = stripeConnectInstance.create('balances');
    containerRef.current.appendChild(component);
    setMounted(true); // eslint-disable-line -- track Stripe component mount state

    return () => {
      (component as unknown as { destroy?: () => void }).destroy?.();
      setMounted(false);
    };
  }, [stripeConnectInstance, mounted]);

  if (isLoading) return <LoadingPlaceholder height={200} />;
  if (error) return <ErrorDisplay error={error} />;

  return <div ref={containerRef} className={className} />;
}

// ============================================================================
// Notification Banner Component
// ============================================================================

interface EmbeddedNotificationBannerProps {
  className?: string;
}

export function EmbeddedNotificationBanner({ className }: EmbeddedNotificationBannerProps) {
  const { stripeConnectInstance, isLoading, error } = useStripeConnect();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!stripeConnectInstance || !containerRef.current || mounted) return;

    const component = stripeConnectInstance.create('notification-banner');
    containerRef.current.appendChild(component);
    setMounted(true); // eslint-disable-line -- track Stripe component mount state

    return () => {
      (component as unknown as { destroy?: () => void }).destroy?.();
      setMounted(false);
    };
  }, [stripeConnectInstance, mounted]);

  // Don't show loading for notification banner - it should be subtle
  if (isLoading || error) return null;

  return <div ref={containerRef} className={className} />;
}
