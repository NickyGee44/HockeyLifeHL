import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@hockey-life/ui';
import { CreditCard, Calendar, TrendingUp } from 'lucide-react';

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

  // Calculate days remaining in trial
  const orgData = organization as any;
  const trialEndsAt = new Date(orgData.trial_ends_at);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Current Plan</CardTitle>
          <CardDescription className="text-neutral-400">
            Your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gold-500/10 rounded-xl border border-gold-500/30">
            <div>
              <h3 className="text-lg font-semibold text-neutral-100 capitalize">
                {orgData.subscription_tier} Plan
              </h3>
              <p className="text-sm text-neutral-400">
                Status: <span className="font-medium capitalize text-gold-500">{orgData.subscription_status}</span>
              </p>
            </div>
            <div className="text-right">
              {orgData.subscription_status === 'trialing' && (
                <div>
                  <p className="text-2xl font-bold text-gold-500">
                    {daysRemaining} days
                  </p>
                  <p className="text-xs text-neutral-400">remaining in trial</p>
                </div>
              )}
            </div>
          </div>

          {orgData.subscription_status === 'trialing' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-neutral-100 mb-1">
                    Trial Period Active
                  </h4>
                  <p className="text-sm text-neutral-400">
                    Your trial ends on {trialEndsAt.toLocaleDateString()}. Upgrade to a paid plan to continue using all features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Payment Method</CardTitle>
          <CardDescription className="text-neutral-400">
            Manage your payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">
              No payment method on file
            </p>
            <button
              disabled
              className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl opacity-50 cursor-not-allowed"
            >
              Add Payment Method
            </button>
            <p className="text-xs text-neutral-500 mt-2">
              Stripe integration coming soon
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Available Plans</CardTitle>
          <CardDescription className="text-neutral-400">
            Choose the plan that works best for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Starter Plan */}
            <div className="border border-gold-500/20 rounded-xl p-6 bg-neutral-900/50">
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                Starter
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-neutral-100">$29</span>
                <span className="text-neutral-400">/month</span>
              </div>
              <ul className="space-y-2 text-sm text-neutral-400 mb-6">
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Up to 2 leagues</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> 100 players total</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Basic analytics</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Email support</li>
              </ul>
              <button
                disabled
                className="w-full px-4 py-2 bg-neutral-700 text-neutral-400 rounded-xl cursor-not-allowed"
              >
                Current Plan
              </button>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-gold-500 rounded-xl p-6 relative bg-neutral-900/50 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-gradient-to-r from-gold-500 to-gold-600 text-black text-xs font-semibold px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                Pro
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gold-500">$79</span>
                <span className="text-neutral-400">/month</span>
              </div>
              <ul className="space-y-2 text-sm text-neutral-400 mb-6">
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Up to 10 leagues</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> 500 players total</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Advanced analytics</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Custom branding</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Priority support</li>
              </ul>
              <button
                disabled
                className="w-full px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-xl opacity-50 cursor-not-allowed"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="border border-gold-500/20 rounded-xl p-6 bg-neutral-900/50">
              <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                Enterprise
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-neutral-100">Custom</span>
              </div>
              <ul className="space-y-2 text-sm text-neutral-400 mb-6">
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Unlimited leagues</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Unlimited players</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> White-label option</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Dedicated support</li>
                <li className="flex items-center gap-2"><span className="text-gold-500">✓</span> Custom integrations</li>
              </ul>
              <button
                disabled
                className="w-full px-4 py-2 border border-gold-500/50 text-gold-500 rounded-xl cursor-not-allowed"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card className="bg-neutral-800/50 border-gold-500/20">
        <CardHeader>
          <CardTitle className="text-neutral-100">Billing History</CardTitle>
          <CardDescription className="text-neutral-400">
            View your past invoices and receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400">
              No billing history yet
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
