/**
 * Subscription Plans Component
 *
 * Free platform model with transaction-based fees.
 * Displays pricing information and optional add-ons.
 * Fee values are fetched from the platform_fee_config DB table.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Check, Percent, Database, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  }).format(cents / 100);
}

export function SubscriptionPlans({
  processingFeePercent,
  migrationFeeCents,
  migrationFeeLabel,
}: SubscriptionPlansProps) {
  const t = useTranslations('subscription.plans');
  const tFeatures = useTranslations('subscription.plans.features');
  return (
    <div className="space-y-6">
      {/* Free Forever Card */}
      <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{t('freeForever')}</CardTitle>
              <CardDescription className="text-base mt-1">
                {t('freeDescription')}
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-primary">$0</span>
              <span className="text-muted-foreground">/month</span>
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

      {/* How We Earn */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('simpleTransparentPricing')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Transaction Fee */}
          <Card>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">{t('paymentProcessing')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <span className="text-2xl font-bold text-primary">{processingFeePercent}%</span>
                <span className="text-sm text-muted-foreground"> {t('perTransaction')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('appliedToRegistration')}
              </p>
            </CardContent>
          </Card>

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
              <p className="text-sm text-muted-foreground">
                {t('oneTimeFee')}
              </p>
              <a
                href="mailto:support@beerleaguehockey.ca?subject=Historic Data Import"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                {t('getQuote')}
              </a>
            </CardContent>
          </Card>

          {/* Setup Fee / Custom Domain */}
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
              <p className="text-sm text-muted-foreground">
                {t('customDomainDesc')}
              </p>
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
