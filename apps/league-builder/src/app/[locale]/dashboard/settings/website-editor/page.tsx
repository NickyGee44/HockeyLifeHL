import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationLeagues } from '@/lib/actions/organization';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { WebsiteEditorClient } from '@/components/website-editor/WebsiteEditorClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Website Editor | Beer League Hockey',
  description: 'Customize your league website with live preview',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function WebsiteEditorPage({ params }: Props) {
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

  if (!leagues || leagues.length === 0) {
    redirect('/dashboard/leagues/new');
  }

  // Get the platform 2 base URL for preview
  const previewBaseUrl = process.env.NEXT_PUBLIC_LEAGUE_SITES_URL || 'http://localhost:3001';

  return (
    <WebsiteEditorClient
      organizationId={organization.id}
      leagues={leagues}
      previewBaseUrl={previewBaseUrl}
    />
  );
}
