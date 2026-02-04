/**
 * Billing Settings Page
 *
 * Organization-level subscription management with Stripe integration.
 * Displays current plan, billing history, and upgrade options.
 */

import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BillingPageClient } from './page-client';

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
