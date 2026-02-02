/**
 * Subscription Plans Component
 *
 * Displays all available subscription tiers with feature comparison.
 * Allows users to upgrade or downgrade their subscription.
 */

'use client';

import { useState } from 'react';
import { Check, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import {
  upgradeSubscription,
  downgradeSubscription,
  getProrationPreview,
} from '@/lib/actions/subscription';
import {
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
  type ProrationPreview,
} from '@/lib/types/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SubscriptionPlansProps {
  currentTier: SubscriptionTier;
  onPlanChanged?: () => void;
}

const tierOrder: SubscriptionTier[] = ['starter', 'pro', 'enterprise'];

export function SubscriptionPlans({ currentTier, onPlanChanged }: SubscriptionPlansProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [proration, setProration] = useState<ProrationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentTierIndex = tierOrder.indexOf(currentTier);

  async function handleSelectPlan(tier: SubscriptionTier) {
    if (tier === currentTier) return;

    setSelectedTier(tier);
    const isUpgrade = tierOrder.indexOf(tier) > currentTierIndex;

    // If upgrade, fetch proration preview
    if (isUpgrade) {
      setLoading(true);
      const result = await getProrationPreview(tier);

      if (result.success) {
        setProration(result.data);
      } else {
        toast.error('Failed to calculate proration', {
          description: result.error,
        });
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    setShowConfirmDialog(true);
  }

  async function handleConfirmChange() {
    if (!selectedTier) return;

    setLoading(true);
    const isUpgrade = tierOrder.indexOf(selectedTier) > currentTierIndex;

    const result = isUpgrade
      ? await upgradeSubscription(selectedTier)
      : await downgradeSubscription(selectedTier);

    if (result.success) {
      toast.success(
        isUpgrade ? 'Subscription upgraded!' : 'Subscription downgrade scheduled',
        {
          description: isUpgrade
            ? 'Your subscription has been upgraded immediately.'
            : `Your subscription will downgrade to ${SUBSCRIPTION_TIERS[selectedTier].name} at the end of the current billing period.`,
        }
      );
      setShowConfirmDialog(false);
      setSelectedTier(null);
      setProration(null);
      onPlanChanged?.();
    } else {
      toast.error('Failed to change subscription', {
        description: result.error,
      });
    }

    setLoading(false);
  }

  function handleCancelChange() {
    setShowConfirmDialog(false);
    setSelectedTier(null);
    setProration(null);
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {tierOrder.map((tier) => {
          const tierInfo = SUBSCRIPTION_TIERS[tier];
          const isCurrent = tier === currentTier;
          const isUpgrade = tierOrder.indexOf(tier) > currentTierIndex;
          const isDowngrade = tierOrder.indexOf(tier) < currentTierIndex;

          return (
            <Card
              key={tier}
              className={
                isCurrent
                  ? 'border-primary shadow-lg'
                  : isUpgrade
                  ? 'border-green-200 dark:border-green-900'
                  : ''
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tierInfo.name}</CardTitle>
                  {isCurrent && (
                    <Badge variant="default">Current Plan</Badge>
                  )}
                  {tier === 'pro' && !isCurrent && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {tier === 'enterprise' ? (
                    <span className="text-2xl font-bold">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">${tierInfo.price}</span>
                      <span className="text-muted-foreground">/{tierInfo.interval}</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tierInfo.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    Current Plan
                  </Button>
                ) : tier === 'enterprise' ? (
                  <Button variant="default" className="w-full" asChild>
                    <a href="mailto:sales@hockeylifehl.com">Contact Sales</a>
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    variant="default"
                    className="w-full gap-2"
                    onClick={() => handleSelectPlan(tier)}
                  >
                    <ArrowUp className="h-4 w-4" />
                    Upgrade to {tierInfo.name}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleSelectPlan(tier)}
                  >
                    <ArrowDown className="h-4 w-4" />
                    Downgrade to {tierInfo.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTier &&
                (tierOrder.indexOf(selectedTier) > currentTierIndex
                  ? 'Upgrade Subscription'
                  : 'Downgrade Subscription')}
            </DialogTitle>
            <DialogDescription>
              {selectedTier &&
                tierOrder.indexOf(selectedTier) > currentTierIndex && (
                  <>
                    You are upgrading to the{' '}
                    <strong>{SUBSCRIPTION_TIERS[selectedTier].name}</strong> plan.
                  </>
                )}
              {selectedTier &&
                tierOrder.indexOf(selectedTier) < currentTierIndex && (
                  <>
                    You are downgrading to the{' '}
                    <strong>{SUBSCRIPTION_TIERS[selectedTier].name}</strong> plan.
                  </>
                )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Proration Info for Upgrades */}
            {proration && selectedTier && tierOrder.indexOf(selectedTier) > currentTierIndex && (
              <div className="rounded-lg border bg-muted p-4">
                <h4 className="text-sm font-medium mb-2">Billing Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount due today:</span>
                    <span className="font-medium">
                      ${(proration.amountDue / 100).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    You'll be charged a prorated amount for the remainder of your current
                    billing period. Your new plan takes effect immediately.
                  </p>
                </div>
              </div>
            )}

            {/* Downgrade Info */}
            {selectedTier && tierOrder.indexOf(selectedTier) < currentTierIndex && (
              <div className="rounded-lg border bg-muted p-4">
                <h4 className="text-sm font-medium mb-2">Important Information</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Your downgrade will take effect at the end of your current billing period</li>
                  <li>• You'll continue to have access to your current features until then</li>
                  <li>• No refund will be issued for the current period</li>
                  <li>• You can cancel this downgrade at any time before it takes effect</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelChange} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirmChange} disabled={loading}>
              {loading
                ? 'Processing...'
                : selectedTier && tierOrder.indexOf(selectedTier) > currentTierIndex
                ? 'Confirm Upgrade'
                : 'Confirm Downgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
