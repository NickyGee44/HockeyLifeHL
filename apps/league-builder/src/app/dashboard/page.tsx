import { getCurrentUser } from '@/lib/actions/auth';
import { getCachedDashboardData } from '@/lib/actions/dashboard';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Settings,
  BarChart3,
  Globe,
  Trophy,
  Users,
  Calendar,
  ArrowRight,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';

export default async function DashboardPage() {
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const { user, profile } = userData;
  const dashboardData = await getCachedDashboardData();

  if (!dashboardData) {
    redirect('/login');
  }

  const { organizations, totals } = dashboardData;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Welcome back, {(profile as any)?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-neutral-400 mt-2">
            Manage your hockey leagues from one place
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Organizations"
            value={totals.total_organizations}
            icon={<Users className="w-5 h-5" />}
            trend={null}
          />
          <StatsCard
            title="Leagues"
            value={totals.total_leagues}
            icon={<Trophy className="w-5 h-5" />}
            trend={null}
            emptyAction={
              totals.total_leagues === 0 ? (
                <Link
                  href="/dashboard/leagues/new"
                  className="text-xs text-rink-500 hover:text-rink-400 mt-2 inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Create your first league
                </Link>
              ) : null
            }
          />
          <StatsCard
            title="Teams"
            value={totals.total_teams}
            icon={<Calendar className="w-5 h-5" />}
            trend={null}
            subtitle={
              totals.total_teams > 0 ? `${totals.total_players} total players` : undefined
            }
          />
          <StatsCard
            title="Active Seasons"
            value={totals.active_seasons ?? 0}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={null}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="Create League"
              description="Set up a new hockey league"
              href="/dashboard/leagues/new"
              icon={<Plus className="w-5 h-5" />}
              primary
            />
            <QuickActionCard
              title="View Analytics"
              description="Track performance metrics"
              href="/dashboard/analytics"
              icon={<BarChart3 className="w-5 h-5" />}
            />
            <QuickActionCard
              title="Manage Billing"
              description="Subscription & payments"
              href="/dashboard/settings/billing"
              icon={<CreditCard className="w-5 h-5" />}
            />
            <QuickActionCard
              title="Organization Settings"
              description="Profile, team & preferences"
              href="/dashboard/settings"
              icon={<Settings className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Organizations Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Your Organizations</h2>
            {organizations.length > 0 && (
              <Link
                href="/dashboard/settings/members"
                className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
              >
                Manage members <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {organizations.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-surface text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rink-500/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-rink-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Organizations Yet</h3>
              <p className="text-neutral-400 mb-6">
                Create an organization to start managing your leagues
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
                Create Organization
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.map((org) => (
                <OrganizationCard key={org.id} org={org} />
              ))}
            </div>
          )}
        </div>

        {/* Leagues Section (if any exist) */}
        {totals.total_leagues > 0 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Your Leagues</h2>
              <Link
                href="/dashboard/leagues"
                className="text-sm text-rink-500 hover:text-rink-400 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.flatMap((org) =>
                org.leagues.slice(0, 3).map((league) => (
                  <LeagueCard key={league.id} league={league} orgName={org.name} />
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
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-surface hover:border-white/20 transition-colors">
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
          ? 'bg-gradient-to-br from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/25'
          : 'bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-surface hover:border-white/20 text-white'
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

// Organization Card Component
function OrganizationCard({ org }: { org: any }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-surface hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-lg">{org.name}</h3>
          <p className="text-sm text-neutral-500">{org.slug}</p>
        </div>
        <span
          className={cn(
            'px-3 py-1 text-xs font-semibold rounded-full',
            org.subscription_tier === 'enterprise'
              ? 'bg-foam-400/15 text-foam-400 border border-foam-400/30'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          )}
        >
          {org.subscription_tier === 'enterprise' ? 'Enterprise' : 'Contact Sales'}
        </span>
      </div>

      {org.league_count > 0 ? (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
          <div>
            <p className="text-xs text-neutral-500">Leagues</p>
            <p className="text-xl font-bold text-white">{org.league_count}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Teams</p>
            <p className="text-xl font-bold text-white">
              {org.leagues.reduce((sum: number, l: any) => sum + l.team_count, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Players</p>
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
            Create your first league
          </Link>
        </div>
      )}
    </div>
  );
}

// League Card Component
function LeagueCard({ league, orgName }: { league: any; orgName: string }) {
  return (
    <Link
      href={`/dashboard/leagues/${league.id}`}
      className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-5 shadow-surface hover:border-white/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: league.primary_color || '#22D3EE' }}
        >
          <Trophy className="w-5 h-5 text-white" />
        </div>
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
          {league.status?.charAt(0).toUpperCase() + league.status?.slice(1) || 'Active'}
        </span>
      </div>
      <h3 className="font-semibold text-white mb-1 group-hover:text-rink-500 transition-colors">
        {league.name}
      </h3>
      <p className="text-xs text-neutral-500 mb-3">{orgName}</p>
      <div className="flex items-center gap-4 text-sm text-neutral-400">
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {league.team_count} teams
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {league.player_count} players
        </span>
      </div>
    </Link>
  );
}
