'use client';

import { cn } from '@hockey-life/ui';
import { format } from 'date-fns';
import type { Game } from '@/lib/actions/games';
import { StatusBadge, StatusDot } from './status-badge';
import { Calendar, MapPin, Trophy, Edit, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface GameCardProps {
  game: Game;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  showCheckbox?: boolean;
  className?: string;
  // Optional action callbacks
  onEdit?: () => void;
  onCancel?: () => void;
  onClick?: () => void;
}

export function GameCard({
  game,
  selected,
  onSelect,
  showCheckbox = false,
  className,
}: GameCardProps) {
  const isCompleted = game.status === 'completed';
  const homeTeam = game.home_team;
  const awayTeam = game.away_team;

  return (
    <div
      className={cn(
        'bg-neutral-900 border rounded-2xl overflow-hidden transition-all duration-200',
        'hover:border-gold-500/40 hover:shadow-lg hover:shadow-gold-500/5',
        selected ? 'border-gold-500/60' : 'border-gold-500/20',
        className
      )}
    >
      {/* Header with status and date */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gold-500/10">
        <div className="flex items-center gap-3">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect?.(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500 focus:ring-offset-0"
            />
          )}
          <StatusBadge status={game.status} isRescheduled={game.is_rescheduled} size="sm" />
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Calendar className="w-3.5 h-3.5" />
          {format(new Date(game.scheduled_at), 'MMM d, yyyy')}
          <span className="text-neutral-600">|</span>
          {format(new Date(game.scheduled_at), 'h:mm a')}
        </div>
      </div>

      {/* Teams and Score */}
      <Link
        href={`/dashboard/games/${game.id}`}
        className="block p-4 hover:bg-neutral-800/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: homeTeam?.primary_color || '#D4AF37' }}
              >
                {homeTeam?.logo_url ? (
                  <img
                    src={homeTeam.logo_url}
                    alt={homeTeam.name}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <Trophy className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">
                  {homeTeam?.name || 'Home Team'}
                </p>
                <p className="text-xs text-neutral-500">Home</p>
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-2xl font-bold',
                isCompleted
                  ? game.home_score > game.away_score
                    ? 'text-green-500'
                    : game.home_score < game.away_score
                    ? 'text-neutral-500'
                    : 'text-white'
                  : 'text-neutral-600'
              )}
            >
              {game.home_score}
            </span>
            <span className="text-neutral-600 font-bold">-</span>
            <span
              className={cn(
                'text-2xl font-bold',
                isCompleted
                  ? game.away_score > game.home_score
                    ? 'text-green-500'
                    : game.away_score < game.home_score
                    ? 'text-neutral-500'
                    : 'text-white'
                  : 'text-neutral-600'
              )}
            >
              {game.away_score}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex-1">
            <div className="flex items-center justify-end gap-3">
              <div className="text-right">
                <p className="font-semibold text-white text-sm">
                  {awayTeam?.name || 'Away Team'}
                </p>
                <p className="text-xs text-neutral-500">Away</p>
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: awayTeam?.primary_color || '#3B82F6' }}
              >
                {awayTeam?.logo_url ? (
                  <img
                    src={awayTeam.logo_url}
                    alt={awayTeam.name}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <Trophy className="w-5 h-5 text-white" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        {game.location && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gold-500/10">
            <MapPin className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs text-neutral-400">{game.location}</span>
          </div>
        )}

        {/* Cancellation reason */}
        {game.status === 'cancelled' && game.cancellation_reason && (
          <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">
              <span className="font-medium">Reason: </span>
              {game.cancellation_reason}
            </p>
          </div>
        )}

        {/* Round info */}
        {game.round_number && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gold-500/10">
            <span className="text-xs text-neutral-500">
              Round {game.round_number}
              {game.game_number && `, Game ${game.game_number}`}
            </span>
            {game.season && (
              <span className="text-xs text-neutral-500">{game.season.name}</span>
            )}
          </div>
        )}
      </Link>
    </div>
  );
}

// Compact variant for lists
export function GameCardCompact({
  game,
  selected,
  onSelect,
  showCheckbox = false,
  className,
  onEdit,
  onCancel,
  onClick,
}: GameCardProps) {
  const homeTeam = game.home_team;
  const awayTeam = game.away_team;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 bg-neutral-900 border rounded-xl transition-all',
        'hover:border-gold-500/40 hover:bg-neutral-800/50',
        selected ? 'border-gold-500/60' : 'border-gold-500/20',
        className
      )}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect?.(e.target.checked)}
          className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-gold-500 focus:ring-gold-500 focus:ring-offset-0"
        />
      )}

      <StatusDot status={game.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-white truncate">
            {homeTeam?.short_name || homeTeam?.name || 'Home'}
          </span>
          <span className="text-neutral-500">vs</span>
          <span className="font-medium text-white truncate">
            {awayTeam?.short_name || awayTeam?.name || 'Away'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
          <span>{format(new Date(game.scheduled_at), 'MMM d, h:mm a')}</span>
          {game.location && (
            <>
              <span>-</span>
              <span className="truncate">{game.location}</span>
            </>
          )}
        </div>
      </div>

      {game.status === 'completed' && (
        <div className="flex items-center gap-1.5 font-semibold text-sm">
          <span className={game.home_score > game.away_score ? 'text-green-500' : 'text-neutral-400'}>
            {game.home_score}
          </span>
          <span className="text-neutral-600">-</span>
          <span className={game.away_score > game.home_score ? 'text-green-500' : 'text-neutral-400'}>
            {game.away_score}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {onEdit && game.status !== 'cancelled' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 rounded-lg text-neutral-400 hover:text-gold-500 hover:bg-gold-500/10 transition-colors"
            title="Edit game"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        {onCancel && game.status === 'scheduled' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Cancel game"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {onClick ? (
          <button
            onClick={onClick}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              'bg-gold-500/10 text-gold-500 hover:bg-gold-500/20'
            )}
          >
            View
          </button>
        ) : (
          <Link
            href={`/dashboard/games/${game.id}`}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              'bg-gold-500/10 text-gold-500 hover:bg-gold-500/20'
            )}
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}
