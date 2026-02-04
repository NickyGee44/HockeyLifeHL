/**
 * Domain Settings Page (Localized)
 *
 * Allows organizations to manage their subdomain and custom domain settings.
 * Custom domains require Enterprise plan or can be purchased as an add-on.
 */

import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { redirect } from '@/i18n/navigation';
import { DomainSettingsContent } from '@/components/dashboard/domain-settings-content';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DomainSettingsPage({ params }: Props) {
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

  return <DomainSettingsContent organization={organization} />;
}
