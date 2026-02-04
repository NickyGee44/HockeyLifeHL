/**
 * Billing Settings Page
 *
 * Shows the setup + processing fee model with Stripe Connect status.
 * No subscription tiers or monthly plans.
 */

import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { CreditCard, Percent, DollarSign, CheckCircle, TrendingUp, Mail } from 'lucide-react';
import { getPlatformFeeConfig } from '@/lib/fees/platform-fees';

export const dynamic = 'force-dynamic';

function formatCAD(cents: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
}

export default async function BillingSettingsPage() {
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect('/dashboard');
  }

  const feeConfig = await getPlatformFeeConfig();

  return (
    <div className="space-y-6">
      {/* Pricing Model */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">How Pricing Works</CardTitle>
          <CardDescription className="text-neutral-400">
            Simple, transparent pricing with no hidden fees or subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setup Fee */}
            <div className="border border-white/10 rounded-xl p-6 bg-neutral-900/50">
              <div className="w-12 h-12 rounded-xl bg-rink-500/10 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-rink-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                One-Time Setup Fee
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-rink-500">
                  {feeConfig.setupFeeCents > 0 ? formatCAD(feeConfig.setupFeeCents) : 'Contact Us'}
                </span>
              </div>
              <p className="text-sm text-neutral-400">
                Covers onboarding, platform configuration, domain setup, and data migration.
                Required once per league before going live.
              </p>
            </div>

            {/* Processing Fee */}
            <div className="border border-white/10 rounded-xl p-6 bg-neutral-900/50">
              <div className="w-12 h-12 rounded-xl bg-rink-500/10 flex items-center justify-center mb-4">
                <Percent className="w-6 h-6 text-rink-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                Payment Processing
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-rink-500">{feeConfig.processingFeePercent}%</span>
                <span className="text-neutral-400"> per transaction</span>
              </div>
              <p className="text-sm text-neutral-400">
                Applied to all player payments processed through the platform.
                Can be passed to players or absorbed by the league.
                Stripe card processing fees apply separately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Included */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">Everything Included</CardTitle>
          <CardDescription className="text-neutral-400">
            Full platform access with no limits or tiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Unlimited leagues',
              'Unlimited teams & players',
              'Schedule generation',
              'Standings & statistics',
              'Player registration',
              'Game scorekeeping',
              'Custom branding & colors',
              'Public league website',
              'Email notifications',
              'Analytics dashboard',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-rink-500 flex-shrink-0" />
                <span className="text-sm text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stripe Connect */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">Stripe Connect</CardTitle>
          <CardDescription className="text-neutral-400">
            Connect your Stripe account to receive player payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">
              Connect your Stripe account to start accepting registration payments
            </p>
            <a
              href="/dashboard/leagues"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-rink-500/20 transition-all"
            >
              Go to Leagues
            </a>
            <p className="text-xs text-neutral-500 mt-2">
              Set up Stripe Connect in each league&apos;s billing settings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-neutral-100">Transaction History</CardTitle>
          <CardDescription className="text-neutral-400">
            View your payment processing history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400">
              No transactions yet
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              Transaction history will appear here once players start registering
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-neutral-800/50 border-white/10">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-neutral-500" />
            <p className="text-sm text-neutral-400">
              Need custom terms, volume pricing, or have billing questions?{' '}
              <a href="mailto:support@beerleaguehockey.ca" className="text-rink-500 hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
