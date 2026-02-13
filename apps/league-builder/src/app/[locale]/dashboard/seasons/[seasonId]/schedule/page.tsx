/**
 * Season Schedule Page — Redirect
 *
 * Redirects to the league-scoped schedule page with ?season= param.
 * The canonical URL is now /dashboard/leagues/[id]/schedule?season=[seasonId]
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ locale: string; seasonId: string }>;
};

export default async function SeasonSchedulePage({ params }: Props) {
  const { locale, seasonId } = await params;

  const supabase = await createClient();
  const { data: season } = await supabase
    .from('seasons')
    .select('league_id')
    .eq('id', seasonId)
    .single();

  if (season?.league_id) {
    redirect(`/${locale}/dashboard/leagues/${season.league_id}/schedule?season=${seasonId}`);
  }

  // Fallback if season not found
  redirect(`/${locale}/dashboard`);
}
