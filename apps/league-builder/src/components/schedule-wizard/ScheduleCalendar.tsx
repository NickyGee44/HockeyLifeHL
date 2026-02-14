'use client';

/**
 * Schedule Calendar Component
 *
 * Displays a monthly calendar view of scheduled games.
 */

import { useState, useMemo } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import type { ScheduledGame, Team } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleCalendarProps {
  games: ScheduledGame[];
  teams: Team[];
  onGameClick?: (game: ScheduledGame) => void;
  onReschedule?: (gameId: string, newDate: Date) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add padding days from previous month
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add padding days for next month
  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleCalendar({
  games,
  teams,
  onGameClick,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedGame, setSelectedGame] = useState<ScheduledGame | null>(null);

  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  // Group games by date
  const gamesByDate = useMemo(() => {
    const grouped: Record<string, ScheduledGame[]> = {};
    for (const game of games) {
      const dateKey = game.scheduledAt.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(game);
    }
    return grouped;
  }, [games]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleGameClick = (game: ScheduledGame) => {
    setSelectedGame(game);
    onGameClick?.(game);
  };

  const today = new Date();

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <h3 className="text-lg font-bold text-white">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToPreviousMonth}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-neutral-800">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-neutral-500 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dateKey = day.toISOString().split('T')[0];
          const dayGames = gamesByDate[dateKey] ?? [];
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);

          return (
            <div
              key={index}
              className={cn(
                'min-h-[100px] p-2 border-b border-r border-neutral-800',
                !isCurrentMonth && 'bg-neutral-900/50',
                index % 7 === 6 && 'border-r-0'
              )}
            >
              {/* Date Number */}
              <div
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1',
                  isToday && 'bg-rink-500 text-black font-bold',
                  !isToday && isCurrentMonth && 'text-white',
                  !isToday && !isCurrentMonth && 'text-neutral-600'
                )}
              >
                {day.getDate()}
              </div>

              {/* Games */}
              <div className="space-y-1">
                {dayGames.slice(0, 3).map((game) => {
                  const homeTeam = teamsById[game.homeTeamId];
                  const awayTeam = teamsById[game.awayTeamId];

                  return (
                    <button
                      key={game.gameNumber}
                      onClick={() => handleGameClick(game)}
                      className={cn(
                        'w-full px-1.5 py-1 text-left rounded text-xs truncate transition-colors',
                        selectedGame?.gameNumber === game.gameNumber
                          ? 'bg-rink-500 text-black'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      )}
                    >
                      <span className="font-medium">{homeTeam?.shortName ?? '?'}</span>
                      <span className="text-neutral-500 mx-0.5">v</span>
                      <span className="font-medium">{awayTeam?.shortName ?? '?'}</span>
                    </button>
                  );
                })}
                {dayGames.length > 3 && (
                  <div className="text-xs text-neutral-500 px-1">
                    +{dayGames.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Game Details */}
      {selectedGame && (
        <div className="p-4 border-t border-neutral-800 bg-neutral-800/50">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-white">
                {teamsById[selectedGame.homeTeamId]?.name ?? 'Unknown'} vs{' '}
                {teamsById[selectedGame.awayTeamId]?.name ?? 'Unknown'}
              </h4>
              <div className="flex items-center gap-4 mt-2 text-sm text-neutral-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {selectedGame.scheduledAt.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedGame.scheduledAt.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {selectedGame.location}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-neutral-700 rounded text-xs text-neutral-300">
                Round {selectedGame.roundNumber}
              </span>
              <span className="px-2 py-1 bg-neutral-700 rounded text-xs text-neutral-300">
                Game #{selectedGame.gameNumber}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
