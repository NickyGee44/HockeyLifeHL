'use client';

import { useState, useCallback } from 'react';
import { useGameSession, useGameScore, type Game, type Team } from '@/lib/scorekeeper';
import { cn } from '@hockey-life/ui';

interface ScoreCardProps {
  gameId: string;
  onPeriodChange?: (period: number) => void;
  currentPeriod?: number;
}

/**
 * ScoreCard - Main scoreboard display with period tabs
 * iPad-optimized with large touch targets and gold accents
 * Shows team names, logos, and current score
 */
export function ScoreCard({ gameId, onPeriodChange, currentPeriod = 1 }: ScoreCardProps) {
  const { game, isLoading, error } = useGameSession(gameId);
  const score = useGameScore(gameId);
  const [activePeriod, setActivePeriod] = useState(currentPeriod);

  const handlePeriodChange = useCallback((period: number) => {
    setActivePeriod(period);
    onPeriodChange?.(period);
  }, [onPeriodChange]);

  if (isLoading) {
    return <ScoreCardSkeleton />;
  }

  if (error || !game) {
    return (
      <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-8 text-center">
        <p className="text-red-400 font-medium">Failed to load game</p>
        <p className="text-neutral-400 text-sm mt-1">{error || 'Game not found'}</p>
      </div>
    );
  }

  const periodCount = game.period_count || 3;
  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);
  const hasOvertime = periodCount > 3;

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
      {/* Period Tabs */}
      <div className="flex border-b border-neutral-800">
        {periods.map((period) => (
          <button
            key={period}
            onClick={() => handlePeriodChange(period)}
            className={cn(
              'flex-1 py-4 px-6 text-base font-semibold transition-all duration-200',
              'touch-manipulation min-h-[56px]', // iPad touch optimization
              activePeriod === period
                ? 'bg-rink-500/10 text-rink-400 border-b-2 border-rink-500'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            )}
          >
            {period <= 3 ? `P${period}` : period === 4 ? 'OT' : `OT${period - 3}`}
          </button>
        ))}
      </div>

      {/* Score Display */}
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <TeamDisplay
            team={game.home_team}
            score={score.home}
            isHome={true}
          />

          {/* VS Divider */}
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-black text-rink-500">VS</span>
            <span className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">
              Period {activePeriod}
            </span>
          </div>

          {/* Away Team */}
          <TeamDisplay
            team={game.away_team}
            score={score.away}
            isHome={false}
          />
        </div>
      </div>

      {/* Game Time (Optional display) */}
      <div className="px-6 pb-6 md:px-8 md:pb-8">
        <div className="bg-neutral-950 rounded-xl p-4 text-center">
          <div className="text-4xl md:text-5xl font-mono font-bold text-white tracking-wider">
            20:00
          </div>
          <div className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">
            Period {activePeriod}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TeamDisplayProps {
  team?: Team;
  score: number;
  isHome: boolean;
}

function TeamDisplay({ team, score, isHome }: TeamDisplayProps) {
  const teamColor = team?.primary_color || (isHome ? '#22D3EE' : '#A3A3A3');

  return (
    <div className="flex-1 text-center">
      {/* Team Logo/Initial */}
      <div
        className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${teamColor}20`, borderColor: `${teamColor}40` }}
      >
        <span
          className="text-3xl md:text-4xl font-black"
          style={{ color: teamColor }}
        >
          {team?.short_name?.[0] || team?.name?.[0] || (isHome ? 'H' : 'A')}
        </span>
      </div>

      {/* Team Name */}
      <h3 className="text-lg md:text-xl font-bold text-white truncate px-2">
        {team?.name || (isHome ? 'Home' : 'Away')}
      </h3>
      <p className="text-xs text-neutral-500 uppercase tracking-wider mt-0.5">
        {isHome ? 'Home' : 'Away'}
      </p>

      {/* Score */}
      <div
        className="mt-4 inline-flex items-center justify-center min-w-[80px] md:min-w-[100px] py-3 px-6 rounded-xl"
        style={{ backgroundColor: `${teamColor}15` }}
      >
        <span
          className="text-5xl md:text-6xl font-black tabular-nums"
          style={{ color: teamColor }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

function ScoreCardSkeleton() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden animate-pulse">
      {/* Period tabs skeleton */}
      <div className="flex border-b border-neutral-800">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 py-4 px-6">
            <div className="h-6 bg-neutral-800 rounded w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Score skeleton */}
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-2xl bg-neutral-800 mb-4" />
            <div className="h-6 bg-neutral-800 rounded w-24 mx-auto mb-2" />
            <div className="h-4 bg-neutral-800 rounded w-12 mx-auto" />
            <div className="h-16 bg-neutral-800 rounded w-20 mx-auto mt-4" />
          </div>

          <div className="h-10 bg-neutral-800 rounded w-16" />

          <div className="flex-1 text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-2xl bg-neutral-800 mb-4" />
            <div className="h-6 bg-neutral-800 rounded w-24 mx-auto mb-2" />
            <div className="h-4 bg-neutral-800 rounded w-12 mx-auto" />
            <div className="h-16 bg-neutral-800 rounded w-20 mx-auto mt-4" />
          </div>
        </div>
      </div>

      {/* Timer skeleton */}
      <div className="px-6 pb-6 md:px-8 md:pb-8">
        <div className="bg-neutral-950 rounded-xl p-4 text-center">
          <div className="h-12 bg-neutral-800 rounded w-32 mx-auto" />
          <div className="h-4 bg-neutral-800 rounded w-16 mx-auto mt-2" />
        </div>
      </div>
    </div>
  );
}

export { ScoreCardSkeleton };
