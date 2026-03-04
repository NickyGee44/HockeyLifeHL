import { getCurrentUser } from '@/lib/actions/auth';
import { getCachedDashboardData } from '@/lib/actions/dashboard';
import { getStaffDashboardData } from '@/lib/actions/staff-dashboard';
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
  Palette,
  Globe,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { LeagueLogo } from '@/components/ui/league-logo';
import StaffDashboardPanel from '@/components/staff/StaffDashboardPanel';

type Props = {
  params: Promise<{ locale: string }>;
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
    // User is authenticated but has no dashboard data — likely a new OAuth user
    // who hasn't completed org setup. Redirect to setup instead of login
    // to avoid a redirect loop (middleware sends authenticated users on /login back here).
    redirect(`/${locale}/setup-organization`);
  }

  const { organizations, totals, managed_leagues = [] } = dashboardData;

  // Derive subscription info from first org for financial overview
  const primaryOrg = organizations[0];
  const subscriptionTier = primaryOrg?.subscription_tier || 'starter';
  const subscriptionStatus = primaryOrg?.subscription_status || 'active';

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white tracking-tight">
            {t('dashboard.welcome', { name: profile?.full_name || user.email?.split('@')[0] || 'User' })}
          </h1>
          <p className="text-neutral-400 mt-1">
            {t('dashboard.overview')}
          </p>
        </div>

        {/* Top Overview: Stats + Financial */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Left: Stats Cards (2/3) */}
          <div className="lg:col-span-2">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <MiniStatsCard
                title={t('company.leagues')}
                value={totals.total_leagues}
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

          {/* Right: Financial Overview (1/3) */}
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

        {/* Leagues Section — moved up, renamed from "Teams" */}
        {totals.total_leagues > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{t('company.leagues')}</h2>
              <Link
                href="/dashboard/leagues"
                className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
              >
                {t('common.all')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.flatMap((org) =>
                org.leagues.slice(0, 3).map((league) => (
                  <LeagueCard key={league.id} league={league} orgName={org.name} t={t} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Staff Assignments Panel */}
        {staffData.isStaff && (
          <div className="mb-8">
            <StaffDashboardPanel data={staffData} />
          </div>
        )}

        {/* New League CTA - prominent for owners with no leagues */}
        {totals.total_leagues === 0 && (
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
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
                )}
              >
                <Plus className="w-5 h-5" />
                {t('navigation.createLeague')}
              </Link>
            </div>
          </div>
        )}

        {/* Website Editor removed — temporarily disabled */}

        {/* Quick Actions */}
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

        {/* Your Company Section */}
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

          {managed_leagues.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                Leagues you manage
              </p>
              <div className="space-y-2">
                {managed_leagues.map((league) => (
                  <Link
                    key={league.id}
                    href={`/${locale}/dashboard/leagues/${league.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: league.primary_color || '#22D3EE' }}
                    >
                      {league.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-rink-400 transition-colors truncate">
                        {league.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {league.team_count} team{league.team_count !== 1 ? 's' : ''} · {league.member_role}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-rink-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

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
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
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

// Mini Stats Card — compact version
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

// Quick Action Card Component
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
        'group flex flex-col p-5 rounded-2xl transition-all duration-200',
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

// Company Card Component (formerly Organization)
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

// League Card Component
function LeagueCard({ league, orgName, t }: { league: any; orgName: string; t: any }) {
  return (
    <Link
      href={`/dashboard/leagues/${league.id}`}
      className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-5 hover:border-white/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <LeagueLogo
          logoUrl={league.logo_url}
          leagueName={league.name}
          primaryColor={league.primary_color || '#22D3EE'}
          size="sm"
          shape="square"
          bordered
        />
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            league.status === 'active'
              ? 'bg-green-500/10 text-green-500'
              : league.status === 'draft'
              ? 'bg-yellow-500/10 text-yellow-500'
              : 'bg-neutral-800 text-neutral-400'
          )}
        >
          {t(`drafts.status.${league.status || 'scheduled'}`)}
        </span>
      </div>
      <h3 className="font-semibold text-white mb-1 group-hover:text-rink-500 transition-colors">
        {league.name}
      </h3>
      <p className="text-xs text-neutral-500 mb-3">{orgName}</p>
      <div className="flex items-center gap-4 text-sm text-neutral-400">
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {t('teams.teamCount', { count: league.team_count })}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {t('teams.players', { count: league.player_count })}
        </span>
      </div>
    </Link>
  );
}
