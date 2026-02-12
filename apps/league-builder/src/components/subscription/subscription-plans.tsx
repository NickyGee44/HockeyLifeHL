/**
 * Subscription Plans Component
 *
 * Free platform model with transaction-based fees.
 * Displays pricing information and optional add-ons.
 * Fee values are fetched from the platform_fee_config DB table.
 */

'use client';

import { Check, Percent, Database, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@hockey-life/ui';

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
  setupFeeCents,
  migrationFeeCents,
  setupFeeLabel,
  migrationFeeLabel,
}: SubscriptionPlansProps) {
  return (
    <div className="space-y-6">
      {/* Free Forever Card */}
      <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Free Forever</CardTitle>
              <CardDescription className="text-base mt-1">
                Build and manage your leagues at no cost
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
            {[
              'Unlimited leagues',
              'Unlimited teams & players',
              'Schedule generation',
              'Standings & statistics',
              'Player registration system',
              'Game scorekeeping',
              'Custom branding & colors',
              'Public league website',
              'Email notifications',
              'Analytics dashboard',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How We Earn */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Simple, Transparent Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Transaction Fee */}
          <Card>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">Payment Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <span className="text-2xl font-bold text-primary">{processingFeePercent}%</span>
                <span className="text-sm text-muted-foreground"> per transaction</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Applied to player registration payments. Covers Stripe fees and platform costs.
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
                  {migrationFeeCents > 0 ? formatCents(migrationFeeCents) : 'Custom'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                One-time fee based on league size to import historical stats and records.
              </p>
              <a
                href="mailto:support@beerleaguehockey.ca?subject=Historic Data Import"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Get a Quote
              </a>
            </CardContent>
          </Card>

          {/* Setup Fee / Custom Domain */}
          <Card>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">Custom Domain</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <span className="text-2xl font-bold">Add-on</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Use your own domain with SSL certificate included.
              </p>
              <a
                href="mailto:support@beerleaguehockey.ca?subject=Custom Domain Setup"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Get a Quote
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
