import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
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
  Newspaper,
  Handshake,
  Shuffle,
  Database,
} from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { pickOperationalSeason } from '@/lib/seasons/operational';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
};

export default async function LeagueDetailPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const t = await getTranslations('leagues');
  const { supabase, userData } = await requireLeagueDashboardAccess({ leagueId, locale });

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
        end_date,
        registration_type
      )
    `)
    .eq('id', leagueId)
    .single();

  if (error) {
    console.error('[League Page] Error fetching league:', error.message, { leagueId, userId: userData?.user?.id });
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

  // Pending action counts — all run in parallel
  const currentSeason = pickOperationalSeason((league.seasons as any[]) ?? []);

  const [
    { count: pendingRegistrations },
    { count: pendingGames },
    { count: activeSuspensions },
    { count: unreadMessages },
  ] = await Promise.all([
    (supabase.from('registration_submissions') as any)
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'pending'),
    currentSeason
      ? supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', leagueId)
          .eq('season_id', currentSeason.id)
          .eq('status', 'completed')
          .or('home_captain_verified.eq.false,away_captain_verified.eq.false')
      : Promise.resolve({ count: 0 }),
    (supabase.from('suspensions') as any)
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'active'),
    supabase
      .from('contact_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('is_read', false),
  ]);

  const pendingActions = [
    pendingRegistrations && { label: `${pendingRegistrations} pending registration${pendingRegistrations === 1 ? '' : 's'}`, href: `/${locale}/dashboard/leagues/${leagueId}/registrations?status=pending`, color: 'yellow' },
    pendingGames && { label: `${pendingGames} game${pendingGames === 1 ? '' : 's'} awaiting verification`, href: `/${locale}/dashboard/leagues/${leagueId}/games`, color: 'blue' },
    activeSuspensions && { label: `${activeSuspensions} active suspension${activeSuspensions === 1 ? '' : 's'}`, href: `/${locale}/dashboard/leagues/${leagueId}/games`, color: 'red' },
    unreadMessages && { label: `${unreadMessages} new contact message${unreadMessages === 1 ? '' : 's'}`, href: `/${locale}/dashboard/leagues/${leagueId}/contact-inbox`, color: 'purple' },
  ].filter(Boolean) as Array<{ label: string; href: string; color: string }>;

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
            {t('backToLeagues')}
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
                <p className="text-neutral-400 mt-1">{league.description || t('noDescription')}</p>
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
              <span className="text-sm text-neutral-400">{t('teams')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{teamsCount || 0}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <LayoutGrid className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">{t('divisions')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{divisionsCount || 0}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">{t('seasons')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{league.seasons?.length || 0}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">{t('location')}</span>
            </div>
            <p className="text-lg font-semibold text-white truncate">
              {league.city || t('unknown')}{league.city && league.state_province ? ', ' : ''}{league.state_province || ''}
            </p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">{t('timezone')}</span>
            </div>
            <p className="text-lg font-semibold text-white truncate">{league.timezone || t('notSet')}</p>
          </div>
        </div>

        {/* Pending Actions Banner */}
        {pendingActions.length > 0 && (
          <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Needs Attention</p>
            <div className="flex flex-wrap gap-2">
              {pendingActions.map((action) => {
                const colorMap: Record<string, string> = {
                  yellow: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20',
                  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20',
                  red: 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20',
                  purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20',
                };
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${colorMap[action.color] ?? colorMap.yellow}`}
                  >
                    {action.label} →
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {(league.seasons as any[])?.some((s: any) => s.registration_type === 'draft') && (
            <QuickActionButton
              href={`/${locale}/dashboard/leagues/${leagueId}/draft`}
              icon={<Shuffle className="w-5 h-5" />}
              title={t('draftRoom')}
              description={t('draftRoomDescription')}
              highlight
            />
          )}
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/teams`}
            icon={<Users className="w-5 h-5" />}
            title={t('manageTeams')}
            description={t('manageTeamsDescription')}
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/divisions`}
            icon={<LayoutGrid className="w-5 h-5" />}
            title={t('divisionsAction')}
            description={t('divisionsDescription')}
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/schedule`}
            icon={<Calendar className="w-5 h-5" />}
            title={t('schedule')}
            description={t('scheduleDescription')}
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/migration-center`}
            icon={<Database className="w-5 h-5" />}
            title="Migration Center"
            description="Track legacy stats, records, news, and media migration."
            highlight
          />
          <QuickActionButton
            href={`/${locale}/website-editor?league=${leagueId}`}
            icon={<Globe className="w-5 h-5" />}
            title={t('websiteEditor')}
            description={t('websiteEditorDescription')}
            highlight
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/payments`}
            icon={<CreditCard className="w-5 h-5" />}
            title={t('playerPayments')}
            description={t('playerPaymentsDescription')}
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/settings`}
            icon={<Settings className="w-5 h-5" />}
            title={t('settings')}
            description={t('settingsDescription')}
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/news`}
            icon={<Newspaper className="w-5 h-5" />}
            title={t('newsArticles')}
            description={t('newsArticlesDescription')}
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/sponsors`}
            icon={<Handshake className="w-5 h-5" />}
            title={t('sponsors')}
            description={t('sponsorsDescription')}
          />
          <QuickActionButton
            href={`/${locale}/dashboard/leagues/${leagueId}/awards`}
            icon={<Trophy className="w-5 h-5" />}
            title={t('awards')}
            description={t('awardsDescription')}
          />
        </div>

        {/* Seasons Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">{t('seasons')}</h2>
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/seasons/new`}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                'bg-rink-500/10 text-rink-500 border border-rink-500/30',
                'hover:bg-rink-500/20 transition-colors'
              )}
            >
              <Plus className="w-4 h-4" />
              {t('newSeason')}
            </Link>
          </div>

          {league.seasons && league.seasons.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {league.seasons.map((season: any) => (
                <SeasonCard key={season.id} season={season} leagueId={leagueId} locale={locale} t={t} />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
              <Calendar className="w-12 h-12 text-rink-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{t('noSeasonsYet')}</h3>
              <p className="text-neutral-400 mb-4">
                {t('noSeasonsDescription')}
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
                {t('createSeason')}
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
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-start gap-4 p-5 rounded-2xl transition-all duration-200',
        'backdrop-blur-xl',
        'group',
        highlight
          ? 'bg-gradient-to-br from-rink-500/10 to-arena-500/10 border border-rink-500/30 hover:border-rink-500/50'
          : 'bg-white/[0.04] border border-white/10 hover:border-white/20'
      )}
    >
      <div className={cn(
        "p-2 rounded-xl group-hover:scale-110 transition-transform",
        highlight
          ? "bg-gradient-to-r from-rink-500 to-arena-500 text-black"
          : "bg-rink-500/10 text-rink-500"
      )}>
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

function SeasonCard({ season, leagueId, locale, t }: { season: any; leagueId: string; locale: string; t: any }) {
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
            {season.end_date ? new Date(season.end_date).toLocaleDateString() : t('ongoing')}
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
          {t('manage')}
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
