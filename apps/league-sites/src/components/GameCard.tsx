'use client';

import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { useRef, useCallback } from 'react';
import type { UpcomingGame, RecentGame } from '@/lib/types';
import { LiveIndicator } from './ui/animations';

interface GameCardProps {
  game: UpcomingGame | RecentGame;
  leagueSlug: string;
  showScore?: boolean;
}

export function GameCard({ game, leagueSlug, showScore = false }: GameCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const gameDate = new Date(game.scheduled_at);
  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'in_progress';
  const statusLabel = isLive ? 'Live' : isCompleted ? 'Final' : 'Scheduled';

  // Track mouse position for radial gradient effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  }, []);

  return (
    <div
      ref={cardRef}
      className="game-card group relative overflow-hidden"
      onMouseMove={handleMouseMove}
      style={
        {
          '--home-team-color': game.home_team?.colors || 'var(--league-primary)',
          '--away-team-color': game.away_team?.colors || 'var(--league-secondary)',
        } as React.CSSProperties
      }
    >
      <span
        className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
          isLive
            ? 'bg-red-500/15 text-red-300'
            : isCompleted
              ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
              : 'bg-[var(--league-primary)]/14 text-[var(--league-primary)]'
        }`}
      >
        {statusLabel}
      </span>

      {/* Away Team */}
      <div className="team away">
        <div className="flex flex-col items-end">
          <Link
            href={`/${leagueSlug}/teams/${game.away_team?.slug}`}
            className="font-semibold hover:text-[var(--league-primary)] transition-colors duration-300"
          >
            {game.away_team?.name || 'TBD'}
          </Link>
          {showScore && isCompleted && (
            <span
              className={`text-2xl font-bold score transition-all duration-300 ${
                (game.away_score || 0) > (game.home_score || 0)
                  ? 'text-[var(--league-primary)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {game.away_score}
            </span>
          )}
        </div>
        <TeamInitial name={game.away_team?.name || 'T'} logo={game.away_team?.logo ?? undefined} />
      </div>

      {/* Center */}
      <div className="text-center relative">
        {isLive ? (
          <LiveIndicator size="md" />
        ) : isCompleted ? (
          <span className="vs uppercase text-sm tracking-wide">Final</span>
        ) : (
          <>
            <div className="text-sm font-medium text-[var(--color-text-secondary)] transition-colors duration-300 group-hover:text-[var(--color-text-primary)]">
              {format(gameDate, 'MMM d')}
            </div>
            <div className="text-lg font-bold text-[var(--league-primary)] transition-all duration-300 group-hover:scale-105">
              {format(gameDate, 'h:mm a')}
            </div>
          </>
        )}

        {game.venue && !isCompleted && (
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-[var(--color-text-muted)] transition-colors duration-300 group-hover:text-[var(--color-text-secondary)]">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{game.venue}</span>
          </div>
        )}
      </div>

      {/* Home Team */}
      <div className="team">
        <TeamInitial name={game.home_team?.name || 'T'} logo={game.home_team?.logo ?? undefined} />
        <div className="flex flex-col">
          <Link
            href={`/${leagueSlug}/teams/${game.home_team?.slug}`}
            className="font-semibold hover:text-[var(--league-primary)] transition-colors duration-300"
          >
            {game.home_team?.name || 'TBD'}
          </Link>
          {showScore && isCompleted && (
            <span
              className={`text-2xl font-bold score transition-all duration-300 ${
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

interface TeamInitialProps {
  name: string;
  logo?: string;
}

function TeamInitial({ name, logo }: TeamInitialProps) {
  if (logo) {
    return (
      <div className="relative overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-105">
        <Image
          src={logo}
          alt={name}
          width={48}
          height={48}
          className="rounded-lg transition-all duration-300"
        />
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold relative overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg"
      style={{
        backgroundColor: 'var(--league-primary)',
        color: 'var(--color-accent-text)',
      }}
    >
      <span className="relative z-10">{name.charAt(0)}</span>
      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
