import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import {
  getLeagueBySlug,
  getScores,
  getSeasons,
  getTeams,
  getCurrentSeason,
} from '@/lib/data';
import { GameCard } from '@/components/GameCard';
import { ScoresFilters } from '@/components/scores/ScoresFilters';
import { DivisionUrlSync } from '@/components/DivisionUrlSync';
import type { RecentGame } from '@/lib/types';

interface ScoresPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    season?: string;
    division?: string;
    team?: string;
    period?: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Scores',
  description: 'Recent game scores and results',
};

function groupGamesByDate(games: RecentGame[]): Map<string, RecentGame[]> {
  const grouped = new Map<string, RecentGame[]>();
  for (const game of games) {
    const dateKey = new Date(game.scheduled_at).toISOString().split('T')[0];
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(game);
  }
  return grouped;
}

function formatDateDivider(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00');
  return format(date, 'EEEE, MMMM do, yyyy');
}

export default async function ScoresPage({ params, searchParams }: ScoresPageProps) {
  const { leagueSlug } = await params;
  const {
    season: seasonFilter,
    division: divisionFilter,
    team: teamFilter,
    period: periodFilter,
  } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const daysBack = periodFilter === '30' ? 30 : periodFilter === '14' ? 14 : 7;

  const [scores, seasons, teams, currentSeason] = await Promise.all([
    getScores(league.id, {
      daysBack,
      seasonId: seasonFilter,
      divisionId: divisionFilter,
      teamId: teamFilter,
      status: 'completed',
    }),
    getSeasons(league.id),
    getTeams(league.id),
    getCurrentSeason(league.id),
  ]);

  const gamesByDate = groupGamesByDate(scores);

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-4">
          <ClipboardList className="w-8 h-8 text-[var(--league-primary)]" />
          Scores
        </h1>
        {currentSeason && (
          <p className="text-[var(--color-text-secondary)]">
            {currentSeason.name} Season
          </p>
        )}
      </div>

      {/* Division filter URL sync */}
      <DivisionUrlSync pagePath={`/${leagueSlug}/scores`} />

      {/* Filters */}
      <Suspense fallback={null}>
        <ScoresFilters
          seasons={seasons}
          teams={teams}
          currentFilters={{
            season: seasonFilter,
            division: divisionFilter,
            team: teamFilter,
            period: periodFilter || '7',
          }}
          leagueSlug={leagueSlug}
        />
      </Suspense>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {[
          { label: 'Last 7 days', value: '7' },
          { label: 'Last 14 days', value: '14' },
          { label: 'Last 30 days', value: '30' },
        ].map((opt) => (
          <Link
            key={opt.value}
            href={`/${leagueSlug}/scores?period=${opt.value}${seasonFilter ? `&season=${seasonFilter}` : ''}${teamFilter ? `&team=${teamFilter}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              String(daysBack) === opt.value
                ? 'bg-[var(--league-primary)] text-white'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Scores list grouped by date */}
      {scores.length > 0 ? (
        <div className="space-y-8">
          {Array.from(gamesByDate.entries()).map(([dateKey, games]) => (
            <div key={dateKey}>
              <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
                {formatDateDivider(dateKey)}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {games.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    leagueSlug={leagueSlug}
                    showScore
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Recent Scores</h3>
          <p className="text-[var(--color-text-secondary)]">
            Scores will appear here once games have been completed.
          </p>
        </div>
      )}
    </div>
  );
}
