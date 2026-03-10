/**
 * New Season Wizard Page
 *
 * Guided wizard for creating a new season with roster import from previous seasons.
 */

import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import NewSeasonWizard from './wizard-client';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSeasonParticipationTeams } from '@/lib/seasons/team-participation';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function NewSeasonPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const serviceClient = createServiceRoleClient();

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
  const { data: previousSeason } = await serviceClient
    .from('seasons')
    .select('id, name, start_date, end_date')
    .eq('league_id', leagueId)
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousSeasonTeams = previousSeason
    ? await getSeasonParticipationTeams(serviceClient, leagueId, previousSeason.id)
    : [];

  const teams =
    previousSeasonTeams.length > 0
      ? previousSeasonTeams
      : (
          await serviceClient
            .from('teams')
            .select('id, name, short_name, logo_url, primary_color, secondary_color, division_id, home_venue_id, status')
            .eq('league_id', leagueId)
            .eq('status', 'active')
            .order('name')
        ).data || [];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NewSeasonWizard
          leagueId={leagueId}
          leagueName={league.name}
          previousSeason={previousSeason}
          teams={teams}
          locale={locale}
        />
      </div>
    </div>
  );
}
