import * as React from 'react';
import { notFound } from 'next/navigation';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { SeasonWorkspaceTracker } from '@/components/dashboard/SeasonWorkspaceTracker';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonWorkspaceLayout({ children, params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const { data: season } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', leagueId)
    .eq('id', seasonId)
    .maybeSingle();

  if (!season) {
    notFound();
  }

  return (
    <>
      <SeasonWorkspaceTracker
        leagueId={leagueId}
        seasonId={seasonId}
        seasonName={season.name}
      />
      {children}
    </>
  );
}
