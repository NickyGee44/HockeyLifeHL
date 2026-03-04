'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  createAddonCheckout,
  cancelAddon,
  type AddonType,
  type OrgAddon,
} from '@/lib/actions/addons';
import { Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface AddOnCardProps {
  addonType: AddonType;
  addon: OrgAddon | null;
  orgId: string;
  onRefresh: () => void;
}

const ADDON_CONFIG: Record<
  AddonType,
  { icon: string; priceLabel: string; amountCents: number }
> = {
  platform_subscription: {
    icon: '🏒',
    priceLabel: '$0/mo',
    amountCents: 0,
  },
  advanced_stats: {
    icon: '📊',
    priceLabel: '$14.99/mo',
    amountCents: 1499,
  },
  ai_news: {
    icon: '✍️',
    priceLabel: '$14.99/mo',
    amountCents: 1499,
  },
};

export function AddOnCard({ addonType, addon, orgId, onRefresh }: AddOnCardProps) {
  const t = useTranslations('billing.addons');
  const [loading, setLoading] = useState(false);

  const config = ADDON_CONFIG[addonType];
  const isActive = addon?.status === 'active' || addon?.status === 'trialing';
  const isCancelled = !!addon?.cancelled_at;
  const isPastDue = addon?.status === 'past_due';

  async function handleActivate() {
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}${window.location.pathname}?addon_activated=${addonType}`;
      const cancelUrl = window.location.href;

      const result = await createAddonCheckout(orgId, addonType, successUrl, cancelUrl);
      if (result.success) {
        window.location.href = result.data.url;
      } else {
        toast.error(t('activationFailed'), { description: result.error });
      }
    } catch {
      toast.error(t('activationFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const result = await cancelAddon(orgId, addonType);
      if (result.success) {
        toast.success(t('cancelledSuccess'));
        onRefresh();
      } else {
        toast.error(t('cancelFailed'), { description: result.error });
      }
    } catch {
      toast.error(t('cancelFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        'bg-neutral-800/50 rounded-xl p-5 border transition-colors',
        isActive && !isCancelled
          ? 'border-green-500/30'
          : isPastDue
            ? 'border-yellow-500/30'
            : 'border-white/5 hover:border-white/10'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">
              {t(`${addonType}.name`)}
            </h3>
            <p className="text-xs text-neutral-400">
              {t(`${addonType}.description`)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-white text-sm">{config.priceLabel}</p>
        </div>
      </div>

      {/* Status Badge */}
      {isActive && !isCancelled && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t('statusActive')}</span>
          {addon?.current_period_end && (
            <span className="text-neutral-500 ml-1">
              {t('renewsOn', { date: new Date(addon.current_period_end).toLocaleDateString() })}
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
          <span>{t('pastDue')}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-2">
        {!isActive && !isPastDue && (
          <button
            onClick={handleActivate}
            disabled={loading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                {t('activate')}
              </>
            )}
          </button>
        )}

        {isActive && !isCancelled && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-neutral-700/50 text-neutral-300 hover:bg-neutral-700 hover:text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('cancelSubscription')
            )}
          </button>
        )}
      </div>
    </div>
  );
}
