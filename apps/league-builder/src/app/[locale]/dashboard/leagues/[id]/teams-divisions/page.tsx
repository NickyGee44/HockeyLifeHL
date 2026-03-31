import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getDivisions } from '@/lib/actions/divisions';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Plus } from 'lucide-react';
import { TeamsDivisionsClient } from './teams-divisions-client';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { getSeasonParticipationTeamIds } from '@/lib/seasons/team-participation';
import { getPreferredSeasonWorkspace } from '@/lib/dashboard/server-workspace';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function TeamsDivisionsPage({ params, searchParams }: Props) {
  const awaited = await params;
  const awaitedSearch = await searchParams;
  const { locale, id: leagueId } = awaited;
  const { tab } = awaitedSearch;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const serviceClient = createServiceRoleClient();

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Teams & Divisions Page] Error fetching league:', leagueError?.message);
    notFound();
  }

  // Keep this league-level page aligned with the currently selected season
  // workspace instead of guessing from whichever season is active.
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, status, start_date, end_date')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false })
    .returns<Array<{
      id: string;
      name: string;
      status: string | null;
      start_date: string | null;
      end_date: string | null;
    }>>();

  const preferredSeason = await getPreferredSeasonWorkspace(leagueId, seasons ?? []);
  const seasonTeamIds = preferredSeason
    ? await getSeasonParticipationTeamIds(serviceClient, leagueId, preferredSeason.id)
    : null;

  // Build teams query — filter to current-season teams if we have a season
  const baseTeamsQuery = supabase
    .from('teams')
    .select(`
      id,
      name,
      short_name,
      primary_color,
      secondary_color,
      logo_url,
      status,
      division_id,
      divisions (
        id,
        name
      )
    `)
    .eq('league_id', leagueId)
    .neq('status', 'inactive')
    .order('name');

  const { data: teams, error: teamsError } = seasonTeamIds === null
    ? await baseTeamsQuery
    : seasonTeamIds.length > 0
      ? await baseTeamsQuery.in('id', seasonTeamIds)
      : { data: [], error: null };

  if (teamsError) {
    console.error('[Teams & Divisions Page] Error fetching teams:', teamsError.message);
  }

  // Get divisions
  const divisionsResult = await getDivisions(leagueId);
  const divisions = divisionsResult.success ? divisionsResult.data : [];

  const totalTeams = teams?.length ?? 0;
  const unassignedTeams = (teams ?? []).filter(
    (team: { division_id: string | null }) => !team.division_id
  ).length;

  // Fetch players registered for this league who haven't been assigned to a team yet.
  // Uses serviceClient so the profiles join isn't blocked by RLS (which restricts
  // profiles reads to auth.uid() only on the regular client).
  let freeAgentQuery = serviceClient
    .from('registration_submissions')
    .select(`
      id,
      player_id,
      status,
      preferred_position,
      preferred_jersey_number,
      payment_status,
      amount_paid_cents,
      submitted_at,
      player:profiles!registration_submissions_player_id_fkey(
        id, full_name, email, phone
      )
    `)
    .eq('league_id', leagueId)
    .is('team_id', null)
    .or('status.eq.approved,status.eq.imported')
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  if (preferredSeason) {
    freeAgentQuery = freeAgentQuery.eq('season_id', preferredSeason.id);
  }

  const { data: freeAgentPlayers } = await freeAgentQuery;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Teams & Divisions</h1>
              <p className="text-neutral-400 mt-1">
                Manage teams and divisions in {league.name}
                {preferredSeason ? ` for ${preferredSeason.name ?? 'the selected season'}` : ''}
              </p>
            </div>

            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/teams/new`}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-4 h-4" />
              Add Team
            </Link>
          </div>
        </div>

        {/* Tabbed Content */}
        <TeamsDivisionsClient
          leagueId={leagueId}
          leagueName={league.name}
          leaguePrimaryColor={league.primary_color}
          locale={locale}
          teams={teams || []}
          divisions={divisions || []}
          freeAgentPlayers={freeAgentPlayers || []}
          totalTeams={totalTeams || 0}
          unassignedTeams={unassignedTeams || 0}
          initialTab={tab || 'teams'}
        />
      </div>
    </div>
  );
}
