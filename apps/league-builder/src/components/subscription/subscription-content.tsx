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
  checkoutStatus?: string;
  addonActivated?: string;
}

const ADDON_TYPES: AddonType[] = ['advanced_stats', 'ai_news'];

export function SubscriptionContent({
  checkoutStatus,
  addonActivated,
}: SubscriptionContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [addons, setAddons] = useState<OrgAddon[]>([]);
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(2.99);

  // Load organization and subscription data from window (passed from server)
  async function loadData() {
    setLoading(true);

    try {
      // Get org from session storage (set by layout or parent component)
      const orgData = sessionStorage.getItem('currentOrganization');
      if (!orgData) {
        // Fetch from API instead
        const response = await fetch('/api/organization/current');
        if (!response.ok) {
          toast.error('Failed to load organization');
          return;
        }

        const data = await response.json();
        setOrgId(data.id);
        setStripeCustomerId(data.stripe_customer_id || null);
        setPlatformFeePercent(data.platform_fee_percent || 2.99);
      } else {
        const org = JSON.parse(orgData);
        setOrgId(org.id);
        setStripeCustomerId(org.stripe_customer_id || null);
        setPlatformFeePercent(org.platform_fee_percent || 2.99);
      }

      // Get organization add-ons if we have orgId
      if (orgId) {
        const addonsResult = await getOrgAddons(orgId);
        if (addonsResult.success) {
          setAddons(addonsResult.data);
        } else {
          console.error('Failed to load add-ons:', addonsResult.error);
        }
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-rink-500" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
        <p className="text-red-400">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Split Hero: Current Plan + Premium Upgrade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Current Plan (FREE) */}
        <CurrentPlanCard
          platformFeePercent={platformFeePercent}
          hasPlatformSubscription={hasPlatformSubscription}
          platformAddon={platformAddon}
        />

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
