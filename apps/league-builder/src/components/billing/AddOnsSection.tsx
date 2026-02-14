'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { getOrgAddons, type AddonType, type OrgAddon } from '@/lib/actions/addons';
import { AddOnCard } from './AddOnCard';
import { Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AddOnsSectionProps {
  orgId: string;
  hasStripeCustomer: boolean;
}

const ADDON_TYPES: AddonType[] = ['platform_subscription', 'advanced_stats', 'ai_news'];

export function AddOnsSection({ orgId, hasStripeCustomer }: AddOnsSectionProps) {
  const t = useTranslations('billing');
  const [addons, setAddons] = useState<OrgAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  async function loadAddons() {
    setLoading(true);
    const result = await getOrgAddons(orgId);
    if (result.success) {
      setAddons(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAddons();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAddons is a data-fetching function that depends on orgId; including it would require useCallback and cause render churn
  }, [orgId]);

  function getAddonByType(type: AddonType): OrgAddon | null {
    return addons.find((a) => a.addon_type === type) || null;
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
        toast.error(t('portal.error'), { description: data.error });
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error(t('portal.error'));
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-rink-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-arena-500/10">
            <Sparkles className="w-6 h-6 text-arena-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              {t('addons.title')}
            </h2>
            <p className="text-neutral-400 text-sm">
              {t('addons.description')}
            </p>
          </div>
        </div>

        {/* Manage Billing Button */}
        {hasStripeCustomer && (
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700 hover:text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                {t('portal.manage')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Add-On Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {ADDON_TYPES.map((type) => (
          <AddOnCard
            key={type}
            addonType={type}
            addon={getAddonByType(type)}
            orgId={orgId}
            onRefresh={loadAddons}
          />
        ))}
      </div>
    </div>
  );
}
