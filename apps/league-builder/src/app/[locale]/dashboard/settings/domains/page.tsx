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
    redirect({ href: '/login', locale });
    return null; // TypeScript needs this after redirect
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect({ href: '/dashboard', locale });
    return null; // TypeScript needs this after redirect
  }

  return <DomainSettingsContent organization={organization} />;
}
