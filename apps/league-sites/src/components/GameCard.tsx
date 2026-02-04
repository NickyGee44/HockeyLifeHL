import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import type { UpcomingGame, RecentGame } from '@/lib/types';

interface GameCardProps {
  game: UpcomingGame | RecentGame;
  leagueSlug: string;
  showScore?: boolean;
}

export function GameCard({ game, leagueSlug, showScore = false }: GameCardProps) {
  const gameDate = new Date(game.scheduled_at);
  const isCompleted = game.status === 'final';
  const isLive = game.status === 'in_progress';

  return (
    <div className="game-card">
      {/* Away Team */}
      <div className="team away">
        <div className="flex flex-col items-end">
          <Link
            href={`/${leagueSlug}/teams/${game.away_team?.slug}`}
            className="font-semibold hover:text-[var(--league-primary)] transition-colors"
          >
            {game.away_team?.name || 'TBD'}
          </Link>
          {showScore && isCompleted && (
            <span
              className={`text-2xl font-bold ${
                (game.away_score || 0) > (game.home_score || 0)
                  ? 'text-[var(--league-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {game.away_score}
            </span>
          )}
        </div>
        {game.away_team?.logo ? (
          <Image
            src={game.away_team.logo}
            alt={game.away_team.name}
            width={48}
            height={48}
            className="rounded-lg"
          />
        ) : (
          <TeamInitial name={game.away_team?.name || 'T'} />
        )}
      </div>

      {/* Center */}
      <div className="text-center">
        {isLive ? (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
            LIVE
          </span>
        ) : isCompleted ? (
          <span className="vs">Final</span>
        ) : (
          <>
            <div className="text-sm font-medium">
              {format(gameDate, 'MMM d')}
            </div>
            <div className="text-lg font-bold text-[var(--league-primary)]">
              {format(gameDate, 'h:mm a')}
            </div>
          </>
        )}

        {game.venue && !isCompleted && (
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-[var(--color-text-muted)]">
            <MapPin className="w-3 h-3" />
            {game.venue}
          </div>
        )}
      </div>

      {/* Home Team */}
      <div className="team">
        {game.home_team?.logo ? (
          <Image
            src={game.home_team.logo}
            alt={game.home_team.name}
            width={48}
            height={48}
            className="rounded-lg"
          />
        ) : (
          <TeamInitial name={game.home_team?.name || 'T'} />
        )}
        <div className="flex flex-col">
          <Link
            href={`/${leagueSlug}/teams/${game.home_team?.slug}`}
            className="font-semibold hover:text-[var(--league-primary)] transition-colors"
          >
            {game.home_team?.name || 'TBD'}
          </Link>
          {showScore && isCompleted && (
            <span
              className={`text-2xl font-bold ${
                (game.home_score || 0) > (game.away_score || 0)
                  ? 'text-[var(--league-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {game.home_score}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamInitial({ name }: { name: string }) {
  return (
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
      style={{
        backgroundColor: 'var(--league-primary)',
        color: 'var(--color-background)',
      }}
    >
      {name.charAt(0)}
    </div>
  );
}
