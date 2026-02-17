import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationLeagues, getUserLeaguesViaMembership } from '@/lib/actions/organization';
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
  searchParams: Promise<{ league?: string }>;
};

export default async function WebsiteEditorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { league: leagueIdParam } = await searchParams;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect({ href: '/login', locale });
    return null;
  }

  const organizations = await getUserOrganizations();
  const organization = organizations[0];

  let leagues: LeagueEditorData[] = [];

  if (organization) {
    const leaguesResult = await getOrganizationLeagues(organization.id);
    leagues = (leaguesResult.success ? (leaguesResult.data || []) : []) as LeagueEditorData[];
  }

  // Fallback: fetch via league_memberships if no org-linked leagues
  if (leagues.length === 0) {
    const membershipResult = await getUserLeaguesViaMembership();
    leagues = (membershipResult.success ? (membershipResult.data || []) : []) as LeagueEditorData[];
  }

  if (leagues.length === 0) {
    redirect({ href: '/dashboard/leagues/new', locale });
    return null;
  }

  // Respect the ?league= query param from sidebar navigation
  const initialLeagueId = leagueIdParam && leagues.some((l) => l.id === leagueIdParam)
    ? leagueIdParam
    : leagues[0].id;

  // Get the platform 2 base URL for preview
  const previewBaseUrl = process.env.NEXT_PUBLIC_LEAGUE_SITES_URL || 'http://localhost:3001';

  return (
    <WebsiteEditorClient
      organizationId={organization?.id ?? ''}
      leagues={leagues}
      previewBaseUrl={previewBaseUrl}
      initialLeagueId={initialLeagueId}
    />
  );
}
