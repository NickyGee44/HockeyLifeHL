// NOTE: This component must NEVER be used in league-sites (player-facing). For league-builder (admin) only.
'use client';

import { Lock, BarChart3, Newspaper, ArrowRight } from 'lucide-react';

type AddonType = 'advanced_stats' | 'ai_news';

const ADDON_CONFIG: Record<AddonType, {
  icon: typeof BarChart3;
  name: string;
  price: string;
  features: string[];
}> = {
  advanced_stats: {
    icon: BarChart3,
    name: 'Advanced Stats',
    price: '$14.99/mo',
    features: [
      'Full leaderboards & rankings',
      'Special teams statistics',
      'Goalie analytics & comparisons',
      'Advanced box scores',
      'Player comparison tools',
    ],
  },
  ai_news: {
    icon: Newspaper,
    name: 'AI News Writer',
    price: '$14.99/mo',
    features: [
      'Automatic game recaps',
      'Weekly roundup articles',
      'Player spotlight stories',
      'AI-powered content generation',
    ],
  },
};

interface AddonUpsellProps {
  addonType: AddonType;
  compact?: boolean;
}

export function AddonUpsell({ addonType, compact = false }: AddonUpsellProps) {
  const config = ADDON_CONFIG[addonType];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <Lock className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
        <p className="text-sm text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text)]">{config.name}</span> addon required for full access.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--league-primary,#3b82f6)]/10">
        <Lock className="h-6 w-6 text-[var(--league-primary,#3b82f6)]" />
      </div>

      <h3 className="mb-1 text-lg font-bold text-[var(--color-text)]">
        Unlock {config.name}
      </h3>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        {config.price} &middot; Cancel anytime
      </p>

      <ul className="mb-6 space-y-2 text-left">
        {config.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--league-primary,#3b82f6)]" />
            {feature}
          </li>
        ))}
      </ul>

      <a
        href="/dashboard/settings/billing"
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--league-primary,#3b82f6)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Upgrade Now
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
