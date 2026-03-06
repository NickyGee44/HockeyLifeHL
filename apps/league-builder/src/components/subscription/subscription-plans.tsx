/**
 * Subscription Plans Component
 *
 * Displays the 4 tiered pricing tiers (Small / Standard / Large / Enterprise)
 * with an interactive calculator to estimate fees based on team count and
 * estimated registration revenue.
 *
 * Tier data is sourced directly from platform-fees.ts constants so the UI
 * stays in sync with the fee logic without extra props threading.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Calculator, Database, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type PricingTier,
  TIER_RATE_BPS,
  TIER_MONTHLY_FLOOR_CENTS,
  TIER_CONTRACT_MONTHS,
  SMALL_TIER_FLAT_FEE_CENTS,
  determinePricingTier,
  getEffectiveRateBps,
} from '@/lib/fees/platform-fees';

interface SubscriptionPlansProps {
  processingFeePercent: number;
  setupFeeCents: number;
  migrationFeeCents: number;
  setupFeeLabel: string;
  migrationFeeLabel: string;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

const TIER_ORDER: PricingTier[] = ['small', 'standard', 'large', 'enterprise'];

const TIER_HIGHLIGHTED: PricingTier = 'standard';

export function SubscriptionPlans({
  migrationFeeCents,
  migrationFeeLabel,
}: SubscriptionPlansProps) {
  const t = useTranslations('subscription.plans');
  const tFeatures = useTranslations('subscription.plans.features');
  const tTiers = useTranslations('subscription.plans.tiers');
  const tCalc = useTranslations('subscription.plans.calculator');

  const [calcTeams, setCalcTeams] = useState<string>('');
  const [calcFees, setCalcFees] = useState<string>('');

  const teamCount = parseInt(calcTeams, 10) || 0;
  const estimatedFeesCents = Math.round((parseFloat(calcFees) || 0) * 100);
  const calculatedTier = teamCount > 0 || estimatedFeesCents > 0
    ? determinePricingTier(teamCount, estimatedFeesCents)
    : null;

  const estimatedPlatformCost = calculatedTier
    ? calculatedTier === 'small'
      ? SMALL_TIER_FLAT_FEE_CENTS
      : Math.round((estimatedFeesCents * getEffectiveRateBps(calculatedTier, 0)) / 10000)
    : 0;

  return (
    <div className="space-y-8">
      {/* Platform Features Card */}
      <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{t('platformMonthly')}</CardTitle>
              <CardDescription className="text-base mt-1">
                {t('platformDescription')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              'unlimitedLeagues',
              'unlimitedTeams',
              'scheduleGeneration',
              'standingsStats',
              'playerRegistration',
              'gameScorekeeping',
              'customBranding',
              'publicWebsite',
              'emailNotifications',
              'analyticsDashboard',
            ] as const).map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-sm">{tFeatures(key)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('simpleTransparentPricing')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {TIER_ORDER.map((tier) => {
            const rateBps = TIER_RATE_BPS[tier];
            const floorCents = TIER_MONTHLY_FLOOR_CENTS[tier];
            const contractMonths = TIER_CONTRACT_MONTHS[tier];
            const isHighlighted = tier === TIER_HIGHLIGHTED;
            const isEnterprise = tier === 'enterprise';

            return (
              <Card
                key={tier}
                className={
                  isHighlighted
                    ? 'border-2 border-primary relative'
                    : 'border relative'
                }
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      {tTiers('mostCommon')}
                    </span>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-base capitalize">{tTiers(tier)}</CardTitle>
                  <CardDescription className="text-xs">{tTiers(`${tier}Criteria`)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Rate */}
                  <div>
                    {tier === 'small' ? (
                      <>
                        <span className="text-2xl font-bold text-primary">
                          {formatCents(SMALL_TIER_FLAT_FEE_CENTS)}
                        </span>
                        <span className="text-sm text-muted-foreground"> {tTiers('perSeason')}</span>
                      </>
                    ) : isEnterprise ? (
                      <>
                        <span className="text-2xl font-bold text-primary">
                          {formatBps(rateBps)}–3.00%
                        </span>
                        <span className="text-sm text-muted-foreground"> {tTiers('negotiated')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-primary">{formatBps(rateBps)}</span>
                        <span className="text-sm text-muted-foreground"> {tTiers('ofGrossReg')}</span>
                      </>
                    )}
                  </div>

                  {/* Monthly floor */}
                  <div className="text-sm text-muted-foreground">
                    {floorCents === 0 ? (
                      <span>{tTiers('noMonthlyFloor')}</span>
                    ) : floorCents === -1 ? (
                      <span>{tTiers('negotiatedFloor')}</span>
                    ) : (
                      <span>
                        {formatCents(floorCents)}/mo {tTiers('floor')}
                      </span>
                    )}
                  </div>

                  {/* Contract */}
                  <div className="text-sm text-muted-foreground">
                    {contractMonths === 0 ? (
                      <span>{tTiers('noContract')}</span>
                    ) : isEnterprise ? (
                      <span>{tTiers('multiYear')}</span>
                    ) : (
                      <span>
                        {contractMonths === 12 ? tTiers('annualContract') : tTiers('twoYearContract')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3">{t('referralNote')}</p>
      </div>

      {/* Tier Calculator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">{tCalc('title')}</CardTitle>
          </div>
          <CardDescription>{tCalc('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="calc-teams">
                {tCalc('teamCount')}
              </label>
              <input
                id="calc-teams"
                type="number"
                min="0"
                placeholder="e.g. 12"
                value={calcTeams}
                onChange={(e) => setCalcTeams(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="calc-fees">
                {tCalc('estimatedFees')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  id="calc-fees"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 25000"
                  value={calcFees}
                  onChange={(e) => setCalcFees(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          {calculatedTier ? (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{tCalc('yourTier')}</span>
                <span className="font-bold text-primary capitalize">
                  {tTiers(calculatedTier)} {tCalc('tier')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tCalc('estimatedPlatformCost')}</span>
                <span className="font-semibold">
                  {calculatedTier === 'enterprise'
                    ? tCalc('contactSales')
                    : formatCents(estimatedPlatformCost)}
                </span>
              </div>
              {calculatedTier !== 'small' && calculatedTier !== 'enterprise' && (
                <p className="text-xs text-muted-foreground">{tCalc('floorNote')}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{tCalc('enterValues')}</p>
          )}
        </CardContent>
      </Card>

      {/* Add-on services */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('premiumServices')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Historic Data Import */}
          <Card>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">{migrationFeeLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <span className="text-2xl font-bold">
                  {migrationFeeCents > 0 ? formatCents(migrationFeeCents) : t('custom')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{t('oneTimeFee')}</p>
              <a
                href="mailto:support@beerleaguehockey.ca?subject=Historic Data Import"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                {t('getQuote')}
              </a>
            </CardContent>
          </Card>

          {/* Custom Domain */}
          <Card>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">{t('customDomain')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <span className="text-2xl font-bold">{t('addOn')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('customDomainDesc')}</p>
              <a
                href="mailto:support@beerleaguehockey.ca?subject=Custom Domain Setup"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                {t('getQuote')}
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
