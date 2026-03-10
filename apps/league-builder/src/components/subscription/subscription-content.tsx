'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Globe,
  Loader2,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import { PaymentProcessingCard } from './payment-processing-card';
import { PremiumServicesCard } from './premium-services-card';

interface SubscriptionContentProps {
  organizationName: string;
  stripeCustomerId: string | null;
  platformFeePercent: number;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  domainsHref: string;
}

const INCLUDED_FEATURES = [
  'League websites, registrations, schedules, standings, and stats',
  'Player payments and Stripe Connect payout tooling',
  'Commissioner dashboard, captains, scorekeepers, and game-day workflows',
  'Custom domain setup from the built-in domain wizard',
  'Migration planning for existing leagues moving off legacy systems',
  'Theme, content, and website editor controls for each league',
] as const;

export function SubscriptionContent({
  organizationName,
  stripeCustomerId,
  platformFeePercent,
  subscriptionStatus,
  subscriptionTier,
  domainsHref,
}: SubscriptionContentProps) {
  const isActive = ['active', 'trialing'].includes(subscriptionStatus ?? '');

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-rink-500/20 bg-gradient-to-br from-rink-500/10 via-arena-500/5 to-transparent p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-rink-500" />
              <h2 className="text-2xl font-bold text-white">Platform Subscription</h2>
            </div>
            <p className="max-w-3xl text-sm text-neutral-300">
              {organizationName} is on the full Beer League Hockey platform. League websites,
              registrations, payments, schedules, stats, and custom domains are part of one
              operating system now, not separate add-ons.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge className={isActive
              ? 'border-green-500/30 bg-green-500/20 text-green-300'
              : 'border-amber-500/30 bg-amber-500/20 text-amber-300'}>
              {isActive ? 'Active' : 'Needs attention'}
            </Badge>
            {subscriptionTier ? (
              <Badge variant="outline" className="border-white/10 text-neutral-300">
                {subscriptionTier.replace(/_/g, ' ')}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {INCLUDED_FEATURES.map((feature) => (
            <div key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
              <span className="text-sm text-neutral-300">{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start gap-3">
            <Workflow className="mt-0.5 h-5 w-5 flex-shrink-0 text-rink-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Commercial model</p>
              <p className="text-sm text-neutral-400">
                BLH&apos;s platform fee is currently configured at {platformFeePercent}% on player
                registration payments. Stripe processing fees are charged by Stripe separately to
                the league&apos;s connected account.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-400">
            Use the billing portal for invoices and card details. Manage your domain directly in the platform.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={domainsHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Globe className="h-4 w-4" />
              Domain settings
            </Link>
            {stripeCustomerId ? <ManageBillingButton /> : null}
          </div>
        </div>
      </div>

      <PaymentProcessingCard platformFeePercent={platformFeePercent} />

      <PremiumServicesCard domainsHref={domainsHref} />
    </div>
  );
}

function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to open billing portal');
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="border-white/10 text-neutral-300 hover:bg-white/5"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Manage billing
          <ExternalLink className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
