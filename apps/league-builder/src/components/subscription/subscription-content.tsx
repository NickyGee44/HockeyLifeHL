/**
 * Subscription Content Component
 *
 * Premium split-hero layout for subscription management:
 * - Left: Current Plan (FREE tier with features)
 * - Right: Premium Upgrade (Platform Monthly highlight)
 * - Below: Add-on cards grid (Advanced Stats, AI News Writer)
 * - Payment processing info
 * - Premium services (custom domain, data import)
 *
 * Handles all subscription states and checkout flows.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getOrgAddons, type AddonType, type OrgAddon } from '@/lib/actions/addons';
import { PremiumUpgradeCard } from './premium-upgrade-card';
import { AddonCard } from './addon-card';
import { PaymentProcessingCard } from './payment-processing-card';
import { PremiumServicesCard } from './premium-services-card';
import { Loader2, CheckCircle2, Sparkles, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SubscriptionContentProps {
  orgId: string;
  stripeCustomerId: string | null;
  platformFeePercent: number;
  initialAddons: OrgAddon[];
  checkoutStatus?: string;
  addonActivated?: string;
}

const ADDON_TYPES: AddonType[] = ['advanced_stats', 'ai_news'];

const FREE_FEATURES = [
  'Unlimited teams and players',
  'Full-featured league website',
  'Unlimited seasons and games',
  'Complete admin dashboard',
  'Mobile scorekeeper app',
  'Real-time stats and standings',
];

export function SubscriptionContent({
  orgId,
  stripeCustomerId,
  platformFeePercent,
  initialAddons,
  checkoutStatus,
  addonActivated,
}: SubscriptionContentProps) {
  const router = useRouter();
  const [addons, setAddons] = useState<OrgAddon[]>(initialAddons);
  const [loading, setLoading] = useState(false);

  // Refresh add-ons data
  async function loadData() {
    setLoading(true);
    try {
      const addonsResult = await getOrgAddons(orgId);
      if (addonsResult.success) {
        setAddons(addonsResult.data);
      }
    } catch (error) {
      console.error('Failed to load add-ons:', error);
    } finally {
      setLoading(false);
    }
  }

  // Handle checkout status query params
  useEffect(() => {
    if (checkoutStatus === 'success') {
      toast.success('Subscription activated!', {
        description: 'Your subscription is now active.',
      });
      // Clean up URL
      router.replace('/dashboard/settings/subscription');
    } else if (checkoutStatus === 'cancelled') {
      toast.info('Checkout cancelled', {
        description: 'No charges were made.',
      });
      router.replace('/dashboard/settings/subscription');
    }
  }, [checkoutStatus, router]);

  // Handle addon activation success
  useEffect(() => {
    if (addonActivated) {
      const addonNames: Record<string, string> = {
        platform_subscription: 'Platform Monthly',
        advanced_stats: 'Advanced Stats',
        ai_news: 'AI News Writer',
      };

      const name = addonNames[addonActivated] || addonActivated;
      toast.success(`${name} activated!`, {
        description: 'Your add-on is now active.',
      });

      router.replace('/dashboard/settings/subscription');
      loadData(); // Refresh data
    }
  }, [addonActivated, router]);

  function getAddonByType(type: AddonType): OrgAddon | null {
    return addons.find((a) => a.addon_type === type) || null;
  }

  const platformAddon = addons.find((a) => a.addon_type === 'platform_subscription') || null;
  const hasPlatformSubscription = platformAddon?.status === 'active' || platformAddon?.status === 'trialing';
  const features = hasPlatformSubscription ? [
    'Everything in FREE',
    'Priority email support (24hr response)',
    'Custom brand colors and logos',
    'Advanced admin permissions',
    'White-label league websites',
  ] : FREE_FEATURES;

  return (
    <div className="space-y-8">
      {/* Split Hero: Current Plan + Premium Upgrade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Current Plan (FREE or Platform Monthly if subscribed) */}
        <div className="bg-gradient-to-br from-green-500/10 via-rink-500/5 to-arena-500/10 border border-green-500/30 rounded-2xl p-6 lg:p-8 h-full flex flex-col">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {hasPlatformSubscription ? (
                  <Crown className="w-6 h-6 text-yellow-400" />
                ) : (
                  <Sparkles className="w-6 h-6 text-green-400" />
                )}
                <h2 className="text-2xl font-bold text-white">
                  {hasPlatformSubscription ? 'Platform Monthly' : 'Your Current Plan'}
                </h2>
              </div>
              <p className="text-neutral-300 text-sm">
                {hasPlatformSubscription ? 'Premium features unlocked' : 'FREE Forever'}
              </p>
            </div>
            <Badge className={hasPlatformSubscription && platformAddon?.status === 'trialing'
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : 'bg-green-500/20 text-green-400 border-green-500/30'}>
              {platformAddon?.status === 'trialing' ? 'TRIAL' : 'ACTIVE'}
            </Badge>
          </div>

          <div className="flex-1 space-y-3 mb-6">
            {features.map((feature) => (
              <div key={feature} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-neutral-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            {hasPlatformSubscription && platformAddon?.current_period_end ? (
              <>
                <p className="text-sm text-neutral-400">
                  Next billing: {new Date(platformAddon.current_period_end).toLocaleDateString()}
                </p>
                {platformAddon.cancelled_at && (
                  <p className="text-sm text-yellow-400 mt-2">Cancels at end of billing period</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-400">
                  {platformFeePercent}% transaction fee on player payments
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  No credit card required. No hidden fees. Always free.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right: Premium Upgrade (Platform Monthly) */}
        <PremiumUpgradeCard
          orgId={orgId}
          platformAddon={platformAddon}
          hasStripeCustomer={!!stripeCustomerId}
          onRefresh={loadData}
        />
      </div>

      {/* Add-On Cards Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Premium Add-Ons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ADDON_TYPES.map((type) => (
            <AddonCard
              key={type}
              addonType={type}
              addon={getAddonByType(type)}
              orgId={orgId}
              onRefresh={loadData}
            />
          ))}
        </div>
      </div>

      {/* Payment Processing Info */}
      <PaymentProcessingCard platformFeePercent={platformFeePercent} />

      {/* Premium Services (Contact-based) */}
      <PremiumServicesCard />
    </div>
  );
}
