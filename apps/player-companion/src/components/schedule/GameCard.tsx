'use client';

import { cn } from '@hockey-life/ui';
import { format } from 'date-fns';
import type { Game } from '@/lib/offline/db';

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

export function GameCard({ game, onClick }: GameCardProps) {
  const gameDate = new Date(game.scheduled_at);
  const opponentName = game.is_home ? game.away_team_name : game.home_team_name;
  const initials = opponentName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const getStatusBadge = () => {
    switch (game.status) {
      case 'completed':
        const isWin = game.is_home
          ? (game.home_score || 0) > (game.away_score || 0)
          : (game.away_score || 0) > (game.home_score || 0);
        return {
          text: isWin ? 'W' : 'L',
          className: isWin
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400',
        };
      case 'in_progress':
        return { text: 'LIVE', className: 'bg-gold-500/20 text-gold-400 animate-pulse' };
      case 'cancelled':
        return { text: 'CXL', className: 'bg-neutral-700 text-neutral-400' };
      default:
        return {
          text: game.is_home ? 'HOME' : 'AWAY',
          className: game.is_home
            ? 'bg-gold-500/20 text-gold-400'
            : 'bg-neutral-700 text-neutral-300',
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl',
        'bg-neutral-850 border border-gold-500/20',
        'active:bg-neutral-800 transition-colors',
        'touch-action-manipulation'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Opponent Logo/Initials */}
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
            <span className="text-sm font-bold text-neutral-400">{initials}</span>
          </div>

          <div>
            <p className="text-base font-semibold text-white">
              {game.is_home ? 'vs.' : '@'} {opponentName}
            </p>
            <p className="text-sm text-neutral-400">
              {game.venue || 'TBD'}
              {game.rink && `, ${game.rink}`}
            </p>
          </div>
        </div>

        <div className="text-right">
          {game.status === 'completed' ? (
            <>
              <p className="text-base font-semibold text-white">
                {game.is_home
                  ? `${game.home_score}-${game.away_score}`
                  : `${game.away_score}-${game.home_score}`}
              </p>
              <span
                className={cn(
                  'inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                  statusBadge.className
                )}
              >
                {statusBadge.text}
              </span>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-white">
                {format(gameDate, 'h:mm a')}
              </p>
              <span
                className={cn(
                  'inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                  statusBadge.className
                )}
              >
                {statusBadge.text}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export function DateGroupHeader({ date }: { date: string }) {
  const dateObj = new Date(date);
  return (
    <div className="flex items-center gap-3 py-3 mt-4 first:mt-0">
      <span className="text-sm font-semibold text-neutral-300">
        {format(dateObj, 'EEEE, MMMM d')}
      </span>
      <div className="flex-1 h-px bg-gold-500/20" />
    </div>
  );
}
