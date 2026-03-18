/**
 * Scorekeepers index page — redirects to the schedule view
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ScorekeepersIndexPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  redirect(`/${locale}/dashboard/leagues/${leagueId}/scorekeepers/schedule`);
}
