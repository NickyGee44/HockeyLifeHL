/**
 * Season-scoped Standings page
 *
 * Replaces the floating /dashboard/seasons/[seasonId]/standings route.
 * Now properly nested under the league → season hierarchy.
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonStandingsPage({ params }: Props) {
  const { locale, seasonId } = await params;
  // Redirect to the existing standings page until it's fully migrated
  redirect(`/${locale}/dashboard/seasons/${seasonId}/standings`);
}
