'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Server,
  BarChart3,
  Newspaper,
  Check,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@hockey-life/ui';
import { Switch } from '@/components/ui/switch';
import { WizardStepContainer } from '../../ui/wizard/wizard-steps';
import type { WizardFormData } from '@/lib/schemas/league-wizard';

// Pricing constants
const PLATFORM_BASE_PRICE = 299.99;
const ADDON_INDIVIDUAL_PRICE = 14.99;
const ADDON_BUNDLE_PRICE = 29.99;

export function Step6Addons() {
  const { setValue, watch } = useFormContext<WizardFormData>();

  const enableAdvancedStats = watch('enableAdvancedStats') ?? false;
  const enableAiNews = watch('enableAiNews') ?? false;

  // Calculate add-on total
  const bothSelected = enableAdvancedStats && enableAiNews;
  const addonsTotal = bothSelected
    ? ADDON_BUNDLE_PRICE
    : (enableAdvancedStats ? ADDON_INDIVIDUAL_PRICE : 0) +
      (enableAiNews ? ADDON_INDIVIDUAL_PRICE : 0);
  const monthlyTotal = PLATFORM_BASE_PRICE + addonsTotal;

  return (
    <WizardStepContainer
      title="Features & Add-ons"
      description="Choose premium features to enhance your league experience. All add-ons can be changed anytime from your dashboard."
    >
      <div className="space-y-6">
        {/* Section 1: Platform Subscription */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Platform Subscription</h3>

          <Card className="bg-neutral-800/50 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="bg-rink-500/10 p-3 rounded-lg">
                  <Server className="h-6 w-6 text-rink-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">
                      Hosting & Maintenance
                    </h4>
                    <span className="text-lg font-bold">
                      $299.99
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Includes all core features: league management, scheduling,
                    standings, team rosters, player profiles, public website, and
                    ongoing platform updates.
                  </p>
                  <div className="mt-3 bg-muted/50 p-3 rounded-lg flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      This is included with every league and covers hosting,
                      maintenance, and all core platform features.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Premium Add-ons */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Premium Add-ons</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Advanced Stats Tracking */}
            <div
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                enableAdvancedStats
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() =>
                setValue('enableAdvancedStats', !enableAdvancedStats)
              }
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      enableAdvancedStats
                        ? 'bg-primary/10'
                        : 'bg-muted/50'
                    }`}
                  >
                    <BarChart3
                      className={`h-5 w-5 ${
                        enableAdvancedStats
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">Advanced Stats Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      $14.99
                      <span className="text-xs">/mo</span>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableAdvancedStats}
                  onCheckedChange={(checked) =>
                    setValue('enableAdvancedStats', checked)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                Unlock detailed statistics and analytics
              </p>

              <ul className="space-y-2">
                {[
                  'Plus/minus tracking',
                  'Time on ice',
                  'Shot tracking',
                  'Advanced goalie stats',
                  'Special teams analytics',
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 2: AI News & Summaries */}
            <div
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                enableAiNews
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setValue('enableAiNews', !enableAiNews)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      enableAiNews ? 'bg-primary/10' : 'bg-muted/50'
                    }`}
                  >
                    <Newspaper
                      className={`h-5 w-5 ${
                        enableAiNews
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold">AI News & Summaries</h4>
                    <p className="text-sm text-muted-foreground">
                      $14.99
                      <span className="text-xs">/mo</span>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableAiNews}
                  onCheckedChange={(checked) =>
                    setValue('enableAiNews', checked)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                AI-generated content for your league
              </p>

              <ul className="space-y-2">
                {[
                  'Automatic game recaps',
                  'Weekly league roundups',
                  'Player spotlights',
                  'Season narratives',
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bundle callout */}
          {bothSelected && (
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-500">
                <strong>Bundle applied!</strong> Both add-ons for $29.99/mo
                instead of $29.98/mo.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Pricing Summary */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pricing Summary</h3>

          <Card className="bg-neutral-800/50 border-white/10">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Base */}
                <div className="flex items-center justify-between py-2 border-b border-neutral-700">
                  <span className="text-muted-foreground">
                    Platform Base (Hosting & Maintenance)
                  </span>
                  <span className="font-semibold">
                    ${PLATFORM_BASE_PRICE.toFixed(2)}/mo
                  </span>
                </div>

                {/* Add-ons */}
                <div className="flex items-center justify-between py-2 border-b border-neutral-700">
                  <div>
                    <span className="text-muted-foreground">Add-ons</span>
                    {bothSelected && (
                      <p className="text-xs text-green-500">Bundle price</p>
                    )}
                    {!bothSelected &&
                      (enableAdvancedStats || enableAiNews) && (
                        <p className="text-xs text-muted-foreground">
                          {enableAdvancedStats
                            ? 'Advanced Stats'
                            : 'AI News & Summaries'}
                        </p>
                      )}
                  </div>
                  <span className="font-semibold">
                    ${addonsTotal.toFixed(2)}/mo
                  </span>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-2">
                  <span className="font-semibold text-lg">Total Monthly</span>
                  <span className="font-bold text-xl text-primary">
                    ${monthlyTotal.toFixed(2)}/mo
                  </span>
                </div>

                {/* Transaction fee note */}
                <div className="bg-muted/50 p-3 rounded-lg flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Plus 2.99% transaction fee on player payments (registration
                    fees, etc.)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </WizardStepContainer>
  );
}
