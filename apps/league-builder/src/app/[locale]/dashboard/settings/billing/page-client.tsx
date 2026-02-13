/**
 * Billing Settings Page Client Component
 *
 * Manages organization subscription billing UI.
 */

'use client';

import { useEffect, useState } from 'react';
import { getCurrentSubscription, getBillingHistory } from '@/lib/actions/subscription';
import type { OrganizationSubscription, Invoice } from '@/lib/types/subscription';
import { CurrentPlanCard } from '@/components/subscription/current-plan-card';
import { UpgradePlanModal } from '@/components/subscription/upgrade-plan-modal';
import { BillingHistoryTable } from '@/components/subscription/billing-history-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function BillingPageClient() {
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  async function loadData() {
    setLoading(true);

    // Load subscription
    const subResult = await getCurrentSubscription();
    if (subResult.success) {
      setSubscription(subResult.data);
    } else {
      toast.error('Failed to load subscription', {
        description: subResult.error,
      });
    }

    // Load billing history
    const historyResult = await getBillingHistory();
    if (historyResult.success) {
      setInvoices(historyResult.data.invoices);
    } else {
      toast.error('Failed to load billing history', {
        description: historyResult.error,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData(); // eslint-disable-line -- data-fetching on mount
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-rink-500 mx-auto mb-4" />
          <p className="text-neutral-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">Subscription Not Found</CardTitle>
          <CardDescription className="text-neutral-400">
            Unable to load subscription information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-400">
            Please contact support if you continue to see this error.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <CurrentPlanCard
        subscription={subscription}
        onUpgradeClick={() => setUpgradeModalOpen(true)}
        onRefresh={loadData}
      />

      {/* Billing History */}
      <BillingHistoryTable invoices={invoices} />

      {/* Upgrade Modal */}
      <UpgradePlanModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentTier={subscription.tier}
      />
    </div>
  );
}
