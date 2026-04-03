import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Edit,
  Play,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { SetupChecklistCard } from '@/components/onboarding/SetupChecklistCard';
import { StatsExportButton } from '@/components/seasons/StatsExportButton';
import { SeasonStatusTransitionButton } from '@/components/seasons/SeasonStatusTransitionButton';
import { ImportSeasonTeamsButton } from '@/components/seasons/ImportSeasonTeamsButton';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getSeasonParticipationTeamIds,
  getSeasonParticipationTeams,
} from '@/lib/seasons/team-participation';
import { getSeasonStatusLabel } from '@/lib/seasons/status-display';
import {
  buildLeagueHubHref,
  buildSeasonWorkspaceHref,
} from '@/lib/dashboard/workspace-routes';
import { buildSeasonWorkspaceChecklistState } from '@/lib/onboarding/routing';
import { hasAdvancedStatsAddon } from '@/lib/utils/addon-helpers';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
};

function localizeHref(locale: string, href: string) {
  return href.startsWith(`/${locale}/`) ? href : `/${locale}${href}`;
}

export default async function SeasonDetailPage({ params }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const { supabase, access, userData } = await requireLeagueDashboardAccess({ leagueId, locale });
  const serviceClient = createServiceRoleClient();

  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select(
      `
      *,
      league:leagues(
        id,
        name,
        slug,
        primary_color
      )
    `
    )
    .eq('id', seasonId)
    .eq('league_id', leagueId)
    .single();

  if (seasonError || !season) {
    notFound();
  }

  const [
    seasonTeamIds,
    previousSeason,
    rosterCountResult,
    waiverTemplateResult,
    scorekeepersResult,
    refereesResult,
    advancedStatsEnabled,
    { count: gamesCount },
    { count: registrationsCount },
  ] = await Promise.all([
    getSeasonParticipationTeamIds(serviceClient, leagueId, seasonId),
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
    serviceClient
      .from('team_rosters')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    serviceClient
      .from('league_waiver_templates')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('is_active', true),
    serviceClient
      .from('league_scorekeepers')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('is_active', true),
    (serviceClient as any)
      .from('league_referees')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('is_active', true),
    hasAdvancedStatsAddon(leagueId),
    supabase.from('games').select('*', { count: 'exact', head: true }).eq('season_id', seasonId),
    supabase
      .from('registration_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'pending')
      .not('submitted_at', 'is', null),
  ]);

  const previousSeasonTeams = previousSeason
    ? await getSeasonParticipationTeams(serviceClient, leagueId, previousSeason.id)
    : [];
  const importableTeams = previousSeasonTeams.filter((team) => !seasonTeamIds.includes(team.id));
  const teamsCount = seasonTeamIds.length;

  const seasonChecklist = buildSeasonWorkspaceChecklistState({
    leagueId,
    seasonId,
    teamCount: teamsCount,
    registrationCount: registrationsCount ?? 0,
    rosterCount: rosterCountResult.count ?? 0,
    scheduleGenerated: season.schedule_generated === true,
    waiverTemplateConfigured: (waiverTemplateResult.count ?? 0) > 0,
    staffConfigured: (scorekeepersResult.count ?? 0) + (refereesResult.count ?? 0) > 0,
    playoffConfigured:
      season.status === 'playoffs' ||
      Boolean((season as Record<string, unknown>).playoff_format),
    advancedStatsEnabled,
  });

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userData.user.id)
    .maybeSingle();

  const canEdit =
    access.accessType === 'platform_admin' ||
    access.accessType === 'org_owner' ||
    access.accessType === 'league_admin' ||
    membership?.role === 'owner' ||
    membership?.role === 'admin';

  const statusColors: Record<string, string> = {
    active: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
    draft: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    completed: 'border-white/[0.10] bg-white/[0.05] text-neutral-300',
    playoffs: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  };

  const primaryActionHref = localizeHref(
    locale,
    seasonChecklist.nextActionHref || buildSeasonWorkspaceHref('', leagueId, seasonId, 'schedule')
  );
  const primaryActionLabel = seasonChecklist.nextActionLabel || 'Open schedule workspace';

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={buildLeagueHubHref(locale, leagueId)}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {season.league?.name || 'League'}
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_0_24px_rgba(34,211,238,0.2)]"
                style={{ backgroundColor: season.league?.primary_color || '#22D3EE' }}
              >
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rink-300/80">
                  Season Workspace
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">{season.name}</h1>
                <p className="mt-2 text-sm leading-7 text-neutral-300">
                  Season home now focuses on launch status, checklist progress, and one clear next
                  step. Teams, registrations, schedules, games, and advanced tools live in the shell.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-semibold',
                  statusColors[season.status ?? 'draft'] || statusColors.draft
                )}
              >
                {getSeasonStatusLabel(season.status ?? 'draft', season.registration_type)}
              </span>
              {canEdit ? (
                <SeasonStatusTransitionButton
                  seasonId={seasonId}
                  currentStatus={season.status ?? 'draft'}
                />
              ) : null}
              {canEdit && previousSeason && importableTeams.length > 0 ? (
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
              ) : null}
              <Link
                href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${seasonId}/edit`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
              >
                <Edit className="h-4 w-4" />
                Edit season
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <SeasonMetricCard label="Teams" value={teamsCount || 0} icon={<Users className="h-4 w-4" />} />
            <SeasonMetricCard label="Games" value={gamesCount || 0} icon={<Play className="h-4 w-4" />} />
            <SeasonMetricCard label="Registrations" value={registrationsCount || 0} icon={<UserPlus className="h-4 w-4" />} />
            <SeasonMetricCard
              label="Schedule"
              value={season.schedule_generated ? 'Generated' : 'Pending'}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={primaryActionHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-rink-500 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-rink-400"
            >
              {primaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={buildLeagueHubHref(locale, leagueId)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
            >
              Open league hub
            </Link>
          </div>
        </section>

        {canEdit && previousSeason && importableTeams.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-rink-400/20 bg-rink-500/10 p-4">
            <div className="flex items-center gap-2 text-rink-200">
              <Users className="h-4 w-4" />
              <p className="text-sm font-semibold">Season carry-forward available</p>
            </div>
            <p className="mt-2 text-sm leading-7 text-neutral-300">
              {importableTeams.length} team{importableTeams.length === 1 ? '' : 's'} can be brought
              forward from {previousSeason.name}. Use the import action in the header when you are
              ready.
            </p>
          </section>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SetupChecklistCard checklist={seasonChecklist} locale={locale} />

          <div className="space-y-6">
            <SeasonSummarySurface
              eyebrow="Launch progress"
              title={teamsCount > 0 ? `${teamsCount} season team${teamsCount === 1 ? '' : 's'} ready` : 'Teams still need setup'}
              description={
                rosterCountResult.count
                  ? `${rosterCountResult.count} roster assignment${rosterCountResult.count === 1 ? '' : 's'} are already in place.`
                  : 'Bring teams forward or import rosters before registrations ramp up.'
              }
              icon={<Users className="h-4 w-4" />}
              tone="primary"
            />
            <SeasonSummarySurface
              eyebrow="Operations"
              title={season.schedule_generated ? 'Schedule is active' : 'Schedule still needs build/import'}
              description={
                (scorekeepersResult.count ?? 0) + (refereesResult.count ?? 0) > 0
                  ? 'Officials or scorekeepers are already configured for game operations.'
                  : 'Staffing can stay deferred until the schedule is closer to live.'
              }
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <SeasonSummarySurface
              eyebrow="Deferred tools"
              title={season.status === 'playoffs' ? 'Playoffs are active' : 'Playoffs and advanced stats stay secondary'}
              description={
                advancedStatsEnabled
                  ? 'Advanced stats are enabled for this season. Use More Tools in the shell when needed.'
                  : 'Leave playoffs and deeper stats for later unless this season needs them immediately.'
              }
              icon={<Trophy className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/[0.10] bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Season Details
              </p>
              <h2 className="mt-3 text-xl font-bold text-white">Operational configuration snapshot</h2>
              <p className="mt-2 text-sm leading-7 text-neutral-400">
                Core season settings remain editable from the season settings screen. Export stays
                here because it is a task, not a navigation surface.
              </p>
            </div>
            <StatsExportButton
              leagueId={leagueId}
              seasonId={seasonId}
              seasonName={season.name}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Registration Type" value={formatRegistrationType(season.registration_type)} />
            <DetailItem label="Games per Cycle" value={season.games_per_cycle?.toString() || 'Not set'} />
            <DetailItem label="Max Players per Team" value={season.max_players_per_team?.toString() || 'Unlimited'} />
            <DetailItem label="Team Selection" value={season.allow_team_selection ? 'Players can choose' : 'Admin assigned'} />
            <DetailItem label="Current Game Count" value={season.current_game_count?.toString() || '0'} />
            <DetailItem label="Waiver Setup" value={(waiverTemplateResult.count ?? 0) > 0 ? 'Configured' : 'Not configured'} />
            <DetailItem label="Officials + Staffing" value={(scorekeepersResult.count ?? 0) + (refereesResult.count ?? 0) > 0 ? 'Configured' : 'Pending'} />
            <DetailItem label="Advanced Stats" value={advancedStatsEnabled ? 'Enabled' : 'Optional'} />
            <DetailItem label="Created" value={season.created_at ? new Date(season.created_at).toLocaleDateString() : 'Unknown'} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SeasonMetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-neutral-400">
        <span className="rounded-xl bg-rink-500/10 p-2 text-rink-300">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-4 truncate text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function SeasonSummarySurface({
  eyebrow,
  title,
  description,
  icon,
  tone = 'default',
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone?: 'default' | 'primary';
}) {
  return (
    <div
      className={cn(
        'surface-premium p-5',
        tone === 'primary' && 'border-rink-400/15 bg-[linear-gradient(145deg,rgba(34,211,238,0.10),rgba(255,255,255,0.03))]'
      )}
    >
      <div className="flex items-center gap-2 text-neutral-400">
        <span className="rounded-xl bg-rink-500/10 p-2 text-rink-300">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{eyebrow}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-neutral-400">{description}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function formatRegistrationType(type: string | null): string {
  const types: Record<string, string> = {
    open_registration: 'Open Registration',
    draft: 'Draft',
    captain_invite_only: 'Captain Invite Only',
  };

  return types[type || ''] || type || 'Not set';
}
