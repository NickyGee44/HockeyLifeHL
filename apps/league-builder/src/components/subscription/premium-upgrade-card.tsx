/**
 * Premium Upgrade Card Component
 *
 * Highlights Platform Monthly subscription with "MOST POPULAR" badge.
 * Displays pricing, features, and upgrade CTA.
 * Shows manage billing button if already subscribed.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createAddonCheckout, cancelAddon, type OrgAddon } from '@/lib/actions/addons';
import { toast } from 'sonner';

interface PremiumUpgradeCardProps {
  orgId: string;
  platformAddon: OrgAddon | null;
  hasStripeCustomer: boolean;
  onRefresh: () => void;
}

const PLATFORM_FEATURE_KEYS = [
  'prioritySupport',
  'customBranding',
  'advancedPermissions',
  'whiteLabel',
  'dedicatedManager',
] as const;

export function PremiumUpgradeCard({
  orgId,
  platformAddon,
  hasStripeCustomer,
  onRefresh,
}: PremiumUpgradeCardProps) {
  const t = useTranslations('subscription.upgrade');
  const tSub = useTranslations('subscription');
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isActive = platformAddon?.status === 'active' || platformAddon?.status === 'trialing';
  const isCancelled = !!platformAddon?.cancelled_at;
  const isPastDue = platformAddon?.status === 'past_due';

  async function handleUpgrade() {
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/dashboard/settings/subscription?addon_activated=platform_subscription`;
      const cancelUrl = `${window.location.origin}/dashboard/settings/subscription?checkout=cancelled`;

      const result = await createAddonCheckout(orgId, 'platform_subscription', successUrl, cancelUrl);
      if (result.success) {
        window.location.href = result.data.url;
      } else {
        toast.error(t('failedCheckout'), { description: result.error });
      }
    } catch {
      toast.error(t('failedCheckout'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm(t('cancelConfirm'))) {
      return;
    }

    setLoading(true);
    try {
      const result = await cancelAddon(orgId, 'platform_subscription');
      if (result.success) {
        toast.success(t('cancelAtPeriodEnd'));
        onRefresh();
      } else {
        toast.error(t('failedCancel'), { description: result.error });
      }
    } catch {
      toast.error(t('failedCancel'));
    } finally {
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(t('failedCheckout'), { description: data.error });
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error(t('failedCheckout'));
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 lg:p-8 h-full flex flex-col relative overflow-hidden">
      {/* Background gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-rink-500/5 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header with Badge */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-0 mb-3">
              {t('mostPopular')}
            </Badge>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">{t('platformMonthly')}</h2>
            </div>
            <p className="text-neutral-400 text-sm">
              {t('unlockDesc')}
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">$299.99</span>
            <span className="text-neutral-500">{t('perMonth')}</span>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 space-y-3 mb-6">
          {PLATFORM_FEATURE_KEYS.map((key) => (
            <div key={key} className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-rink-500 flex-shrink-0 mt-0.5" />
              <span className="text-neutral-300 text-sm">{t(`features.${key}`)}</span>
            </div>
          ))}
        </div>

        {/* Status & Actions */}
        <div className="space-y-3">
          {/* Active Status */}
          {isActive && !isCancelled && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">
                  {platformAddon?.status === 'trialing' ? t('trialActive') : t('active')}
                </span>
                {platformAddon?.current_period_end && (
                  <span className="text-xs text-neutral-500 ml-auto">
                    {t('nextBilling', { date: new Date(platformAddon.current_period_end).toLocaleDateString() })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Cancelled Status */}
          {isActive && isCancelled && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
              <span className="text-sm text-yellow-400">
                {t('cancelsAtPeriodEnd')}
              </span>
            </div>
          )}

          {/* Past Due Warning */}
          {isPastDue && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
              <span className="text-sm text-red-400 font-medium">
                {t('paymentIssue')}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            {!isActive && (
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold hover:shadow-lg hover:shadow-rink-500/20 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('upgradeToPremium')}
                  </>
                )}
              </Button>
            )}

            {isActive && (
              <>
                {hasStripeCustomer && (
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="w-full border-white/10 text-neutral-300 hover:bg-white/5"
                  >
                    {portalLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      tSub('manageBilling')
                    )}
                  </Button>
                )}

                {!isCancelled && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('cancelSubscription')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
