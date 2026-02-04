import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationLeagues } from '@/lib/actions/organization';
import { redirect } from 'next/navigation';
import { BrandingSettingsClient } from './branding-settings-client';

export const dynamic = 'force-dynamic';

export default async function BrandingSettingsPage() {
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
