'use client';

import { MapPin, Navigation } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { useCountdown, formatCountdownParts } from '@/lib/hooks/useCountdown';
import type { Game } from '@/lib/offline/db';
import { format } from 'date-fns';

interface CountdownCardProps {
  game: Game | null;
  className?: string;
}

export function CountdownCard({ game, className }: CountdownCardProps) {
  const countdown = useCountdown(game?.scheduled_at || null);

  if (!game) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-neutral-850 border border-gold-500/20 p-5',
          className
        )}
      >
        <div className="text-center py-8">
          <p className="text-neutral-500">No upcoming games</p>
        </div>
      </div>
    );
  }

  const gameDate = new Date(game.scheduled_at);
  const parts = formatCountdownParts(countdown);

  const handleGetDirections = () => {
    if (game.venue) {
      const query = encodeURIComponent(`${game.venue} ${game.rink || ''}`);
      window.open(`https://maps.google.com/?q=${query}`, '_blank');
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-neutral-850 border border-gold-500/20 p-5',
        className
      )}
    >
      {/* Subtle gold gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-transparent opacity-50" />

      {/* Content */}
      <div className="relative z-10">
        <span className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          Next Game
        </span>

        {/* Countdown */}
        <div className="mt-3 flex items-baseline gap-1">
          {parts.map((part, i) => (
            <span key={i} className="text-4xl font-black text-gradient-gold">
              {part.value}
              <span className="text-2xl">{part.unit}</span>
              {i < parts.length - 1 && <span className="text-neutral-600 mx-1">:</span>}
            </span>
          ))}
        </div>

        {/* Game Details */}
        <div className="mt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
            <span className="text-sm font-bold text-neutral-400">
              {game.is_home
                ? game.away_team_name.slice(0, 2).toUpperCase()
                : game.home_team_name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-base font-semibold text-white">
              {game.is_home ? `vs. ${game.away_team_name}` : `@ ${game.home_team_name}`}
            </p>
            <p className="text-sm text-neutral-400">
              {format(gameDate, 'EEE, MMM d')} at {format(gameDate, 'h:mm a')}
            </p>
          </div>
        </div>

        {/* Location + CTA */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <MapPin className="w-4 h-4" />
            <span className="truncate max-w-[180px]">
              {game.venue || 'TBD'}
              {game.rink && `, ${game.rink}`}
            </span>
          </div>
          {game.venue && (
            <button
              onClick={handleGetDirections}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold',
                'bg-gradient-to-r from-gold-500 to-gold-600 text-black',
                'active:scale-95 transition-transform'
              )}
            >
              <Navigation className="w-3.5 h-3.5" />
              Directions
            </button>
          )}
        </div>

        {/* Home/Away Badge */}
        <div className="absolute top-5 right-5">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
              game.is_home
                ? 'bg-gold-500/20 text-gold-400'
                : 'bg-neutral-700 text-neutral-300'
            )}
          >
            {game.is_home ? 'Home' : 'Away'}
          </span>
        </div>
      </div>
    </div>
  );
}
