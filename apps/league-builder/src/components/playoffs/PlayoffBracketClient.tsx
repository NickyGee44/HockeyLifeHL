'use client';

import { useState, useTransition } from 'react';
import { cn } from '@hockey-life/ui';
import { Trophy, Loader2, ChevronRight } from 'lucide-react';
import {
  generatePlayoffBracket,
  recordSeriesWin,
  type PlayoffBracket,
  type PlayoffSeries,
} from '@/lib/actions/playoff-bracket';

interface PlayoffBracketClientProps {
  leagueId: string;
  seasonId: string;
  initialBracket: PlayoffBracket | null;
  canEdit: boolean;
}

const ROUND_LABELS: Record<number, string> = {
  1: 'Round 1',
  2: 'Quarterfinals',
  3: 'Semifinals',
  4: 'Championship',
};

function getRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round + 1;
  if (fromEnd === 1) return 'Championship';
  if (fromEnd === 2) return 'Semifinals';
  if (fromEnd === 3) return 'Quarterfinals';
  return ROUND_LABELS[round] ?? `Round ${round}`;
}

function SeriesCard({
  series,
  canEdit,
  onRecordWin,
  isPending,
}: {
  series: PlayoffSeries;
  canEdit: boolean;
  onRecordWin: (seriesId: string, side: 'high' | 'low') => void;
  isPending: boolean;
}) {
  const isCompleted = series.status === 'completed';
  const isActive = series.status === 'in_progress' || series.status === 'pending';
  const hasTeams = series.high_seed_id || series.low_seed_id;

  const highWon = isCompleted && series.winner_id === series.high_seed_id;
  const lowWon = isCompleted && series.winner_id === series.low_seed_id;

  return (
    <div
      className={cn(
        'rounded-xl border p-3 min-w-[200px] transition-all',
        isCompleted
          ? 'border-white/20 bg-neutral-800/60'
          : hasTeams
            ? 'border-rink-500/40 bg-neutral-800/80'
            : 'border-white/10 bg-neutral-900/60'
      )}
    >
      {/* High Seed Row */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg mb-1',
          highWon ? 'bg-rink-500/20' : 'bg-neutral-900/50'
        )}
      >
        <span
          className={cn(
            'text-sm font-medium truncate flex-1',
            highWon ? 'text-rink-400 font-semibold' : 'text-neutral-300',
            !series.high_seed_name && 'text-neutral-600 italic'
          )}
        >
          {series.high_seed_name ?? 'TBD'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              'text-sm font-bold w-5 text-center',
              highWon ? 'text-rink-400' : 'text-neutral-400'
            )}
          >
            {series.high_seed_wins}
          </span>
          {highWon && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
          {canEdit && isActive && series.high_seed_id && (
            <button
              onClick={() => onRecordWin(series.id, 'high')}
              disabled={isPending}
              className={cn(
                'ml-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
                'bg-rink-500/20 text-rink-400 hover:bg-rink-500/40 hover:text-rink-300',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Record win for top seed"
            >
              +W
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 mx-2 my-1" />

      {/* Low Seed Row */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg',
          lowWon ? 'bg-rink-500/20' : 'bg-neutral-900/50'
        )}
      >
        <span
          className={cn(
            'text-sm font-medium truncate flex-1',
            lowWon ? 'text-rink-400 font-semibold' : 'text-neutral-300',
            !series.low_seed_name && 'text-neutral-600 italic'
          )}
        >
          {series.low_seed_name ?? 'TBD'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              'text-sm font-bold w-5 text-center',
              lowWon ? 'text-rink-400' : 'text-neutral-400'
            )}
          >
            {series.low_seed_wins}
          </span>
          {lowWon && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
          {canEdit && isActive && series.low_seed_id && (
            <button
              onClick={() => onRecordWin(series.id, 'low')}
              disabled={isPending}
              className={cn(
                'ml-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
                'bg-rink-500/20 text-rink-400 hover:bg-rink-500/40 hover:text-rink-300',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Record win for bottom seed"
            >
              +W
            </button>
          )}
        </div>
      </div>

      {/* Status indicator */}
      {isCompleted && series.winner_name && (
        <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-400 font-medium truncate">
            {series.winner_name} advances
          </span>
        </div>
      )}
    </div>
  );
}

export function PlayoffBracketClient({
  leagueId,
  seasonId,
  initialBracket,
  canEdit,
}: PlayoffBracketClientProps) {
  const [bracket, setBracket] = useState<PlayoffBracket | null>(initialBracket);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generatePlayoffBracket(leagueId, seasonId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Reload bracket data after generation
      window.location.reload();
    });
  };

  const handleRecordWin = (seriesId: string, side: 'high' | 'low') => {
    setError(null);
    startTransition(async () => {
      const result = await recordSeriesWin(leagueId, seasonId, seriesId, side);
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Update local state optimistically — reload to get fresh data
      window.location.reload();
    });
  };

  // No bracket yet
  if (!bracket) {
    return (
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-2xl bg-purple-500/10">
            <Trophy className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Playoff Bracket Yet</h3>
        <p className="text-neutral-400 text-sm mb-6 max-w-sm mx-auto">
          Generate the bracket from current standings. Make sure the regular season is complete
          before generating playoffs.
        </p>
        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-500/10 rounded-lg px-4 py-2">{error}</p>
        )}
        {canEdit && (
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all',
              'bg-purple-500 hover:bg-purple-400 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Generate Playoff Bracket
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Group series by round
  const seriesByRound: Record<number, PlayoffSeries[]> = {};
  for (const s of bracket.series) {
    if (!seriesByRound[s.round_number]) seriesByRound[s.round_number] = [];
    seriesByRound[s.round_number].push(s);
    seriesByRound[s.round_number].sort((a, b) => a.series_number - b.series_number);
  }

  const roundNumbers = Object.keys(seriesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  // Check for champion
  const champion = bracket.series.find(
    (s) => s.round_number === bracket.rounds && s.status === 'completed' && s.winner_id
  );

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Trophy className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Playoff Bracket</h2>
            <p className="text-xs text-neutral-500 capitalize">
              {bracket.format.replace(/_/g, ' ')} format
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              'bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Regenerating...
              </>
            ) : (
              'Regenerate Bracket'
            )}
          </button>
        )}
      </div>

      {/* Champion banner */}
      {champion && champion.winner_name && (
        <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">Champion</p>
            <p className="text-lg font-black text-amber-400">{champion.winner_name}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm mb-4 bg-red-500/10 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* Bracket grid */}
      <div className="overflow-x-auto">
        <div className="flex items-start gap-2 min-w-max pb-2">
          {roundNumbers.map((round, roundIdx) => {
            const roundSeries = seriesByRound[round];
            const label = getRoundLabel(round, bracket.rounds);
            const isLast = roundIdx === roundNumbers.length - 1;

            return (
              <div key={round} className="flex items-start gap-2">
                {/* Round column */}
                <div className="flex flex-col gap-2">
                  {/* Round label */}
                  <div className="text-center mb-2">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      {label}
                    </span>
                  </div>

                  {/* Series cards with vertical centering based on round */}
                  <div
                    className="flex flex-col"
                    style={{
                      gap: `${Math.pow(2, roundIdx) * 8 + 8}px`,
                    }}
                  >
                    {roundSeries.map((s) => (
                      <SeriesCard
                        key={s.id}
                        series={s}
                        canEdit={canEdit}
                        onRecordWin={handleRecordWin}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                </div>

                {/* Connector arrow between rounds */}
                {!isLast && (
                  <div className="flex items-center self-center mt-6">
                    <ChevronRight className="w-5 h-5 text-neutral-700" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rink-500/60" />
          <span className="text-xs text-neutral-500">Active series</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
          <span className="text-xs text-neutral-500">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-white/10" />
          <span className="text-xs text-neutral-500">Awaiting opponent</span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-rink-500/20 text-rink-400 font-medium">
              +W
            </span>
            <span className="text-xs text-neutral-500">Record a win</span>
          </div>
        )}
      </div>
    </div>
  );
}
