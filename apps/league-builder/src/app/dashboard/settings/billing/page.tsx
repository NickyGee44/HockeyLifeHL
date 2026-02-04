import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { CreditCard, Percent, Database, Globe, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '@hockey-life/ui';

export const dynamic = 'force-dynamic';

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

  return (
    <div className="space-y-6">
      {/* Free Platform Banner */}
      <Card className="bg-gradient-to-br from-gold-500/10 to-gold-600/5 border-gold-500/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Free Forever</h2>
              <p className="text-neutral-300">
                Build and manage your leagues at no cost. We only earn when you do.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">How Pricing Works</CardTitle>
          <CardDescription className="text-neutral-400">
            Simple, transparent pricing with no hidden fees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Transaction Fee */}
            <div className="border border-gold-500/20 rounded-xl p-6 bg-neutral-900/50">
              <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center mb-4">
                <Percent className="w-6 h-6 text-gold-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                Payment Processing
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gold-500">2.99%</span>
                <span className="text-neutral-400"> per transaction</span>
              </div>
              <p className="text-sm text-neutral-400">
                We process all player registration payments through Stripe. Our fee covers payment processing, fraud protection, and platform costs.
              </p>
            </div>

            {/* Data Import */}
            <div className="border border-gold-500/20 rounded-xl p-6 bg-neutral-900/50">
              <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-gold-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                Historic Data Import
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-neutral-100">Custom</span>
              </div>
              <p className="text-sm text-neutral-400">
                Want to import your league's historical stats, standings, and player records? We'll migrate your data for a one-time fee based on league size.
              </p>
              <a
                href="mailto:support@hockeylifehl.com?subject=Historic Data Import"
                className={cn(
                  'inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gold-500/10 text-gold-500 border border-gold-500/30',
                  'hover:bg-gold-500/20 transition-colors'
                )}
              >
                Get a Quote
              </a>
            </div>

            {/* Custom Domain */}
            <div className="border border-gold-500/20 rounded-xl p-6 bg-neutral-900/50">
              <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-gold-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                Custom Domains
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-neutral-100">Add-on</span>
              </div>
              <p className="text-sm text-neutral-400">
                Use your own domain (e.g., myleague.com) instead of our subdomain. Includes SSL certificate and DNS configuration support.
              </p>
              <a
                href="mailto:support@hockeylifehl.com?subject=Custom Domain Setup"
                className={cn(
                  'inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gold-500/10 text-gold-500 border border-gold-500/30',
                  'hover:bg-gold-500/20 transition-colors'
                )}
              >
                Get a Quote
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Included Free */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Everything Included Free</CardTitle>
          <CardDescription className="text-neutral-400">
            No limits, no tiers, no surprises
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Unlimited leagues',
              'Unlimited teams',
              'Unlimited players',
              'Unlimited seasons',
              'Schedule generation',
              'Standings & statistics',
              'Player registration',
              'Team management',
              'Game scorekeeping',
              'Custom branding & colors',
              'Public league website',
              'Email notifications',
              'Mobile-friendly interface',
              'Analytics dashboard',
              'Player photo uploads',
              'Waiver management',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <span className="text-sm text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-gold-500/20 transition-all"
            >
              Go to Leagues
            </a>
            <p className="text-xs text-neutral-500 mt-2">
              Set up Stripe Connect in each league's billing settings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
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
    </div>
  );
}
