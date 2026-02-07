import { getCurrentUser } from '@/lib/actions/auth';
import { getCachedDashboardData } from '@/lib/actions/dashboard';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Plus,
  Trophy,
  Users,
  Calendar,
  ArrowLeft,
  Settings,
  CreditCard,
} from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';

export const metadata = {
  title: 'Leagues | Beer League Hockey',
  description: 'Manage your hockey leagues',
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LeaguesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect(`/${locale}/login`);
  }

  const dashboardData = await getCachedDashboardData();

  if (!dashboardData) {
    redirect(`/${locale}/login`);
  }

  const { organizations } = dashboardData;

  // Flatten leagues from all organizations
  const allLeagues = organizations.flatMap((org) =>
    org.leagues.map((league) => ({
      ...league,
      organizationName: org.name,
      organizationId: org.id,
    }))
  );

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Your Leagues
            </h1>
            <p className="text-neutral-400 mt-2">
              Manage all your hockey leagues in one place
            </p>
          </div>
          <Link
            href="/dashboard/leagues/new"
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            Create League
          </Link>
        </div>

        {/* Leagues Grid */}
        {allLeagues.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rink-500/10 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-rink-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Leagues Yet</h2>
            <p className="text-neutral-400 mb-8 max-w-md mx-auto">
              Create your first hockey league to start managing teams, schedules, and
              player statistics.
            </p>
            <Link
              href="/dashboard/leagues/new"
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              <Plus className="w-5 h-5" />
              Create Your First League
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}

            {/* Add New League Card */}
            <Link
              href="/dashboard/leagues/new"
              className={cn(
                'flex flex-col items-center justify-center p-8 rounded-2xl transition-all duration-200',
                'border-2 border-dashed border-rink-500/30 hover:border-rink-500/60',
                'bg-neutral-900/50 hover:bg-neutral-900',
                'group min-h-[200px]'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-rink-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-rink-500" />
              </div>
              <span className="font-semibold text-white">Create New League</span>
              <span className="text-sm text-neutral-500 mt-1">
                Set up a new hockey league
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function LeagueCard({ league }: { league: any }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
      {/* League Header with Color */}
      <div
        className="h-3"
        style={{ backgroundColor: league.primary_color || '#22D3EE' }}
      />

      <div className="p-6">
        {/* Top Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <LeagueLogo
              logoUrl={league.logo_url}
              leagueName={league.name}
              primaryColor={league.primary_color || '#22D3EE'}
              size="md"
              shape="square"
              bordered
            />
            <div>
              <h3 className="font-bold text-white text-lg group-hover:text-rink-500 transition-colors">
                {league.name}
              </h3>
              <p className="text-xs text-neutral-500">{league.organizationName}</p>
            </div>
          </div>
          <span
            className={cn(
              'px-2.5 py-1 text-xs font-semibold rounded-full',
              league.status === 'active'
                ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                : league.status === 'draft'
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
            )}
          >
            {league.status ? league.status.charAt(0).toUpperCase() + league.status.slice(1) : 'Active'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-5 py-4 border-y border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Teams</span>
            </div>
            <p className="text-xl font-bold text-white">{league.team_count}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Players</span>
            </div>
            <p className="text-xl font-bold text-white">{league.player_count}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/leagues/${league.id}`}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-rink-500/10 text-rink-500 border border-rink-500/30',
              'hover:bg-rink-500/20 transition-colors font-medium text-sm'
            )}
          >
            Manage League
          </Link>
          <Link
            href={`/dashboard/leagues/${league.id}/billing`}
            className={cn(
              'inline-flex items-center justify-center p-2.5 rounded-xl',
              'bg-neutral-800 text-neutral-400',
              'hover:bg-neutral-700 hover:text-white transition-colors'
            )}
            title="League Billing"
          >
            <CreditCard className="w-4 h-4" />
          </Link>
          <Link
            href={`/dashboard/leagues/${league.id}/settings`}
            className={cn(
              'inline-flex items-center justify-center p-2.5 rounded-xl',
              'bg-neutral-800 text-neutral-400',
              'hover:bg-neutral-700 hover:text-white transition-colors'
            )}
            title="League Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
