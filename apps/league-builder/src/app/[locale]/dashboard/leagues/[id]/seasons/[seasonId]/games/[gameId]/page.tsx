/**
 * Season-scoped Game Detail page — redirects to existing game detail
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string; gameId: string }>;
};

export default async function SeasonGameDetailPage({ params }: Props) {
  const { locale, id: leagueId, gameId } = await params;
  redirect(`/${locale}/dashboard/leagues/${leagueId}/games/${gameId}`);
}
