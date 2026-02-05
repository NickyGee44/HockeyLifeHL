/**
 * Billing Settings Page
 *
 * Organization-level subscription management with Stripe integration.
 * Displays current plan, billing history, and upgrade options.
 * Only organization owners can manage billing.
 */

import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BillingPageClient } from './page-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BillingSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect('/dashboard');
  }

  // Check if current user is the organization owner
  const isOwner = organization.owner_user_id === userData.user.id;

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 mb-2">Billing & Subscription</h1>
          <p className="text-neutral-400">
            Organization billing management
          </p>
        </div>

        <Card className="bg-neutral-800/50 border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-yellow-500/10">
                <Shield className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <CardTitle className="text-neutral-100">Owner Access Required</CardTitle>
                <CardDescription className="text-neutral-400">
                  Only organization owners can manage billing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-400">
              Contact your organization owner to manage subscription and billing settings.
              If you believe you should have access, please reach out to your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100 mb-2">Billing & Subscription</h1>
        <p className="text-neutral-400">
          Manage your organization subscription and view billing history
        </p>
      </div>

      <BillingPageClient />
    </div>
  );
}
