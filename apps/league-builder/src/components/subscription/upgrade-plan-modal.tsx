/**
 * Upgrade Plan Modal Component
 *
 * Modal for selecting and upgrading to a higher tier.
 * Redirects to Stripe Checkout for payment processing.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, TrendingUp, Globe, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { SubscriptionTier } from '@/lib/types/subscription';
import { SUBSCRIPTION_TIERS } from '@/lib/types/subscription';

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: SubscriptionTier;
}

const TIER_ICONS = {
  custom_domain: Globe,
  enterprise: Zap,
} as const;

export function UpgradePlanModal({ open, onOpenChange, currentTier }: UpgradePlanModalProps) {
  const t = useTranslations('subscription.upgradePlanModal');
  const [redirecting, setRedirecting] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);

  // Available upgrade tiers
  const availableTiers: SubscriptionTier[] =
    currentTier === 'free'
      ? ['custom_domain', 'enterprise']
      : currentTier === 'custom_domain'
        ? ['enterprise']
        : [];

  async function handleUpgrade(tier: SubscriptionTier) {
    setSelectedTier(tier);
    setRedirecting(true);

    try {
      // Create Stripe Checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/dashboard/settings/billing/success?tier=${tier}`,
          cancelUrl: `${window.location.origin}/dashboard/settings/billing/cancel`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(t('failedCheckout'), {
        description: error instanceof Error ? error.message : undefined,
      });
      setRedirecting(false);
      setSelectedTier(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-neutral-900 border-white/10 text-neutral-100">
        <DialogHeader>
          <DialogTitle className="text-2xl text-neutral-100">{t('title')}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {availableTiers.map((tier) => {
            const tierInfo = SUBSCRIPTION_TIERS[tier];
            const Icon = TIER_ICONS[tier as keyof typeof TIER_ICONS];
            const isLoading = redirecting && selectedTier === tier;

            return (
              <Card
                key={tier}
                className="bg-neutral-800/50 border-white/10 hover:border-rink-500/50 transition-colors"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-rink-500/10 flex items-center justify-center mb-4">
                    {Icon && <Icon className="w-6 h-6 text-rink-500" />}
                  </div>
                  <CardTitle className="text-neutral-100">{tierInfo.name}</CardTitle>
                  <CardDescription className="text-neutral-400">
                    {tierInfo.price > 0 ? (
                      <>
                        <span className="text-2xl font-bold text-neutral-100">
                          ${tierInfo.price.toFixed(2)}
                        </span>
                        <span className="text-sm">/{tierInfo.interval}</span>
                      </>
                    ) : (
                      <span className="text-lg font-semibold text-neutral-200">{t('contactSales')}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Features */}
                  <div className="space-y-2">
                    {tierInfo.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Upgrade Button */}
                  <Button
                    onClick={() => handleUpgrade(tier)}
                    disabled={redirecting}
                    className="w-full bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('redirectingToCheckout')}
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        {t('upgradeTo', { name: tierInfo.name })}
                      </>
                    )}
                  </Button>

                  {tierInfo.price === 0 && (
                    <p className="text-xs text-center text-neutral-500">
                      {t('contactSales')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {availableTiers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-neutral-400">{t('highestTier')}</p>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-neutral-500">
            {t('trialInfo')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
