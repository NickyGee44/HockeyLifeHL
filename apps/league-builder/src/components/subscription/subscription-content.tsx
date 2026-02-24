/**
 * Subscription Content Component
 *
 * Displays the billing & subscription management page:
 * - Current Plan: Platform Monthly ($299.99/mo) — the only plan (no free tier)
 * - Add-on cards grid (Advanced Stats, AI News Writer)
 * - Payment processing info (2.99% fee)
 * - Premium services (custom domain, data import)
 *
 * Handles all subscription states and checkout flows.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getOrgAddons, type AddonType, type OrgAddon } from '@/lib/actions/addons';
import { PremiumUpgradeCard } from './premium-upgrade-card';
import { AddonCard } from './addon-card';
import { PaymentProcessingCard } from './payment-processing-card';
import { PremiumServicesCard } from './premium-services-card';
import { CheckCircle2, Crown, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createAddonCheckout } from '@/lib/actions/addons';

interface SubscriptionContentProps {
  orgId: string;
  stripeCustomerId: string | null;
  platformFeePercent: number;
  initialAddons: OrgAddon[];
  checkoutStatus?: string;
  addonActivated?: string;
}

const ADDON_TYPES: AddonType[] = ['advanced_stats', 'ai_news'];

const PLATFORM_FEATURE_KEYS = [
  'unlimitedTeams',
  'leagueWebsite',
  'unlimitedSeasons',
  'adminDashboard',
  'scorekeeperApp',
  'realtimeStats',
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
  const [loading, setLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Guards to prevent effects from firing multiple times during navigation
  const checkoutHandled = useRef(false);
  const addonHandled = useRef(false);

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

  // Handle checkout status query params (one-shot)
  useEffect(() => {
    if (checkoutHandled.current) return;
    if (checkoutStatus === 'success') {
      checkoutHandled.current = true;
      toast.success(t('subscriptionActivated'), {
        description: t('subscriptionActivatedDesc') });
      router.replace('/dashboard/settings/billing');
    } else if (checkoutStatus === 'cancelled') {
      checkoutHandled.current = true;
      toast.info(t('checkoutCancelled'), {
        description: t('checkoutCancelledDesc') });
      router.replace('/dashboard/settings/billing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t excluded to prevent infinite re-render loop
  }, [checkoutStatus, router]);

  // Handle addon activation success (one-shot)
  useEffect(() => {
    if (addonHandled.current) return;
    if (addonActivated) {
      addonHandled.current = true;
      toast.success(t('addonActivated', { name: tAddonConfig(`${addonActivated}.name`) }), {
        description: t('addonActivatedDesc') });
      router.replace('/dashboard/settings/billing');
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t, tAddonConfig, loadData excluded to prevent infinite re-render loop
  }, [addonActivated, router]);

  function getAddonByType(type: AddonType): OrgAddon | null {
    return addons.find((a) => a.addon_type === type) || null;
  }

  const platformAddon = addons.find((a) => a.addon_type === 'platform_subscription') || null;
  const hasPlatformSubscription = platformAddon?.status === 'active' || platformAddon?.status === 'trialing';

  async function handleSubscribe() {
    setUpgradeLoading(true);
    try {
      const successUrl = `${window.location.origin}/dashboard/settings/billing?addon_activated=platform_subscription`;
      const cancelUrl = `${window.location.origin}/dashboard/settings/billing?checkout=cancelled`;

      const result = await createAddonCheckout(orgId, 'platform_subscription', successUrl, cancelUrl);
      if (result.success) {
        window.location.href = result.data.url;
      } else {
        toast.error(t('failedCheckout'), { description: result.error });
      }
    } catch {
      toast.error(t('failedCheckout'));
    } finally {
      setUpgradeLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Current Plan: Platform Monthly */}
      <div className="bg-gradient-to-br from-rink-500/10 via-arena-500/5 to-transparent border border-rink-500/20 rounded-2xl p-6 lg:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">{t('platformMonthly')}</h2>
            </div>
            <p className="text-neutral-300 text-sm">{t('platformDescription')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$299.99</span>
                <span className="text-neutral-500 text-sm">{t('perMonth')}</span>
              </div>
            </div>
            {hasPlatformSubscription ? (
              <Badge className={platformAddon?.status === 'trialing'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : 'bg-green-500/20 text-green-400 border-green-500/30'}>
                {platformAddon?.status === 'trialing' ? t('trial') : t('active')}
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                {t('notSubscribed')}
              </Badge>
            )}
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {PLATFORM_FEATURE_KEYS.map((key) => (
            <div key={key} className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-neutral-300 text-sm">{t(`features.${key}`)}</span>
            </div>
          ))}
        </div>

        {/* Transaction fee note */}
        <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-white/[0.04] rounded-xl border border-white/[0.06]">
          <CreditCard className="w-4 h-4 text-rink-500 flex-shrink-0" />
          <span className="text-sm text-neutral-400">
            {t('transactionFeeOnPayments', { percent: platformFeePercent })}
          </span>
        </div>

        {/* Status / Actions */}
        <div className="pt-4 border-t border-white/10">
          {hasPlatformSubscription ? (
            <div className="flex items-center justify-between">
              <div>
                {platformAddon?.current_period_end && (
                  <p className="text-sm text-neutral-400">
                    {t('nextBilling', { date: new Date(platformAddon.current_period_end).toLocaleDateString() })}
                  </p>
                )}
                {platformAddon?.cancelled_at && (
                  <p className="text-sm text-yellow-400 mt-1">{t('cancelsAtPeriodEnd')}</p>
                )}
              </div>
              {stripeCustomerId && (
                <ManageBillingButton />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-400">{t('subscribeToGetStarted')}</p>
              <Button
                onClick={handleSubscribe}
                disabled={upgradeLoading}
                className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold hover:shadow-lg hover:shadow-rink-500/20 transition-all"
              >
                {upgradeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('subscribe')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
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

// Inline manage billing button (uses fetch to Stripe portal)
function ManageBillingButton() {
  const t = useTranslations('subscription');
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
        toast.error(t('failedOpenPortal'), { description: data.error });
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error(t('failedOpenPortal'));
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
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('manageBilling')}
    </Button>
  );
}
