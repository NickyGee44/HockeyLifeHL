import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationLeagues } from '@/lib/actions/organization';
import { redirect } from '@/i18n/navigation';
import { BrandingSettingsClient } from './branding-settings-client';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BrandingSettingsPage({ params }: Props) {
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

  // Get leagues for this organization
  const leaguesResult = await getOrganizationLeagues(organization.id);
  const leagues = leaguesResult.success ? leaguesResult.data : [];

  return (
    <BrandingSettingsClient
      organizationId={organization.id}
      leagues={leagues || []}
    />
  );
}
