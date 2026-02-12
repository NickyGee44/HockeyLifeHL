'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useGameSession, useGameScore, type Team } from '@/lib/scorekeeper';
import { cn } from '@hockey-life/ui';
import { usePeriodTimer } from './usePeriodTimer';

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
  const t = useTranslations('scorekeeper.scoreCard');
  const tScoring = useTranslations('scorekeeper.scoring');
  const { game, isLoading, error } = useGameSession(gameId);
  const score = useGameScore(gameId);
  const [activePeriod, setActivePeriod] = useState(currentPeriod);

  const periodLengthMinutes = game?.period_length_minutes || 20;

  const timer = usePeriodTimer({
    periodLengthMinutes,
  });

  const periodCount = game?.period_count || 3;
  const isLastPeriod = activePeriod >= periodCount;

  const handlePeriodChange = useCallback((period: number) => {
    setActivePeriod(period);
    onPeriodChange?.(period);
    timer.reset();
  }, [onPeriodChange, timer]);

  const handleEndPeriod = useCallback(() => {
    timer.stop();
    if (!isLastPeriod) {
      const nextPeriod = activePeriod + 1;
      setActivePeriod(nextPeriod);
      onPeriodChange?.(nextPeriod);
      timer.reset();
    }
  }, [activePeriod, isLastPeriod, onPeriodChange, timer]);

  if (isLoading) {
    return <ScoreCardSkeleton />;
  }

  if (error || !game) {
    return (
      <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-8 text-center">
        <p className="text-red-400 font-medium">{t('failedToLoad')}</p>
        <p className="text-neutral-400 text-sm mt-1">{error || t('gameNotFound')}</p>
      </div>
    );
  }

  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

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
            {period <= 3 ? `P${period}` : period === 4 ? t('ot') : `${t('ot')}${period - 3}`}
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
            homeLabel={tScoring('home')}
            awayLabel={tScoring('away')}
          />

          {/* VS Divider */}
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-black text-rink-500">VS</span>
            <span className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">
              {t('period', { period: activePeriod })}
            </span>
          </div>

          {/* Away Team */}
          <TeamDisplay
            team={game.away_team}
            score={score.away}
            isHome={false}
            homeLabel={tScoring('home')}
            awayLabel={tScoring('away')}
          />
        </div>
      </div>

      {/* Period Timer */}
      <div className="px-6 pb-6 md:px-8 md:pb-8">
        <div className="bg-neutral-950 rounded-xl p-4">
          {/* Timer Display */}
          <div className="text-center">
            <div
              className={cn(
                'text-4xl md:text-5xl font-mono font-bold tracking-wider transition-colors duration-300',
                timer.timerColorClass
              )}
            >
              {timer.displayTime}
            </div>
            <div className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">
              {t('period', { period: activePeriod })}{timer.isRunning ? ` — ${t('running')}` : ''}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={timer.toggle}
              className={cn(
                'flex-1 max-w-[140px] py-3 px-5 rounded-xl text-sm font-bold uppercase tracking-wider',
                'touch-manipulation min-h-[48px] transition-all duration-200',
                timer.isRunning
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/25'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
              )}
            >
              {timer.isRunning ? t('stop') : t('start')}
            </button>

            <button
              onClick={timer.reset}
              disabled={timer.isRunning}
              className={cn(
                'flex-1 max-w-[140px] py-3 px-5 rounded-xl text-sm font-bold uppercase tracking-wider',
                'touch-manipulation min-h-[48px] transition-all duration-200',
                'bg-neutral-800/60 text-neutral-300 border border-neutral-700/50',
                timer.isRunning
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-neutral-800 hover:text-white'
              )}
            >
              {t('reset')}
            </button>

            <button
              onClick={handleEndPeriod}
              disabled={isLastPeriod && timer.timeRemaining === 0}
              className={cn(
                'flex-1 max-w-[160px] py-3 px-5 rounded-xl text-sm font-bold uppercase tracking-wider',
                'touch-manipulation min-h-[48px] transition-all duration-200',
                'bg-rink-500/15 text-rink-400 border border-rink-500/30',
                isLastPeriod && timer.timeRemaining === 0
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-rink-500/25'
              )}
            >
              {isLastPeriod ? t('endGame') : t('endPeriod')}
            </button>
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
  homeLabel: string;
  awayLabel: string;
}

function TeamDisplay({ team, score, isHome, homeLabel, awayLabel }: TeamDisplayProps) {
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
        {team?.name || (isHome ? homeLabel : awayLabel)}
      </h3>
      <p className="text-xs text-neutral-500 uppercase tracking-wider mt-0.5">
        {isHome ? homeLabel : awayLabel}
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
