import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { buildLeagueSeasonsHref, buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';
import { getPreferredSeasonWorkspaceHref } from '@/lib/dashboard/server-workspace';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    status?: string;
    type?: string;
    season?: string;
    search?: string;
    page?: string;
    tool?: string;
  }>;
};

export default async function RegistrationsPage({
  params,
  searchParams,
}: Props) {
  const { locale, id: leagueId } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, status, start_date, end_date')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  const seasonRows = seasons ?? [];
  if (seasonRows.length === 0) {
    redirect(buildLeagueSeasonsHref(locale, leagueId));
  }

  const explicitSeason = resolvedSearchParams.season
    ? seasonRows.find((item) => item.id === resolvedSearchParams.season)
    : null;
  const baseTarget = explicitSeason
    ? buildSeasonWorkspaceHref(locale, leagueId, explicitSeason.id, 'registrations')
    : await getPreferredSeasonWorkspaceHref({
        locale,
        leagueId,
        seasons: seasonRows,
        pathname: `/${locale}/dashboard/leagues/${leagueId}/registrations`,
      });

  const query = new URLSearchParams();
  for (const key of ['status', 'type', 'search', 'page', 'tool'] as const) {
    const value = resolvedSearchParams[key];
    if (value) {
      query.set(key, value);
    }
  }

  redirect(query.size > 0 ? `${baseTarget}?${query.toString()}` : baseTarget);
}
