import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationLeagues, getUserLeaguesViaMembership } from '@/lib/actions/organization';
import { redirect } from '@/i18n/navigation';
import { BrandingSettingsClient } from '@/components/dashboard/settings/branding-settings-client';
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
    redirect({ href: '/login', locale });
    return null;
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  let leagues: any[] = [];

  if (organization) {
    // Primary path: fetch leagues linked to the organization
    const leaguesResult = await getOrganizationLeagues(organization.id);
    leagues = leaguesResult.success ? (leaguesResult.data || []) : [];
  }

  // Fallback: if no org or no org-linked leagues, fetch via league_memberships
  if (leagues.length === 0) {
    const membershipResult = await getUserLeaguesViaMembership();
    leagues = membershipResult.success ? (membershipResult.data || []) : [];
  }

  return (
    <BrandingSettingsClient
      organizationId={organization?.id}
      leagues={leagues}
    />
  );
}
