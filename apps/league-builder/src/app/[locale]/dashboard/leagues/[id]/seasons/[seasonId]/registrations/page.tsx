/**
 * Season-scoped Registrations page
 *
 * Passes the seasonId as a pre-selected filter to the existing registrations page.
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonRegistrationsPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  // Redirect to existing registrations page with season pre-selected
  redirect(`/${locale}/dashboard/leagues/${leagueId}/registrations?season=${seasonId}`);
}
