import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueSchedulePage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  // Get league details with seasons
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      primary_color,
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

  if (leagueError || !league) {
    console.error('[Schedule Page] Error fetching league:', leagueError?.message);
    notFound();
  }

  // Get upcoming games
  const { data: upcomingGames } = await supabase
    .from('games')
    .select(`
      id,
      scheduled_at,
      status,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey (id, name, short_name, primary_color),
      away_team:teams!games_away_team_id_fkey (id, name, short_name, primary_color),
      venue:venues (id, name)
    `)
    .eq('league_id', leagueId)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(10);

  const activeSeason = league.seasons?.find((s: any) => s.status === 'active');

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Schedule</h1>
              <p className="text-neutral-400 mt-1">
                View and manage game schedules for {league.name}
              </p>
            </div>

            {activeSeason && (
              <Link
                href={`/${locale}/dashboard/seasons/${activeSeason.id}/schedule`}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
                )}
              >
                <Plus className="w-4 h-4" />
                Generate Schedule
              </Link>
            )}
          </div>
        </div>

        {/* Season Selection */}
        {league.seasons && league.seasons.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Seasons</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {league.seasons.map((season: any) => (
                <Link
                  key={season.id}
                  href={`/${locale}/dashboard/seasons/${season.id}/schedule`}
                  className={cn(
                    'flex items-center justify-between p-5 rounded-xl transition-all',
                    'bg-white/[0.04] border border-white/10 hover:border-rink-500/50',
                    season.status === 'active' && 'border-rink-500/30 bg-rink-500/5'
                  )}
                >
                  <div>
                    <h3 className="font-semibold text-white">{season.name}</h3>
                    <p className="text-sm text-neutral-500">
                      {new Date(season.start_date).toLocaleDateString()} - {' '}
                      {season.end_date ? new Date(season.end_date).toLocaleDateString() : 'Ongoing'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2.5 py-1 text-xs font-semibold rounded-full border',
                        season.status === 'active'
                          ? 'bg-green-500/10 text-green-500 border-green-500/30'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      )}
                    >
                      {season.status}
                    </span>
                    <ChevronRight className="w-5 h-5 text-neutral-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center mb-8">
            <Calendar className="w-16 h-16 text-rink-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Seasons Yet</h3>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              Create a season first to start generating schedules
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

        {/* Upcoming Games */}
        {upcomingGames && upcomingGames.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Upcoming Games</h2>
            <div className="space-y-3">
              {upcomingGames.map((game: any) => (
                <GameCard key={game.id} game={game} locale={locale} leagueId={leagueId} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GameCard({
  game,
  locale,
  leagueId,
}: {
  game: any;
  locale: string;
  leagueId: string;
}) {
  const gameDate = new Date(game.scheduled_at);

  return (
    <Link
      href={`/${locale}/dashboard/leagues/${leagueId}/games/${game.id}`}
      className="flex items-center gap-4 p-4 bg-white/[0.04] border border-white/10 rounded-xl hover:border-white/20 transition-colors"
    >
      {/* Date/Time */}
      <div className="text-center min-w-[80px]">
        <p className="text-2xl font-bold text-white">
          {gameDate.getDate()}
        </p>
        <p className="text-sm text-neutral-500">
          {gameDate.toLocaleDateString('en-US', { month: 'short' })}
        </p>
      </div>

      {/* Teams */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: game.home_team?.primary_color || '#22D3EE' }}
          >
            {game.home_team?.short_name || 'H'}
          </div>
          <span className="font-medium text-white">{game.home_team?.name || 'Home Team'}</span>
          <span className="text-neutral-500">vs</span>
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: game.away_team?.primary_color || '#3B82F6' }}
          >
            {game.away_team?.short_name || 'A'}
          </div>
          <span className="font-medium text-white">{game.away_team?.name || 'Away Team'}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
          {game.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {game.venue.name}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <span
        className={cn(
          'px-3 py-1.5 text-xs font-semibold rounded-full border',
          game.status === 'scheduled'
            ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
            : game.status === 'completed'
            ? 'bg-green-500/10 text-green-500 border-green-500/30'
            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
        )}
      >
        {game.status}
      </span>
    </Link>
  );
}
