import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Plus,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';
import StaffDashboardPanel from '@/components/staff/StaffDashboardPanel';
import { getCurrentUser } from '@/lib/actions/auth';
import { getCachedDashboardData, type LeagueSummary } from '@/lib/actions/dashboard';
import { getStaffDashboardData } from '@/lib/actions/staff-dashboard';
import { createClient } from '@/lib/supabase/server';
import { getPlatformOwnerView } from '@/lib/auth/platform-owner-view';
import {
  hasDraftSeason,
  isOperationalSeasonStatus,
  pickOperationalSeason,
} from '@/lib/seasons/operational';
import {
  ACTIVE_SEASON_WORKSPACE_COOKIE,
  parseActiveSeasonWorkspaceCookie,
} from '@/lib/dashboard/workspace-cookie';
import {
  buildLeagueHubHref,
  buildLeagueSeasonsHref,
  buildSeasonWorkspaceHref,
} from '@/lib/dashboard/workspace-routes';
import { resolveDashboardEntryHref } from '@/lib/onboarding/routing';

type Props = {
  params: Promise<{ locale: string }>;
};

type LeagueSeasonSnapshot = {
  id: string;
  league_id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule_generated: boolean | null;
  registration_type: string | null;
};

type LeagueCommandSource = {
  league: LeagueSummary;
  orgName: string;
  memberRole: string | null;
};

type LeaguePortfolioItem = {
  id: string;
  name: string;
  status: string;
  logoUrl: string | null;
  primaryColor: string | null;
  teamCount: number;
  playerCount: number;
  orgName: string;
  memberRole: string | null;
  currentSeason: LeagueSeasonSnapshot | null;
  seasonCount: number;
  nextAction: {
    label: string;
    href: string;
    tone: 'primary' | 'warning' | 'neutral';
  };
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
  const userData = await getCurrentUser();

  if (!userData) {
    redirect(`/${locale}/login`);
  }

  const { user, profile } = userData;
  if (profile?.is_platform_admin) {
    const ownerView = await getPlatformOwnerView();
    if (ownerView) {
      redirect(`/${locale}/dashboard/leagues/${ownerView.leagueId}`);
    }

    redirect(`/${locale}/dashboard/admin`);
  }

  const [dashboardData, staffData] = await Promise.all([
    getCachedDashboardData(),
    getStaffDashboardData(),
  ]);

  if (!dashboardData) {
    redirect(`/${locale}/setup-organization`);
  }

  const { organizations, totals, managed_leagues = [] } = dashboardData;
  const primaryOrg = organizations[0];
  const subscriptionTier = primaryOrg?.subscription_tier || 'starter';
  const subscriptionStatus = primaryOrg?.subscription_status || 'active';

  const leagueSources = new Map<string, LeagueCommandSource>();

  for (const org of organizations) {
    for (const league of org.leagues) {
      leagueSources.set(league.id, {
        league,
        orgName: org.name,
        memberRole: 'owner',
      });
    }
  }

  for (const league of managed_leagues) {
    if (!leagueSources.has(league.id)) {
      leagueSources.set(league.id, {
        league,
        orgName: 'Managed league',
        memberRole: league.member_role,
      });
    }
  }

  const leagueIds = Array.from(leagueSources.keys());
  const supabase = await createClient();
  const { data: seasonRows } =
    leagueIds.length > 0
      ? await supabase
          .from('seasons')
          .select('id, league_id, name, status, start_date, end_date, schedule_generated, registration_type')
          .in('league_id', leagueIds)
          .order('start_date', { ascending: false })
      : { data: [] as LeagueSeasonSnapshot[] };

  const seasonsByLeague = new Map<string, LeagueSeasonSnapshot[]>();
  for (const season of seasonRows ?? []) {
    const existing = seasonsByLeague.get(season.league_id) ?? [];
    existing.push(season);
    seasonsByLeague.set(season.league_id, existing);
  }

  const cookieStore = await cookies();
  const activeWorkspace = parseActiveSeasonWorkspaceCookie(
    cookieStore.get(ACTIVE_SEASON_WORKSPACE_COOKIE)?.value
  );

  const mostRecentStoredWorkspace = Object.entries(activeWorkspace)
    .filter(([leagueId, entry]) => leagueSources.has(leagueId) && !!entry.seasonId)
    .sort((left, right) => {
      const leftTs = left[1].updatedAt ? new Date(left[1].updatedAt).getTime() : 0;
      const rightTs = right[1].updatedAt ? new Date(right[1].updatedAt).getTime() : 0;
      return rightTs - leftTs;
    })[0];

  const dashboardEntryHref = resolveDashboardEntryHref(locale, {
    hasOrganization: organizations.length > 0,
    leagues: Array.from(leagueSources.values()).map(({ league }) => {
      const seasons = seasonsByLeague.get(league.id) ?? [];
      const storedSeasonId = activeWorkspace[league.id]?.seasonId ?? null;
      const storedSeasonStillExists = storedSeasonId
        ? seasons.some((season) => season.id === storedSeasonId)
        : false;
      const preferredSeasonId = storedSeasonStillExists
        ? storedSeasonId
        : (pickOperationalSeason(seasons)?.id ?? seasons[0]?.id ?? null);

      return {
        leagueId: league.id,
        preferredSeasonId,
        hasAnySeason: seasons.length > 0,
      };
    }),
    storedLeagueId: mostRecentStoredWorkspace?.[0] ?? null,
    storedSeasonId: mostRecentStoredWorkspace?.[1]?.seasonId ?? null,
  });

  if (dashboardEntryHref) {
    redirect(dashboardEntryHref);
  }

  const portfolioItems = Array.from(leagueSources.values())
    .map(({ league, orgName, memberRole }) => {
      const seasons = seasonsByLeague.get(league.id) ?? [];
      const currentSeason = pickOperationalSeason(seasons);

      return {
        id: league.id,
        name: league.name,
        status: league.status,
        logoUrl: league.logo_url,
        primaryColor: league.primary_color,
        teamCount: league.team_count,
        playerCount: league.player_count,
        orgName,
        memberRole,
        currentSeason,
        seasonCount: seasons.length,
        nextAction: getLeagueNextAction({ league, currentSeason, seasons }),
      } satisfies LeaguePortfolioItem;
    })
    .sort(sortPortfolioItems);

  const heroAction =
    portfolioItems[0]?.nextAction ?? {
      label: t('navigation.createLeague'),
      href: '/dashboard/leagues/new',
      tone: 'primary' as const,
    };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-8">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-rink-300/60 to-transparent" />
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rink-300/80">
                Organization Portfolio
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                {t('dashboard.welcome', {
                  name: profile?.full_name || user.email?.split('@')[0] || 'User',
                })}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-300 sm:text-base">
                Company-level setup, league setup, and season setup are now staged separately.
                Use the shell to move between portfolio, league, and season scopes. This page is
                only for portfolio status and the next action that needs your attention.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={heroAction.href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-[transform,box-shadow,background-color]',
                    heroAction.tone === 'warning'
                      ? 'bg-amber-400/15 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.14)] hover:bg-amber-400/20'
                      : 'bg-rink-500 text-black shadow-[0_0_30px_rgba(34,211,238,0.25)] hover:-translate-y-0.5 hover:bg-rink-400'
                  )}
                >
                  {heroAction.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard/leagues"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
                >
                  Open league list
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PortfolioMetricCard
                label={t('company.leagues')}
                value={portfolioItems.length || totals.total_leagues}
                icon={<Trophy className="h-4 w-4" />}
              />
              <PortfolioMetricCard
                label={t('teams.title')}
                value={totals.total_teams}
                icon={<Users className="h-4 w-4" />}
              />
              <PortfolioMetricCard
                label={t('players.title')}
                value={totals.total_players}
                icon={<Users className="h-4 w-4" />}
              />
              <PortfolioMetricCard
                label={t('dashboard.gamesPlayed')}
                value={totals.total_games_played ?? 0}
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-premium p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Portfolio Overview
            </p>
            <h2 className="mt-3 text-xl font-bold text-white">
              {primaryOrg?.name || 'Organization'} is managing {portfolioItems.length || totals.total_leagues} league
              {portfolioItems.length === 1 ? '' : 's'}.
            </h2>
            <p className="mt-2 text-sm leading-7 text-neutral-400">
              Organization settings and billing now live in the shell. Each league below shows its
              current operating season and only one recommended next step so owners do not need to
              hunt for the right workspace.
            </p>
          </div>

          <div className="surface-premium p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Billing Status
                </p>
                <h2 className="mt-3 text-xl font-bold text-white capitalize">{subscriptionTier}</h2>
              </div>
              <CreditCard className="h-5 w-5 text-rink-300" />
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between text-neutral-400">
                <span>Status</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
                    subscriptionStatus === 'active'
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-400/20 bg-amber-500/10 text-amber-200'
                  )}
                >
                  {subscriptionStatus === 'active' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  <span className="capitalize">{subscriptionStatus}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>Platform fee</span>
                <span className="font-semibold text-white">3.5%</span>
              </div>
              <Link
                href="/dashboard/settings/billing"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-rink-400/20 bg-rink-500/10 px-4 py-2 text-sm font-semibold text-rink-200 transition-colors hover:bg-rink-500/20"
              >
                Manage billing
              </Link>
            </div>
          </div>
        </section>

        {staffData.isStaff ? (
          <div className="mt-6">
            <StaffDashboardPanel data={staffData} />
          </div>
        ) : null}

        <section className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Leagues
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">Portfolio league status</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Inline actions stay with each league record. All other navigation lives in the shell.
              </p>
            </div>
            <Link
              href="/dashboard/leagues/new"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
            >
              <Plus className="h-4 w-4" />
              {t('navigation.createLeague')}
            </Link>
          </div>

          {portfolioItems.length === 0 ? (
            <div className="surface-premium mt-5 p-8 text-center">
              <Trophy className="mx-auto h-12 w-12 text-rink-400" />
              <h3 className="mt-4 text-xl font-bold text-white">{t('dashboardCta.createLeague')}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-neutral-400">
                Create your first league shell, connect the essentials, and move directly into your
                first season wizard.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {portfolioItems.map((league) => (
                <PortfolioLeagueCard key={league.id} league={league} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PortfolioMetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-neutral-400">
        <span className="rounded-xl bg-rink-500/10 p-2 text-rink-300">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function PortfolioLeagueCard({ league }: { league: LeaguePortfolioItem }) {
  return (
    <article className="surface-premium overflow-hidden p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <LeagueLogo
            logoUrl={league.logoUrl}
            leagueName={league.name}
            primaryColor={league.primaryColor || '#22D3EE'}
            size="md"
            shape="square"
            bordered
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                {league.orgName}
              </p>
              {league.memberRole && league.memberRole !== 'owner' ? (
                <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-1 text-[11px] font-semibold capitalize text-neutral-300">
                  {league.memberRole}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 truncate text-2xl font-black tracking-tight text-white">{league.name}</h3>
            <p className="mt-2 text-sm text-neutral-400">
              {league.currentSeason
                ? `${league.currentSeason.name} is the current operating season.`
                : 'This league still needs its first season workspace.'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[360px]">
          <PortfolioStat label="Teams" value={league.teamCount} />
          <PortfolioStat label="Players" value={league.playerCount} />
          <PortfolioStat label="Seasons" value={league.seasonCount} />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-white/[0.08] pt-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Next Step
          </p>
          <p className="mt-2 text-sm text-neutral-300">{league.nextAction.label}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={league.nextAction.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors',
              league.nextAction.tone === 'warning'
                ? 'bg-amber-400/15 text-amber-100 hover:bg-amber-400/20'
                : 'bg-rink-500/10 text-rink-200 hover:bg-rink-500/20'
            )}
          >
            Open next step
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={buildLeagueHubHref('', league.id)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
          >
            Open league hub
          </Link>
        </div>
      </div>
    </article>
  );
}

function PortfolioStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function getLeagueNextAction({
  league,
  currentSeason,
  seasons,
}: {
  league: LeagueSummary;
  currentSeason: LeagueSeasonSnapshot | null;
  seasons: LeagueSeasonSnapshot[];
}) {
  if (league.status === 'draft') {
    return {
      label: 'Continue league setup',
      href: `/dashboard/leagues/${league.id}`,
      tone: 'warning' as const,
    };
  }

  if (league.team_count === 0) {
    return {
      label: 'Open the league hub',
      href: buildLeagueHubHref('', league.id),
      tone: 'warning' as const,
    };
  }

  if (!currentSeason) {
    return {
      label: 'Create the first season for this league',
      href: `${buildLeagueSeasonsHref('', league.id)}/new`,
      tone: 'warning' as const,
    };
  }

  if (!isOperationalSeasonStatus(currentSeason.status)) {
    return {
      label: 'Choose a season workspace',
      href: buildLeagueHubHref('', league.id),
      tone: 'warning' as const,
    };
  }

  if (
    currentSeason.status === 'playoffs' &&
    !hasDraftSeason(seasons, { excludeSeasonId: currentSeason.id })
  ) {
    return {
      label: 'Create the next season before playoffs end',
      href: `${buildLeagueSeasonsHref('', league.id)}/new`,
      tone: 'primary' as const,
    };
  }

  if (league.player_count === 0) {
    return {
      label: 'Review registrations in the active season',
      href: `${buildSeasonWorkspaceHref('', league.id, currentSeason.id, 'registrations')}?tool=import-players`,
      tone: 'warning' as const,
    };
  }

  if (!currentSeason.schedule_generated) {
    return {
      label: 'Build or import the schedule',
      href: `${buildSeasonWorkspaceHref('', league.id, currentSeason.id, 'schedule')}?tool=import-schedule`,
      tone: 'primary' as const,
    };
  }

  return {
    label: 'Open the active season workspace',
    href: buildSeasonWorkspaceHref('', league.id, currentSeason.id),
    tone: 'neutral' as const,
  };
}

function sortPortfolioItems(a: LeaguePortfolioItem, b: LeaguePortfolioItem) {
  const rank = (league: LeaguePortfolioItem) => {
    if (league.status === 'draft') return 0;
    if (!league.currentSeason) return 1;
    if (league.teamCount === 0) return 2;
    if (league.playerCount === 0) return 3;
    if (league.currentSeason.status === 'playoffs') return 4;
    if (!league.currentSeason.schedule_generated) return 4;
    return 5;
  };

  return rank(a) - rank(b) || a.name.localeCompare(b.name);
}
