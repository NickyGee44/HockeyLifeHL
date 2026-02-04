import type { Metadata } from 'next';
import Image from 'next/image';
import { format, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay } from 'date-fns';
import {
  getLeagueBySlug,
  getCurrentSeason,
  getAllGames,
  getActiveSeasons,
} from '@/lib/data/league';
import { Calendar, MapPin, Clock } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
};

export const metadata: Metadata = {
  title: 'Schedule',
};

export default async function SchedulePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { season: seasonParam } = await searchParams;
  const league = await getLeagueBySlug(slug);

  if (!league) return null;

  const seasons = await getActiveSeasons(league.id);
  const currentSeason = seasonParam
    ? seasons.find((s) => s.id === seasonParam) || (await getCurrentSeason(league.id))
    : await getCurrentSeason(league.id);

  const games = currentSeason ? await getAllGames(currentSeason.id) : [];

  // Group games by month
  const gamesByMonth = games.reduce((acc, game) => {
    const monthKey = format(new Date(game.scheduledAt), 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(game);
    return acc;
  }, {} as Record<string, typeof games>);

  const basePath = `/league/${slug}`;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-[var(--league-primary)]" />
            Schedule
          </h1>
          {currentSeason && (
            <p className="text-[var(--color-text-secondary)] mt-1">
              {currentSeason.name}
            </p>
          )}
        </div>

        {/* Season Selector */}
        {seasons.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="season-select" className="text-sm text-[var(--color-text-secondary)]">
              Season:
            </label>
            <form>
              <select
                id="season-select"
                name="season"
                defaultValue={currentSeason?.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('season', e.target.value);
                  window.location.href = url.toString();
                }}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </form>
          </div>
        )}
      </div>

      {/* Games List */}
      {games.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <Calendar className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            No games scheduled yet
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(gamesByMonth).map(([monthKey, monthGames]) => (
            <section key={monthKey}>
              <h2 className="text-xl font-bold mb-4 sticky top-16 bg-[var(--color-background)] py-2 z-10">
                {format(new Date(monthKey + '-01'), 'MMMM yyyy')}
              </h2>
              <div className="space-y-3">
                {monthGames.map((game) => (
                  <div
                    key={game.id}
                    className={`bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] ${
                      game.status === 'completed'
                        ? 'opacity-80'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Date & Time */}
                      <div className="flex items-center gap-4 sm:min-w-[200px]">
                        <div className="text-center min-w-[50px]">
                          <div className="text-xs text-[var(--color-text-secondary)] uppercase">
                            {format(new Date(game.scheduledAt), 'EEE')}
                          </div>
                          <div className="text-xl font-bold">
                            {format(new Date(game.scheduledAt), 'd')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
                          <Clock className="w-4 h-4" />
                          {format(new Date(game.scheduledAt), 'h:mm a')}
                        </div>
                      </div>

                      {/* Teams */}
                      <div className="flex-1 flex items-center justify-center gap-4">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="font-medium text-right">
                            {game.homeTeam?.name || 'TBD'}
                          </span>
                          {game.homeTeam?.logoUrl ? (
                            <Image
                              src={game.homeTeam.logoUrl}
                              alt={game.homeTeam.name}
                              width={36}
                              height={36}
                              className="rounded"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold"
                              style={{
                                backgroundColor: game.homeTeam?.primaryColor || '#333',
                                color: game.homeTeam?.secondaryColor || '#fff',
                              }}
                            >
                              {game.homeTeam?.shortName.charAt(0) || 'H'}
                            </div>
                          )}
                        </div>

                        {/* Score or VS */}
                        {game.status === 'completed' &&
                        game.homeScore !== null &&
                        game.awayScore !== null ? (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-background)]">
                            <span
                              className={`text-xl font-bold ${
                                game.homeScore > game.awayScore
                                  ? 'text-[var(--color-success)]'
                                  : ''
                              }`}
                            >
                              {game.homeScore}
                            </span>
                            <span className="text-[var(--color-text-muted)]">-</span>
                            <span
                              className={`text-xl font-bold ${
                                game.awayScore > game.homeScore
                                  ? 'text-[var(--color-success)]'
                                  : ''
                              }`}
                            >
                              {game.awayScore}
                            </span>
                          </div>
                        ) : (
                          <div className="px-4 py-2 rounded-lg bg-[var(--color-background)]">
                            <span className="text-sm text-[var(--color-text-muted)]">
                              vs
                            </span>
                          </div>
                        )}

                        {/* Away Team */}
                        <div className="flex items-center gap-2 flex-1">
                          {game.awayTeam?.logoUrl ? (
                            <Image
                              src={game.awayTeam.logoUrl}
                              alt={game.awayTeam.name}
                              width={36}
                              height={36}
                              className="rounded"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold"
                              style={{
                                backgroundColor: game.awayTeam?.primaryColor || '#333',
                                color: game.awayTeam?.secondaryColor || '#fff',
                              }}
                            >
                              {game.awayTeam?.shortName.charAt(0) || 'A'}
                            </div>
                          )}
                          <span className="font-medium">
                            {game.awayTeam?.name || 'TBD'}
                          </span>
                        </div>
                      </div>

                      {/* Location */}
                      {game.location && (
                        <div className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] sm:min-w-[150px]">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{game.location}</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="sm:min-w-[80px] text-right">
                        {game.status === 'completed' && (
                          <span className="inline-block px-2 py-1 text-xs rounded bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]">
                            Final
                          </span>
                        )}
                        {game.status === 'in_progress' && (
                          <span className="inline-block px-2 py-1 text-xs rounded bg-[var(--color-success)]/20 text-[var(--color-success)]">
                            Live
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
