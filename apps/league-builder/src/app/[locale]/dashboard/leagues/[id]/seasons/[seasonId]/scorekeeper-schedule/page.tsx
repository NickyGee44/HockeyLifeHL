/**
 * Season-scoped Scorekeeper Schedule page
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonScorekeeperSchedulePage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  redirect(`/${locale}/dashboard/leagues/${leagueId}/scorekeepers/schedule`);
}
