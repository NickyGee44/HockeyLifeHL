import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonRostersRedirectPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  redirect(`${buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'teams')}?tab=rosters`);
}
