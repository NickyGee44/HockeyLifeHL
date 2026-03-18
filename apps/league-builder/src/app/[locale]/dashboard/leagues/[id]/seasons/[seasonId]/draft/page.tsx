/**
 * Season-scoped Draft Room page
 */
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonDraftPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  redirect(`/${locale}/dashboard/leagues/${leagueId}/draft`);
}
