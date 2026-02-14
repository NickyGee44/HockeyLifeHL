/**
 * New Season Wizard Page
 *
 * Guided wizard for creating a new season with roster import from previous seasons.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewSeasonWizard from './wizard-client';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function NewSeasonPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, organization_id')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Get previous season (if any)
  const { data: previousSeason } = await supabase
    .from('seasons')
    .select('id, name, start_date, end_date')
    .eq('league_id', leagueId)
    .order('end_date', { ascending: false })
    .limit(1)
    .single();

  // Get teams in the league
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, logo_url, primary_color')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('name');

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NewSeasonWizard
          leagueId={leagueId}
          leagueName={league.name}
          previousSeason={previousSeason}
          teams={teams || []}
          locale={locale}
        />
      </div>
    </div>
  );
}
