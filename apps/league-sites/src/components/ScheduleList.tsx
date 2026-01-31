'use client';

import { GameCard } from './GameCard';
import type { Game } from '@/lib/types';

interface ScheduleListProps {
  gamesByMonth: Record<string, Game[]>;
  leagueSlug: string;
  teamFilter?: string;
  monthFilter?: string;
}

export function ScheduleList({
  gamesByMonth,
  leagueSlug,
  teamFilter,
  monthFilter,
}: ScheduleListProps) {
  // Filter games by team if specified
  const filterGames = (games: Game[]) => {
    if (!teamFilter) return games;
    return games.filter(
      (game) =>
        (game.home_team as any)?.slug === teamFilter ||
        (game.away_team as any)?.slug === teamFilter
    );
  };

  // Filter months if specified
  const filteredMonths = monthFilter
    ? Object.entries(gamesByMonth).filter(([month]) =>
        month.toLowerCase().includes(monthFilter.toLowerCase())
      )
    : Object.entries(gamesByMonth);

  return (
    <div className="space-y-12">
      {filteredMonths.map(([month, games]) => {
        const filteredGames = filterGames(games);
        if (filteredGames.length === 0) return null;

        return (
          <section key={month}>
            <h2 className="text-xl font-bold mb-6 text-[var(--league-primary)]">
              {month}
            </h2>
            <div className="space-y-4">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game as any}
                  leagueSlug={leagueSlug}
                  showScore={game.status === 'final'}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
