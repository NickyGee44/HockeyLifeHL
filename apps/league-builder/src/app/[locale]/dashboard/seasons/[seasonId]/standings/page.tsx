import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';

type Props = {
  params: Promise<{ locale: string; seasonId: string }>;
};

export default async function LegacySeasonStandingsPage({ params }: Props) {
  const { locale, seasonId } = await params;

  const supabase = await createClient();
  const { data: season } = await supabase
    .from('seasons')
    .select('league_id')
    .eq('id', seasonId)
    .single();

  if (season?.league_id) {
    redirect(buildSeasonWorkspaceHref(locale, season.league_id, seasonId, 'standings'));
  }

  redirect(`/${locale}/dashboard`);
}
