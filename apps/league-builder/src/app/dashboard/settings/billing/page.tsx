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
  const trialEndsAt = new Date(organization.trial_ends_at);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {organization.subscription_tier} Plan
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Status: <span className="font-medium capitalize">{organization.subscription_status}</span>
              </p>
            </div>
            <div className="text-right">
              {organization.subscription_status === 'trialing' && (
                <div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {daysRemaining} days
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">remaining in trial</p>
                </div>
              )}
            </div>
          </div>

          {organization.subscription_status === 'trialing' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    Trial Period Active
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your trial ends on {trialEndsAt.toLocaleDateString()}. Upgrade to a paid plan to continue using all features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Manage your payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No payment method on file
            </p>
            <button
              disabled
              className="px-4 py-2 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed"
            >
              Add Payment Method
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Stripe integration coming soon
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that works best for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Starter Plan */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Starter
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">$29</span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                <li>✓ Up to 2 leagues</li>
                <li>✓ 100 players total</li>
                <li>✓ Basic analytics</li>
                <li>✓ Email support</li>
              </ul>
              <button
                disabled
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md cursor-not-allowed"
              >
                Current Plan
              </button>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-blue-500 dark:border-blue-600 rounded-lg p-6 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Pro
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">$79</span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                <li>✓ Up to 10 leagues</li>
                <li>✓ 500 players total</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Custom branding</li>
                <li>✓ Priority support</li>
              </ul>
              <button
                disabled
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Enterprise
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">Custom</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                <li>✓ Unlimited leagues</li>
                <li>✓ Unlimited players</li>
                <li>✓ White-label option</li>
                <li>✓ Dedicated support</li>
                <li>✓ Custom integrations</li>
              </ul>
              <button
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md cursor-not-allowed"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View your past invoices and receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No billing history yet
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
