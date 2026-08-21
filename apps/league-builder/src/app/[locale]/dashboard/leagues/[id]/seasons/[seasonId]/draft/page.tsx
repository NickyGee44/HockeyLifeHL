import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DraftDashboard } from '@/components/dashboard/leagues/draft-dashboard';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonDraftPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const { supabase, userData } = await requireLeagueDashboardAccess({ leagueId, locale });
  const userId = userData.user.id;

  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('id, name, status, registration_type')
    .eq('id', seasonId)
    .eq('league_id', leagueId)
    .single();

  if (seasonError || !season) {
    notFound();
  }

  const [{ data: league, error: leagueError }, { data: allSeasons }] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name, slug')
      .eq('id', leagueId)
      .single(),
    supabase
      .from('seasons')
      .select('id, name, status, registration_type')
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false }),
  ]);

  if (leagueError || !league) {
    notFound();
  }

  const pastSeasons = ((allSeasons ?? []).filter(
    (row: any) => row.id !== season.id && (row.status === 'completed' || row.status === 'archived')
  ) as Array<{ id: string; name: string; status: string | null }>).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status ?? 'archived',
  }));

  const { data: existingDraft } = await (supabase as any)
    .from('drafts')
    .select('id, status, name')
    .eq('league_id', leagueId)
    .eq('season_id', season.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let teams: { id: string; name: string }[] = [];
  if (existingDraft) {
    const { data: draftOrderRows } = await (supabase as any)
      .from('draft_order')
      .select('team_id, teams(id, name)')
      .eq('draft_id', existingDraft.id)
      .order('pick_position', { ascending: true });

    const seen = new Set<string>();
    for (const row of draftOrderRows ?? []) {
      const team = (row as any).teams;
      if (team && !seen.has(team.id)) {
        seen.add(team.id);
        teams.push({ id: team.id, name: team.name });
      }
    }
  } else {
    const { data: seasonRosterRows } = await supabase
      .from('team_rosters')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('season_id', season.id)
      .is('end_date', null);

    const seasonTeamIds = [...new Set((seasonRosterRows ?? []).map((row) => row.team_id))];

    if (seasonTeamIds.length > 0) {
      const { data: seasonTeams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', leagueId)
        .eq('status', 'active')
        .in('id', seasonTeamIds)
        .order('name', { ascending: true });
      teams = seasonTeams ?? [];
    } else {
      const { data: activeLeagueTeams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', leagueId)
        .eq('status', 'active')
        .order('name', { ascending: true });
      teams = activeLeagueTeams ?? [];
    }
  }

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .maybeSingle();

  const isAdmin =
    membership?.status === 'active' &&
    (membership.role === 'owner' || membership.role === 'admin');
  const canFinalizeRosters = isAdmin;

  const { data: captainTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId)
    .eq('captain_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={buildSeasonWorkspaceHref(locale, leagueId, seasonId)}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Season
        </Link>

        <DraftDashboard
          leagueId={leagueId}
          leagueName={league.name}
          seasonId={season.id}
          seasonName={season.name}
          existingDraft={existingDraft || null}
          teams={teams}
          pastSeasons={pastSeasons}
          userId={userId}
          userTeamId={captainTeam?.id || null}
          isAdmin={isAdmin}
          canFinalizeRosters={canFinalizeRosters}
          isCaptain={!!captainTeam}
        />
      </div>
    </div>
  );
}
