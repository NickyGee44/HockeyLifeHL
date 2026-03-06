import { getCurrentUser } from '@/lib/actions/auth';
import { getCachedDashboardData, type LeagueSummary } from '@/lib/actions/dashboard';
import { getStaffDashboardData } from '@/lib/actions/staff-dashboard';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  Plus,
  Settings,
  BarChart3,
  Trophy,
  Users,
  Calendar,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Globe,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Database,
  Upload,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { LeagueLogo } from '@/components/ui/league-logo';
import StaffDashboardPanel from '@/components/staff/StaffDashboardPanel';

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

type LeagueCommandAction = {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
};

type LeagueCommandDeckItem = {
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
  migrationActions: LeagueCommandAction[];
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
  const { data: seasonRows } = leagueIds.length > 0
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

  const leagueCommandDeck = Array.from(leagueSources.values())
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
        nextAction: getLeagueNextAction({ league, currentSeason, locale }),
        migrationActions: getLeagueMigrationActions({ league, currentSeason, locale }),
      } satisfies LeagueCommandDeckItem;
    })
    .sort(sortLeagueCommandDeck);

  const accessibleLeagueCount = leagueCommandDeck.length;
  const visibleLeagueCount = accessibleLeagueCount || totals.total_leagues;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white tracking-tight">
            {t('dashboard.welcome', { name: profile?.full_name || user.email?.split('@')[0] || 'User' })}
          </h1>
          <p className="text-neutral-400 mt-1">
            {t('dashboard.overview')}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <MiniStatsCard
                title={t('company.leagues')}
                value={visibleLeagueCount}
                icon={<Trophy className="w-4 h-4" />}
              />
              <MiniStatsCard
                title={t('teams.title')}
                value={totals.total_teams}
                icon={<Users className="w-4 h-4" />}
              />
              <MiniStatsCard
                title={t('players.title')}
                value={totals.total_players}
                icon={<Calendar className="w-4 h-4" />}
              />
              <MiniStatsCard
                title={t('dashboard.gamesPlayed')}
                value={totals.total_games_played ?? 0}
                icon={<TrendingUp className="w-4 h-4" />}
              />
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-rink-500" />
                {t('dashboard.financialOverview')}
              </h3>
              <Link
                href="/dashboard/settings/billing"
                className="text-xs text-rink-500 hover:text-rink-400"
              >
                {t('common.details')}
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{t('dashboard.plan')}</span>
                <span className="text-xs font-medium text-white capitalize">{subscriptionTier}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{t('dashboard.status')}</span>
                <span className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium',
                  subscriptionStatus === 'active' ? 'text-green-400' :
                  subscriptionStatus === 'trialing' ? 'text-cyan-400' :
                  'text-amber-400'
                )}>
                  {subscriptionStatus === 'active' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  <span className="capitalize">{subscriptionStatus}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{t('dashboard.platformFee')}</span>
                <span className="text-xs font-medium text-white">3.5%</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <Link
                  href="/dashboard/settings/billing"
                  className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-rink-500 hover:text-rink-400 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {t('dashboard.manageBilling')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {leagueCommandDeck.length > 0 && (
          <section className="mb-8 space-y-4">
            <div className="relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 sm:p-7">
              <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.03),transparent)] pointer-events-none" />
              <div className="relative grid gap-6 lg:grid-cols-[1.45fr_1fr] lg:items-start">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80 mb-3">
                    Historical Data
                  </p>
                  <h2 className="text-2xl sm:text-[2rem] leading-tight font-black text-white max-w-2xl">
                    Migration exists today, but it is still modular rather than one end-to-end historical import.
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-neutral-300 max-w-2xl leading-7">
                    League owners can already import teams, players, and schedules with CSV templates. What is still missing is a single workflow for full historical stats, records, and archive migration. The deck below surfaces the tools that exist now so owners do not need to hunt for them.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MigrationCapabilityCard
                    title="Teams CSV"
                    description="Bulk import teams and divisions from a template."
                    icon={<Upload className="w-4 h-4" />}
                  />
                  <MigrationCapabilityCard
                    title="Players CSV"
                    description="Bulk import players into the current season roster flow."
                    icon={<Users className="w-4 h-4" />}
                  />
                  <MigrationCapabilityCard
                    title="Schedule CSV"
                    description="Upload schedules and use templates inside schedule tools."
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <MigrationCapabilityCard
                    title="No Full History Wizard"
                    description="Stats, records, and legacy history still need a dedicated migration flow."
                    icon={<Database className="w-4 h-4" />}
                    accent="warning"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Owner Command Deck</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  The fastest next step for each league, with direct entry into the current import and setup tools.
                </p>
              </div>
              <Link
                href="/dashboard/leagues"
                className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
              >
                {t('common.all')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {leagueCommandDeck.map((league) => (
                <OwnerLeagueCommandCard key={league.id} league={league} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {staffData.isStaff && (
          <div className="mb-8">
            <StaffDashboardPanel data={staffData} />
          </div>
        )}

        {leagueCommandDeck.length === 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-rink-500/10 via-arena-500/5 to-transparent border border-rink-500/20 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rink-500/10 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-rink-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t('dashboardCta.createLeague')}</h3>
              <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                {t('dashboardCta.createLeagueDescription')}
              </p>
              <Link
                href="/dashboard/leagues/new"
                className={cn(
                  'inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-[transform,box-shadow,opacity]'
                )}
              >
                <Plus className="w-5 h-5" />
                {t('navigation.createLeague')}
              </Link>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">{t('dashboard.quickActions')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title={t('dashboardCta.createLeague')}
              description={t('dashboardCta.createLeagueDescription')}
              href="/dashboard/leagues/new"
              icon={<Plus className="w-5 h-5" />}
              primary
            />
            <QuickActionCard
              title={t('dashboardCta.viewStandings')}
              description={t('dashboardCta.viewStandingsDescription')}
              href="/dashboard/leagues"
              icon={<BarChart3 className="w-5 h-5" />}
            />
            <QuickActionCard
              title={t('dashboardCta.manageBilling')}
              description={t('dashboardCta.manageBillingDescription')}
              href="/dashboard/settings/billing"
              icon={<CreditCard className="w-5 h-5" />}
            />
            <QuickActionCard
              title={t('dashboardCta.accountSettings')}
              description={t('dashboardCta.accountSettingsDescription')}
              href="/dashboard/settings"
              icon={<Settings className="w-5 h-5" />}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{t('company.yourCompany')}</h2>
            {organizations.length > 0 && (
              <Link
                href="/dashboard/company"
                className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
              >
                {t('company.manageProfile')} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {organizations.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rink-500/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-rink-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('company.noCompany')}</h3>
              <p className="text-neutral-400 mb-6">
                {t('company.setupCompany')}
              </p>
              <Link
                href="/dashboard/settings"
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-[transform,box-shadow,opacity]'
                )}
              >
                <Plus className="w-4 h-4" />
                {t('company.createCompany')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.map((org) => (
                <CompanyCard key={org.id} org={org} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStatsCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl px-4 py-3 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-rink-500/10 text-rink-500">{icon}</div>
        <span className="text-xs text-neutral-400 truncate">{title}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  primary = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col p-5 rounded-2xl transition-[transform,box-shadow,border-color,background-color] duration-200',
        primary
          ? 'bg-gradient-to-br from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20'
          : 'bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:border-white/20 text-white'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-xl w-fit mb-3 transition-transform group-hover:scale-110',
          primary ? 'bg-black/20' : 'bg-rink-500/10 text-rink-500'
        )}
      >
        {icon}
      </div>
      <h3 className={cn('font-semibold mb-1', primary ? 'text-black' : 'text-white')}>
        {title}
      </h3>
      <p className={cn('text-sm', primary ? 'text-black/70' : 'text-neutral-400')}>
        {description}
      </p>
    </Link>
  );
}

function CompanyCard({ org, t }: { org: any; t: any }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-lg">{org.name}</h3>
          <p className="text-sm text-neutral-500">{t('company.profile')}</p>
        </div>
        <Link
          href="/dashboard/company"
          className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
        >
          <Settings className="w-4 h-4" />
          {t('company.manageProfile')}
        </Link>
      </div>

      {org.league_count > 0 ? (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
          <div>
            <p className="text-xs text-neutral-500">{t('company.leagues')}</p>
            <p className="text-xl font-bold text-white">{org.league_count}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">{t('teams.title')}</p>
            <p className="text-xl font-bold text-white">
              {org.leagues.reduce((sum: number, l: any) => sum + l.team_count, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">{t('players.title')}</p>
            <p className="text-xl font-bold text-white">
              {org.leagues.reduce((sum: number, l: any) => sum + l.player_count, 0)}
            </p>
          </div>
        </div>
      ) : (
        <div className="pt-4 border-t border-white/[0.06]">
          <Link
            href="/dashboard/leagues/new"
            className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {t('navigation.createLeague')}
          </Link>
        </div>
      )}
    </div>
  );
}

function MigrationCapabilityCard({
  title,
  description,
  icon,
  accent = 'default',
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent?: 'default' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 backdrop-blur-sm',
        accent === 'warning'
          ? 'border-amber-400/20 bg-amber-400/10'
          : 'border-white/10 bg-white/[0.04]'
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-xl',
            accent === 'warning' ? 'bg-amber-400/15 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'
          )}
        >
          {icon}
        </span>
        {title}
      </div>
      <p className={cn('text-sm leading-6', accent === 'warning' ? 'text-amber-100/80' : 'text-neutral-300')}>
        {description}
      </p>
    </div>
  );
}

function OwnerLeagueCommandCard({
  league,
  locale,
}: {
  league: LeagueCommandDeckItem;
  locale: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20">
      <div
        className="absolute inset-x-0 top-0 h-24 opacity-60"
        style={{
          background: `linear-gradient(180deg, ${hexToRgba(league.primaryColor || '#22D3EE', 0.24)} 0%, transparent 100%)`,
        }}
      />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <LeagueLogo
              logoUrl={league.logoUrl}
              leagueName={league.name}
              primaryColor={league.primaryColor || '#22D3EE'}
              size="md"
              shape="square"
              bordered
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                  {league.orgName}
                </span>
                {league.memberRole && league.memberRole !== 'owner' && (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] font-medium capitalize text-neutral-300">
                    {league.memberRole}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight truncate">
                {league.name}
              </h3>
              <p className="text-sm text-neutral-400 mt-1">
                {league.currentSeason
                  ? `${league.currentSeason.name} is the current operating season.`
                  : 'No active season selected yet.'}
              </p>
            </div>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border self-start',
            league.status === 'active'
              ? 'border-green-500/30 bg-green-500/10 text-green-300'
              : league.status === 'draft'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                : 'border-white/10 bg-white/[0.05] text-neutral-300'
          )}>
            {league.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span className="capitalize">{league.status || 'active'}</span>
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile label="Teams" value={league.teamCount} />
          <InfoTile label="Players" value={league.playerCount} />
          <InfoTile label="Seasons" value={league.seasonCount} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 mb-2">
              Current Season
            </p>
            {league.currentSeason ? (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-lg font-bold text-white">{league.currentSeason.name}</p>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border',
                    getSeasonStatusClasses(league.currentSeason.status)
                  )}>
                    {formatSeasonStatus(league.currentSeason.status)}
                  </span>
                </div>
                <p className="text-sm text-neutral-400 leading-6">
                  {league.currentSeason.schedule_generated
                    ? 'Schedule tools are active for this season.'
                    : 'Schedule has not been generated yet. You can import CSV or build it with templates.'}
                </p>
              </>
            ) : (
              <p className="text-sm text-neutral-400 leading-6">
                Create a season before importing players or schedules. Team import is already available.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 mb-2">
              Next Recommended Step
            </p>
            <Link
              href={league.nextAction.href}
              className={cn(
                'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-[border-color,background-color,color,transform] duration-200 hover:-translate-y-0.5',
                league.nextAction.tone === 'primary'
                  ? 'border-rink-500/30 bg-rink-500/10 text-rink-300 hover:border-rink-400/40 hover:bg-rink-500/15'
                  : league.nextAction.tone === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:border-amber-400/40 hover:bg-amber-500/15'
                    : 'border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.06]'
              )}
            >
              <span>{league.nextAction.label}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                Migration Tools
              </p>
              <p className="text-sm text-neutral-400 mt-1">
                These are the existing import/template flows currently available for this league.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {league.migrationActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={cn(
                  'rounded-2xl border px-4 py-3 transition-[border-color,background-color,color,transform] duration-200',
                  action.disabled
                    ? 'pointer-events-none border-white/10 bg-white/[0.02] text-neutral-500'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn('text-sm font-semibold', action.disabled ? 'text-neutral-500' : 'text-white')}>
                      {action.label}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1 leading-5">{action.description}</p>
                  </div>
                  <span className={cn(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    action.disabled ? 'bg-white/[0.03] text-neutral-600' : 'bg-rink-500/10 text-rink-300'
                  )}>
                    {action.icon}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
          <Link
            href={`/${locale}/dashboard/leagues/${league.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            League Overview
          </Link>
          <Link
            href={`/${locale}/dashboard/leagues/${league.id}/payments`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payments
          </Link>
          <Link
            href={`/${locale}/dashboard/leagues/${league.id}/settings`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Link>
          <Link
            href={`/${locale}/website-editor`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
          >
            <Globe className="w-3.5 h-3.5" />
            Website Editor
          </Link>
        </div>
      </div>
    </article>
  );
}

function InfoTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function pickOperationalSeason(seasons: LeagueSeasonSnapshot[]): LeagueSeasonSnapshot | null {
  if (seasons.length === 0) return null;

  const priority: Record<string, number> = {
    active: 0,
    registration: 1,
    draft: 2,
    completed: 3,
    archived: 4,
  };

  return [...seasons].sort((a, b) => {
    const priorityDelta = (priority[a.status ?? ''] ?? 99) - (priority[b.status ?? ''] ?? 99);
    if (priorityDelta !== 0) return priorityDelta;
    const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
    const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
    return bDate - aDate;
  })[0] ?? null;
}

function getLeagueNextAction({
  league,
  currentSeason,
  locale,
}: {
  league: LeagueSummary;
  currentSeason: LeagueSeasonSnapshot | null;
  locale: string;
}) {
  if (league.status === 'draft') {
    return {
      label: 'Continue league setup',
      href: `/${locale}/dashboard/leagues/${league.id}`,
      tone: 'warning' as const,
    };
  }

  if (league.team_count === 0) {
    return {
      label: 'Import teams or add them manually',
      href: `/${locale}/dashboard/leagues/${league.id}/teams?tool=import-teams`,
      tone: 'warning' as const,
    };
  }

  if (!currentSeason) {
    return {
      label: 'Create the first season for this league',
      href: `/${locale}/dashboard/leagues/${league.id}/seasons/new`,
      tone: 'warning' as const,
    };
  }

  if (league.player_count === 0) {
    return {
      label: 'Import players into the current season',
      href: `/${locale}/dashboard/leagues/${league.id}/registrations?season=${currentSeason.id}&tool=import-players`,
      tone: 'warning' as const,
    };
  }

  if (!currentSeason.schedule_generated) {
    return {
      label: 'Import or build the schedule',
      href: `/${locale}/dashboard/leagues/${league.id}/schedule?season=${currentSeason.id}&tool=import-schedule`,
      tone: 'primary' as const,
    };
  }

  return {
    label: 'Open the league workspace',
    href: `/${locale}/dashboard/leagues/${league.id}`,
    tone: 'neutral' as const,
  };
}

function getLeagueMigrationActions({
  league,
  currentSeason,
  locale,
}: {
  league: LeagueSummary;
  currentSeason: LeagueSeasonSnapshot | null;
  locale: string;
}): LeagueCommandAction[] {
  return [
    {
      label: 'Import teams CSV',
      href: `/${locale}/dashboard/leagues/${league.id}/teams?tool=import-teams`,
      description: 'Upload teams, divisions, and captain emails from a template.',
      icon: <Upload className="w-4 h-4" />,
    },
    {
      label: 'Import players CSV',
      href: currentSeason
        ? `/${locale}/dashboard/leagues/${league.id}/registrations?season=${currentSeason.id}&tool=import-players`
        : `/${locale}/dashboard/leagues/${league.id}/seasons/new`,
      description: currentSeason
        ? `Bulk import players into ${currentSeason.name}.`
        : 'Create a season first to unlock player import.',
      icon: <Users className="w-4 h-4" />,
      disabled: !currentSeason,
    },
    {
      label: 'Import schedule CSV',
      href: currentSeason
        ? `/${locale}/dashboard/leagues/${league.id}/schedule?season=${currentSeason.id}&tool=import-schedule`
        : `/${locale}/dashboard/leagues/${league.id}/seasons/new`,
      description: currentSeason
        ? 'Open schedule import with template download and preview.'
        : 'Create a season first to unlock schedule import.',
      icon: <Calendar className="w-4 h-4" />,
      disabled: !currentSeason,
    },
    {
      label: 'Review schedule tools',
      href: currentSeason
        ? `/${locale}/dashboard/leagues/${league.id}/schedule?season=${currentSeason.id}`
        : `/${locale}/dashboard/leagues/${league.id}/schedule`,
      description: 'Templates, generator, and bulk schedule operations live here.',
      icon: <Database className="w-4 h-4" />,
    },
  ];
}

function sortLeagueCommandDeck(a: LeagueCommandDeckItem, b: LeagueCommandDeckItem) {
  const rank = (league: LeagueCommandDeckItem) => {
    if (league.status === 'draft') return 0;
    if (!league.currentSeason) return 1;
    if (league.teamCount === 0) return 2;
    if (league.playerCount === 0) return 3;
    if (!league.currentSeason.schedule_generated) return 4;
    return 5;
  };

  return rank(a) - rank(b) || a.name.localeCompare(b.name);
}

function formatSeasonStatus(status: string | null) {
  if (!status) return 'Unknown';

  switch (status) {
    case 'registration':
      return 'Registration';
    case 'active':
      return 'Active';
    case 'draft':
      return 'Draft';
    case 'completed':
      return 'Completed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function getSeasonStatusClasses(status: string | null) {
  switch (status) {
    case 'active':
      return 'border-green-500/30 bg-green-500/10 text-green-300';
    case 'registration':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
    case 'draft':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'completed':
      return 'border-white/10 bg-white/[0.05] text-neutral-300';
    default:
      return 'border-white/10 bg-white/[0.05] text-neutral-300';
  }
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (![3, 6].includes(normalized.length)) {
    return `rgba(34, 211, 238, ${alpha})`;
  }

  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const value = Number.parseInt(expanded, 16);
  if (Number.isNaN(value)) {
    return `rgba(34, 211, 238, ${alpha})`;
  }

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
