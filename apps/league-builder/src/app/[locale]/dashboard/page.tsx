import { getCurrentUser } from '@/lib/actions/auth';
import { getCachedDashboardData } from '@/lib/actions/dashboard';
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
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { LeagueLogo } from '@/components/ui/league-logo';

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
  const dashboardData = await getCachedDashboardData();

  if (!dashboardData) {
    redirect(`/${locale}/login`);
  }

  const { organizations, totals } = dashboardData;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">
            {t('dashboard.welcome', { name: profile?.full_name || user.email?.split('@')[0] || 'User' })}
          </h1>
          <p className="text-neutral-400 mt-2">
            {t('dashboard.overview')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title={t('company.leagues')}
            value={totals.total_leagues}
            icon={<Trophy className="w-5 h-5" />}
            trend={null}
          />
          <StatsCard
            title={t('teams.title')}
            value={totals.total_teams}
            icon={<Users className="w-5 h-5" />}
            trend={null}
            emptyAction={
              totals.total_teams === 0 ? (
                <Link
                  href="/dashboard/leagues/new"
                  className="text-xs text-rink-500 hover:text-rink-400 mt-2 inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  {t('navigation.createLeague')}
                </Link>
              ) : null
            }
          />
          <StatsCard
            title={t('players.title')}
            value={totals.total_players}
            icon={<Calendar className="w-5 h-5" />}
            trend={null}
          />
          <StatsCard
            title={t('dashboard.gamesPlayed')}
            value={totals.total_games_played ?? 0}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={null}
          />
        </div>

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

        {/* Website Editor - Featured Action */}
        {totals.total_leagues > 0 && (
          <div className="mb-8">
            <Link
              href="/website-editor"
              className={cn(
                'flex items-center gap-4 p-6 rounded-2xl',
                'bg-gradient-to-r from-arena-500/20 via-rink-500/10 to-arena-500/20',
                'border border-arena-500/30 hover:border-arena-500/50',
                'group transition-all duration-300 hover:shadow-lg hover:shadow-arena-500/10'
              )}
            >
              <div className="p-3 rounded-xl bg-arena-500/20 text-arena-400 group-hover:scale-110 transition-transform">
                <Palette className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  {t('dashboardCta.websiteEditor')}
                  <Globe className="w-4 h-4 text-arena-400" />
                </h3>
                <p className="text-neutral-400 text-sm">
                  {t('dashboardCta.websiteEditorDescription')}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-arena-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

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

        {/* Leagues Section (if any exist) */}
        {totals.total_leagues > 0 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{t('navigation.teams')}</h2>
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
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  emptyAction,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: number | null;
  subtitle?: string;
  emptyAction?: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-xl bg-rink-500/10 text-rink-500">{icon}</div>
        {trend !== null && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              trend >= 0
                ? 'bg-green-500/10 text-green-500'
                : 'bg-red-500/10 text-red-500'
            )}
          >
            {trend >= 0 ? '+' : ''}
            {trend}%
          </span>
        )}
      </div>
      <div className="text-3xl font-black text-white mb-1">{value}</div>
      <div className="text-sm text-neutral-400">{title}</div>
      {subtitle && <div className="text-xs text-neutral-500 mt-1">{subtitle}</div>}
      {emptyAction}
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
