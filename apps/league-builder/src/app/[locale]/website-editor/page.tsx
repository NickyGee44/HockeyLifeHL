import { getCurrentUser, getUserOrganizations } from '@/lib/actions/auth';
import { getOrganizationLeagues, getUserLeaguesViaMembership } from '@/lib/actions/organization';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { WebsiteEditorClient } from '@/components/website-editor/WebsiteEditorClient';
import type { LeagueEditorData } from '@/components/website-editor/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Website Editor | Beer League Hockey',
  description: 'Customize your league website with a wireframe preview and publish changes to your live league site.',
};

function mergeUniqueLeagues(...leagueGroups: LeagueEditorData[][]): LeagueEditorData[] {
  const leaguesById = new Map<string, LeagueEditorData>();

  for (const group of leagueGroups) {
    for (const league of group) {
      if (!leaguesById.has(league.id)) {
        leaguesById.set(league.id, league);
      }
    }
  }

  return [...leaguesById.values()].sort((a, b) => a.name.localeCompare(b.name));
}

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
  const organizationResults = await Promise.all(
    organizations.map((organization) => getOrganizationLeagues(organization.id))
  );
  const organizationLeagues = organizationResults.flatMap((result) =>
    result.success ? ((result.data || []) as LeagueEditorData[]) : []
  );
  const membershipResult = await getUserLeaguesViaMembership();
  const membershipLeagues = (membershipResult.success ? (membershipResult.data || []) : []) as LeagueEditorData[];
  const leagues = mergeUniqueLeagues(organizationLeagues, membershipLeagues);

  if (leagues.length === 0) {
    redirect({ href: '/dashboard/leagues/new', locale });
    return null;
  }

  // Respect the ?league= query param from sidebar navigation
  const initialLeagueId = leagueIdParam && leagues.some((l) => l.id === leagueIdParam)
    ? leagueIdParam
    : leagues[0].id;

  // Fall back to the public app URL in production and normalize hosts later in the preview helper.
  const previewBaseUrl =
    process.env.NEXT_PUBLIC_LEAGUE_SITES_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3001';

  return (
    <WebsiteEditorClient
      organizationId={organizations[0]?.id ?? ''}
      leagues={leagues}
      previewBaseUrl={previewBaseUrl}
      initialLeagueId={initialLeagueId}
    />
  );
}
