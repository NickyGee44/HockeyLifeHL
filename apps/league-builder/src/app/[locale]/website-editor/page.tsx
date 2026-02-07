import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationLeagues } from '@/lib/actions/organization';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { WebsiteEditorClient } from '@/components/website-editor/WebsiteEditorClient';
import type { LeagueEditorData } from '@/components/website-editor/types';

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
    redirect({ href: '/login', locale });
    return null;
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  if (!organization) {
    redirect({ href: '/dashboard', locale });
    return null;
  }

  // Get leagues for this organization (cast to LeagueEditorData for the editor)
  const leaguesResult = await getOrganizationLeagues(organization.id);
  const leagues = (leaguesResult.success ? leaguesResult.data : []) as LeagueEditorData[];

  if (!leagues || leagues.length === 0) {
    redirect({ href: '/dashboard/leagues/new', locale });
    return null;
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
