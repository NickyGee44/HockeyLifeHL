import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, ClipboardCheck, Shield, Users } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getSeasonParticipationTeamIds,
  getSeasonParticipationTeams,
} from '@/lib/seasons/team-participation';
import { ImportSeasonTeamsButton } from '@/components/seasons/ImportSeasonTeamsButton';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

export default async function SeasonTeamsPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const serviceClient = createServiceRoleClient();

  const [{ data: league }, { data: season }, { data: divisions }] = await Promise.all([
    supabase.from('leagues').select('id, name, primary_color').eq('id', leagueId).maybeSingle(),
    supabase.from('seasons').select('id, name, start_date').eq('id', seasonId).eq('league_id', leagueId).maybeSingle(),
    supabase.from('divisions').select('id, name').eq('league_id', leagueId).order('name'),
  ]);

  if (!league || !season) {
    notFound();
  }

  const [seasonTeamIds, seasonTeams, previousSeason] = await Promise.all([
    getSeasonParticipationTeamIds(serviceClient, leagueId, seasonId),
    getSeasonParticipationTeams(serviceClient, leagueId, seasonId),
    (async () => {
      let query = serviceClient
        .from('seasons')
        .select('id, name, start_date')
        .eq('league_id', leagueId)
        .neq('id', seasonId)
        .order('start_date', { ascending: false })
        .limit(1);

      if (season.start_date) {
        query = query.lt('start_date', season.start_date);
      }

      const { data } = await query.maybeSingle();
      return data;
    })(),
  ]);

  const previousSeasonTeams = previousSeason
    ? await getSeasonParticipationTeams(serviceClient, leagueId, previousSeason.id)
    : [];
  const importableTeams = previousSeasonTeams.filter((team) => !seasonTeamIds.includes(team.id));

  const { data: rosterCounts } = await serviceClient
    .from('team_rosters')
    .select('team_id')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('status', 'active');

  const rosterCountByTeamId = new Map<string, number>();
  for (const row of rosterCounts ?? []) {
    rosterCountByTeamId.set(row.team_id, (rosterCountByTeamId.get(row.team_id) ?? 0) + 1);
  }

  const divisionNameById = new Map((divisions ?? []).map((division) => [division.id, division.name]));
  const totalRosteredPlayers = Array.from(rosterCountByTeamId.values()).reduce((sum, count) => sum + count, 0);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          <Link
            href={buildSeasonWorkspaceHref(locale, leagueId, seasonId)}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {season.name}
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-500">
                Season Workspace
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Teams
              </h1>
              <p className="mt-1 text-neutral-400">
                {league.name} / {season.name}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {previousSeason && importableTeams.length > 0 && (
                <ImportSeasonTeamsButton
                  leagueId={leagueId}
                  seasonId={seasonId}
                  sourceSeasonId={previousSeason.id}
                  sourceSeasonName={previousSeason.name}
                  teams={importableTeams.map((team) => ({
                    id: team.id,
                    name: team.name,
                    short_name: team.short_name,
                  }))}
                />
              )}
              <Link
                href={buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'registrations')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/20'
                )}
              >
                <ClipboardCheck className="w-4 h-4" />
                Review registrations
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard icon={Shield} label="Season teams" value={seasonTeams.length} />
          <StatCard icon={Users} label="Rostered players" value={totalRosteredPlayers} />
          <StatCard icon={Calendar} label="Carry-forward options" value={importableTeams.length} />
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Season teams</h2>
              <p className="text-sm text-neutral-400">
                Teams shown here are the ones actively participating in {season.name}, not every team in the league.
              </p>
            </div>
            <Link
              href={buildSeasonWorkspaceHref(locale, leagueId, seasonId, 'rosters')}
              className="mt-3 text-sm font-semibold text-rink-400 transition-colors hover:text-rink-300 md:mt-0"
            >
              Open rosters
            </Link>
          </div>

          {seasonTeams.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
              <Users className="mx-auto h-12 w-12 text-rink-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">No teams are active in this season yet</h3>
              <p className="mt-2 text-sm text-neutral-400">
                Start by carrying forward returning teams or approving registrations into this season.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {seasonTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: team.primary_color || league.primary_color || '#22D3EE' }}
                    >
                      {(team.short_name || team.name).slice(0, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-white">{team.name}</h3>
                      <p className="mt-1 text-sm text-neutral-400">
                        {divisionNameById.get(team.division_id || '') || 'Division not assigned'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Active roster</span>
                    <span className="font-semibold text-white">
                      {rosterCountByTeamId.get(team.id) ?? 0} players
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-rink-500/10 p-3 text-rink-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-neutral-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
