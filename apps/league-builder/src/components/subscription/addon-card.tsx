/**
 * Add-On Card Component
 *
 * Displays individual add-on (Advanced Stats, AI News Writer) with:
 * - Icon, name, price, description
 * - Status badge (active, inactive)
 * - Activate/Cancel buttons
 * - Renewal date if active
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, CheckCircle2, ExternalLink, TrendingUp, Zap } from 'lucide-react';
import { createAddonCheckout, cancelAddon, type AddonType, type OrgAddon } from '@/lib/actions/addons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AddonCardProps {
  addonType: AddonType;
  addon: OrgAddon | null;
  orgId: string;
  onRefresh: () => void;
}

const ADDON_CONFIG: Record<
  AddonType,
  { icon: React.ReactNode; configKey: string }
> = {
  platform_subscription: {
    icon: <TrendingUp className="w-5 h-5" />,
    configKey: 'platform_subscription',
  },
  advanced_stats: {
    icon: <span className="text-xl">📊</span>,
    configKey: 'advanced_stats',
  },
  ai_news: {
    icon: <span className="text-xl">✍️</span>,
    configKey: 'ai_news',
  },
};

export function AddonCard({ addonType, addon, orgId, onRefresh }: AddonCardProps) {
  const t = useTranslations('subscription.addon');
  const tConfig = useTranslations(`subscription.addon.config.${addonType}`);
  const [loading, setLoading] = useState(false);

  const config = ADDON_CONFIG[addonType];
  const isActive = addon?.status === 'active' || addon?.status === 'trialing';
  const isCancelled = !!addon?.cancelled_at;
  const isPastDue = addon?.status === 'past_due';

  async function handleActivate() {
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/dashboard/settings/subscription?addon_activated=${addonType}`;
      const cancelUrl = `${window.location.origin}/dashboard/settings/subscription?checkout=cancelled`;

      const result = await createAddonCheckout(orgId, addonType, successUrl, cancelUrl);
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
    if (!confirm(t('cancelConfirm', { name: tConfig('name') }))) {
      return;
    }

    setLoading(true);
    try {
      const result = await cancelAddon(orgId, addonType);
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

  return (
    <div
      className={`bg-neutral-800/50 rounded-xl p-5 border transition-colors ${
        isActive && !isCancelled
          ? 'border-green-500/30'
          : isPastDue
            ? 'border-yellow-500/30'
            : 'border-white/5 hover:border-white/10'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rink-500/10 flex items-center justify-center text-rink-500">
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{tConfig('name')}</h3>
            <p className="text-xs text-neutral-500">{tConfig('price')}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-400 mb-4">{tConfig('description')}</p>

      {/* Status Badge */}
      {isActive && !isCancelled && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t('active')}</span>
          {addon?.current_period_end && (
            <span className="text-neutral-500 ml-1">
              • {t('renews', { date: new Date(addon.current_period_end).toLocaleDateString() })}
            </span>
          )}
        </div>
      )}

      {isActive && isCancelled && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-yellow-400">
          <span>{t('cancellingAtPeriodEnd')}</span>
        </div>
      )}

      {isPastDue && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-yellow-400">
          <span>{t('paymentIssue')}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-2">
        {!isActive && (
          <Button
            onClick={handleActivate}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-medium hover:shadow-lg hover:shadow-rink-500/20 transition-all text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                {t('addToPlan')}
              </>
            )}
          </Button>
        )}

        {isActive && !isCancelled && (
          <Button
            onClick={handleCancel}
            disabled={loading}
            variant="outline"
            className="flex-1 border-white/10 text-neutral-300 hover:bg-white/5 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
