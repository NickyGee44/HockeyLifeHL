import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { getPreferredSeasonWorkspaceHref } from '@/lib/dashboard/server-workspace';
import { buildLeagueSeasonsHref } from '@/lib/dashboard/workspace-routes';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ScorekeepersIndexPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
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

  redirect(
    await getPreferredSeasonWorkspaceHref({
      locale,
      leagueId,
      seasons: seasonRows,
      pathname: `/${locale}/dashboard/leagues/${leagueId}/scorekeepers/schedule`,
    })
  );
}
