/**
 * Season Standings Page — Redirect
 *
 * Redirects to the league dashboard with season context.
 * TODO: Create a league-scoped standings page at /dashboard/leagues/[id]/standings
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ locale: string; seasonId: string }>;
};

export default async function SeasonStandingsPage({ params }: Props) {
  const { locale, seasonId } = await params;

  const supabase = await createClient();
  const { data: season } = await supabase
    .from('seasons')
    .select('league_id')
    .eq('id', seasonId)
    .single();

  if (season?.league_id) {
    redirect(`/${locale}/dashboard/leagues/${season.league_id}?season=${seasonId}`);
  }

  redirect(`/${locale}/dashboard`);
}
