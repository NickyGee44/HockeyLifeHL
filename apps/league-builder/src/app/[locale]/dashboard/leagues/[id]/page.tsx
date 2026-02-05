import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  Trophy,
  Users,
  Calendar,
  Settings,
  CreditCard,
  Globe,
  BarChart3,
  Plus,
  Edit,
  Play,
  LayoutGrid,
} from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
};

export default async function LeagueDetailPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  // Get league details
  const { data: league, error } = await supabase
    .from('leagues')
    .select(`
      *,
      seasons (
        id,
        name,
        status,
        start_date,
        end_date
      )
    `)
    .eq('id', leagueId)
    .single();

  if (error) {
    console.error('[League Page] Error fetching league:', error.message, { leagueId, userId: userData?.id });
  }

  if (error || !league) {
    notFound();
  }

  // Get teams count
  const { count: teamsCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId);

  // Get divisions count
  const { count: divisionsCount } = await supabase
    .from('divisions')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leagues
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <LeagueLogo
                logoUrl={league.logo_url}
                leagueName={league.name}
                primaryColor={league.primary_color || '#22D3EE'}
                size="lg"
                shape="square"
                bordered
              />
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {league.name}
                </h1>
                <p className="text-neutral-400 mt-1">{league.description || 'No description'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1.5 text-sm font-semibold rounded-full',
                  league.status === 'active'
                    ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                    : league.status === 'draft'
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                )}
              >
                {(league.status || 'active').charAt(0).toUpperCase() + (league.status || 'active').slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Teams</span>
            </div>
            <p className="text-2xl font-bold text-white">{teamsCount || 0}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <LayoutGrid className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Divisions</span>
            </div>
            <p className="text-2xl font-bold text-white">{divisionsCount || 0}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Seasons</span>
            </div>
            <p className="text-2xl font-bold text-white">{league.seasons?.length || 0}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Location</span>
            </div>
            <p className="text-lg font-semibold text-white truncate">
              {league.city}, {league.state_province}
            </p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Timezone</span>
            </div>
            <p className="text-lg font-semibold text-white truncate">{league.timezone}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/teams`}
            icon={<Users className="w-5 h-5" />}
            title="Manage Teams"
            description="Add, edit, or remove teams"
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/divisions`}
            icon={<LayoutGrid className="w-5 h-5" />}
            title="Divisions"
            description="Organize teams by skill"
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/schedule`}
            icon={<Calendar className="w-5 h-5" />}
            title="Schedule"
            description="View and manage games"
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/payments`}
            icon={<CreditCard className="w-5 h-5" />}
            title="Player Payments"
            description="Track player fees"
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/settings`}
            icon={<Settings className="w-5 h-5" />}
            title="Settings"
            description="League configuration"
          />
        </div>

        {/* Seasons Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Seasons</h2>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                'bg-rink-500/10 text-rink-500 border border-rink-500/30',
                'hover:bg-rink-500/20 transition-colors'
              )}
            >
              <Plus className="w-4 h-4" />
              New Season
            </Link>
          </div>

          {league.seasons && league.seasons.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {league.seasons.map((season: any) => (
                <SeasonCard key={season.id} season={season} leagueId={leagueId} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
              <Calendar className="w-12 h-12 text-rink-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Seasons Yet</h3>
              <p className="text-neutral-400 mb-4">
                Create your first season to start scheduling games
              </p>
              <Link
                href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
                )}
              >
                <Plus className="w-4 h-4" />
                Create Season
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-start gap-4 p-5 rounded-2xl transition-all duration-200',
        'bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:border-white/20',
        'group'
      )}
    >
      <div className="p-2 rounded-xl bg-rink-500/10 text-rink-500 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white group-hover:text-rink-500 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-neutral-400">{description}</p>
      </div>
    </Link>
  );
}

function SeasonCard({ season, leagueId, locale }: { season: any; leagueId: string; locale: string }) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/30',
    draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    completed: 'bg-neutral-800 text-neutral-400 border-neutral-700',
    playoffs: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{season.name}</h3>
          <p className="text-sm text-neutral-500">
            {new Date(season.start_date).toLocaleDateString()} -{' '}
            {season.end_date ? new Date(season.end_date).toLocaleDateString() : 'Ongoing'}
          </p>
        </div>
        <span
          className={cn(
            'px-2.5 py-1 text-xs font-semibold rounded-full border',
            statusColors[season.status] || statusColors.draft
          )}
        >
          {season.status?.charAt(0).toUpperCase() + season.status?.slice(1)}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${season.id}`}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'bg-rink-500/10 text-rink-500 border border-rink-500/30',
            'hover:bg-rink-500/20 transition-colors text-sm font-medium'
          )}
        >
          <Play className="w-4 h-4" />
          Manage
        </Link>
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}/seasons/${season.id}/edit`}
          className={cn(
            'inline-flex items-center justify-center p-2 rounded-lg',
            'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700',
            'transition-colors'
          )}
        >
          <Edit className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
