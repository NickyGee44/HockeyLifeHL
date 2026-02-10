import { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ChevronRight } from 'lucide-react';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import { getLeagueBySlug, getScores, getSeasons, getCurrentSeason } from '@/lib/data';
import { ScoreCard } from '@/components/scores/ScoreCard';
import { ScoresFilters } from '@/components/scores/ScoresFilters';
import type { RecentGame } from '@/lib/types';

interface ScoresPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    period?: 'today' | 'yesterday' | '7days' | '30days';
    season?: string;
    division?: string;
  }>;
}

export async function generateMetadata({ params }: ScoresPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  return {
    title: league ? `Scores | ${league.name}` : 'Scores',
    description: league
      ? `View recent game scores and results for ${league.name}`
      : 'View recent game scores and results',
  };
}

/**
 * Group games by their scheduled date (YYYY-MM-DD key).
 * Returns a Map with date keys in reverse chronological order.
 */
function groupGamesByDate(games: RecentGame[]): Map<string, RecentGame[]> {
  const grouped = new Map<string, RecentGame[]>();
  for (const game of games) {
    const dateKey = new Date(game.scheduled_at).toISOString().split('T')[0];
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(game);
  }
  return grouped;
}

/**
 * Format a date key (YYYY-MM-DD) into a human-readable date divider string.
 */
function formatDateDivider(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00');

  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'EEEE, MMMM do');
}

export default async function ScoresPage({ params, searchParams }: ScoresPageProps) {
  const { leagueSlug } = await params;
  const { period = 'today', season: seasonFilter, division: divisionFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return null;

  // Determine days back based on period
  const daysBack = period === 'today' ? 1 : period === 'yesterday' ? 2 : period === '30days' ? 30 : 7;

  // Fetch current season first to get divisions
  await getCurrentSeason(league.id);

  // Fetch data in parallel
  const [seasons, games] = await Promise.all([
    getSeasons(league.id),
    getScores(league.id, {
      daysBack,
      seasonId: seasonFilter,
      divisionId: divisionFilter,
      status: 'all', // Include in-progress games too
    }),
  ]);

  // Filter games based on period
  const filteredGames = filterGamesByPeriod(games, period);

  // Group games by date
  const gamesByDate = groupGamesByDate(filteredGames);

  const buildPeriodHref = (nextPeriod: 'today' | 'yesterday' | '7days' | '30days') => {
    const params = new URLSearchParams();
    params.set('period', nextPeriod);

    if (seasonFilter) {
      params.set('season', seasonFilter);
    }

    if (divisionFilter) {
      params.set('division', divisionFilter);
    }

    return `/${leagueSlug}/scores?${params.toString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-2xl shadow-lg max-w-4xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)]">
            Scores
          </h1>
          <Activity className="w-7 h-7 text-[var(--league-primary)]" />
        </div>

        {/* Period Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <PeriodChip href={buildPeriodHref('today')} label="Today" active={period === 'today'} />
          <PeriodChip href={buildPeriodHref('yesterday')} label="Yesterday" active={period === 'yesterday'} />
          <PeriodChip href={buildPeriodHref('7days')} label="Last 7 Days" active={period === '7days'} />
          <PeriodChip href={buildPeriodHref('30days')} label="Last 30 Days" active={period === '30days'} />
        </div>

        {/* Filters */}
        <ScoresFilters
          seasons={seasons}
          currentFilters={{ season: seasonFilter, division: divisionFilter, period }}
          leagueSlug={leagueSlug}
        />

        {/* Scores List */}
        {filteredGames.length > 0 ? (
          <div className="mt-6 space-y-8">
            {Array.from(gamesByDate.entries()).map(([dateKey, dateGames]) => (
              <div key={dateKey}>
                {/* Date Divider */}
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--league-primary)] whitespace-nowrap">
                    {formatDateDivider(dateKey)}
                  </h2>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {dateGames.length} {dateGames.length === 1 ? 'game' : 'games'}
                  </span>
                </div>

                {/* Games for this date */}
                <div className="space-y-3">
                  {dateGames.map((game) => (
                    <ScoreCard key={game.id} game={game} leagueSlug={leagueSlug} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 p-12 text-center">
            <Activity className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Recent Scores</h3>
            <p className="text-[var(--color-text-secondary)]">
              {period === 'today'
                ? 'No games completed today yet.'
                : period === 'yesterday'
                ? 'No games were played yesterday.'
                : 'No games have been completed in this period.'}
            </p>
            <Link
              href={`/${leagueSlug}/schedule`}
              className="inline-flex items-center gap-1 mt-4 text-[var(--league-primary)] hover:underline"
            >
              View upcoming schedule
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function PeriodChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
        ${
          active
            ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)] shadow-md'
            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      {label}
    </Link>
  );
}

function filterGamesByPeriod(games: RecentGame[], period: string): RecentGame[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'today') {
    return games.filter((game) => {
      const gameDate = new Date(game.scheduled_at);
      return gameDate >= today;
    });
  }

  if (period === 'yesterday') {
    const yesterday = subDays(today, 1);
    return games.filter((game) => {
      const gameDate = new Date(game.scheduled_at);
      return gameDate >= yesterday && gameDate < today;
    });
  }

  // 7days or 30days - already filtered by getScores
  return games;
}
