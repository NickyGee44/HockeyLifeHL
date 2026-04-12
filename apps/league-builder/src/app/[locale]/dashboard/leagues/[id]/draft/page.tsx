import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { buildLeagueSeasonsHref, buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';
import { getPreferredSeasonWorkspaceHref } from '@/lib/dashboard/server-workspace';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function DraftPage({ params, searchParams }: Props) {
  const { locale, id: leagueId } = await params;
  const { season } = await searchParams;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, status, start_date, end_date, registration_type')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  const seasonRows = seasons ?? [];
  if (seasonRows.length === 0) {
    redirect(buildLeagueSeasonsHref(locale, leagueId));
  }

  const explicitSeason = season ? seasonRows.find((item) => item.id === season) : null;
  const draftSeason = explicitSeason
    ?? seasonRows.find((item: any) => item.registration_type === 'draft' && item.status !== 'archived')
    ?? seasonRows.find((item: any) => item.registration_type === 'draft')
    ?? null;

  const target = draftSeason
    ? buildSeasonWorkspaceHref(locale, leagueId, draftSeason.id, 'draft')
    : await getPreferredSeasonWorkspaceHref({
        locale,
        leagueId,
        seasons: seasonRows,
        pathname: `/${locale}/dashboard/leagues/${leagueId}/draft`,
      });

  redirect(target);
}
