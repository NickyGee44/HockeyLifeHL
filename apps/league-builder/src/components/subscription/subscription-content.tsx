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
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getOrgAddons, type AddonType, type OrgAddon } from '@/lib/actions/addons';
import { PremiumUpgradeCard } from './premium-upgrade-card';
import { AddonCard } from './addon-card';
import { PaymentProcessingCard } from './payment-processing-card';
import { PremiumServicesCard } from './premium-services-card';
import { CheckCircle2, Sparkles, Crown } from 'lucide-react';
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

const FREE_FEATURE_KEYS = [
  'unlimitedTeams',
  'leagueWebsite',
  'unlimitedSeasons',
  'adminDashboard',
  'scorekeeperApp',
  'realtimeStats',
] as const;

const PREMIUM_FEATURE_KEYS = [
  'everythingInFree',
  'prioritySupport',
  'customBranding',
  'advancedPermissions',
  'whiteLabel',
] as const;

export function SubscriptionContent({
  orgId,
  stripeCustomerId,
  platformFeePercent,
  initialAddons,
  checkoutStatus,
  addonActivated }: SubscriptionContentProps) {
  const router = useRouter();
  const t = useTranslations('subscription.content');
  const tAddonConfig = useTranslations('subscription.addon.config');
  const [addons, setAddons] = useState<OrgAddon[]>(initialAddons);

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
      toast.success(t('subscriptionActivated'), {
        description: t('subscriptionActivatedDesc') });
      // Clean up URL
      router.replace('/dashboard/settings/subscription');
    } else if (checkoutStatus === 'cancelled') {
      toast.info(t('checkoutCancelled'), {
        description: t('checkoutCancelledDesc') });
      router.replace('/dashboard/settings/subscription');
    }
  }, [checkoutStatus, router, t]);

  // Handle addon activation success
  useEffect(() => {
    if (addonActivated) {
      toast.success(t('addonActivated', { name: tAddonConfig(`${addonActivated}.name`) }), {
        description: t('addonActivatedDesc') });

      router.replace('/dashboard/settings/subscription');
      loadData(); // Refresh data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is intentionally excluded to avoid re-triggering; only run when addonActivated changes
  }, [addonActivated, router, t, tAddonConfig]);

  function getAddonByType(type: AddonType): OrgAddon | null {
    return addons.find((a) => a.addon_type === type) || null;
  }

  const platformAddon = addons.find((a) => a.addon_type === 'platform_subscription') || null;
  const hasPlatformSubscription = platformAddon?.status === 'active' || platformAddon?.status === 'trialing';
  const featureKeys = hasPlatformSubscription ? PREMIUM_FEATURE_KEYS : FREE_FEATURE_KEYS;

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
                  {hasPlatformSubscription ? t('platformMonthly') : t('yourCurrentPlan')}
                </h2>
              </div>
              <p className="text-neutral-300 text-sm">
                {hasPlatformSubscription ? t('premiumFeaturesUnlocked') : t('freeForever')}
              </p>
            </div>
            <Badge className={hasPlatformSubscription && platformAddon?.status === 'trialing'
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : 'bg-green-500/20 text-green-400 border-green-500/30'}>
              {platformAddon?.status === 'trialing' ? t('trial') : t('active')}
            </Badge>
          </div>

          <div className="flex-1 space-y-3 mb-6">
            {featureKeys.map((key) => (
              <div key={key} className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-neutral-300 text-sm">{t(`features.${key}`)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            {hasPlatformSubscription && platformAddon?.current_period_end ? (
              <>
                <p className="text-sm text-neutral-400">
                  {t('nextBilling', { date: new Date(platformAddon.current_period_end).toLocaleDateString() })}
                </p>
                {platformAddon.cancelled_at && (
                  <p className="text-sm text-yellow-400 mt-2">{t('cancelsAtPeriodEnd')}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-400">
                  {t('transactionFeeOnPayments', { percent: platformFeePercent })}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {t('noCreditCard')}
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
        <h2 className="text-lg font-bold text-white mb-4">{t('premiumAddOns')}</h2>
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
