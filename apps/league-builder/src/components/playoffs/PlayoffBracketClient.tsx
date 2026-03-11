'use client';

import { useState, useTransition } from 'react';
import { cn } from '@hockey-life/ui';
import {
  Trophy,
  Loader2,
  ChevronRight,
  CalendarPlus,
  Clock3,
  MapPin,
  X,
  Check,
} from 'lucide-react';
import {
  recordSeriesWin,
  schedulePlayoffGame,
  type PlayoffBracket,
  type PlayoffSeries,
  type PlayoffVenueOption,
} from '@/lib/actions/playoff-bracket';
import { PlayoffGenerationDialog } from './PlayoffGenerationDialog';

interface PlayoffBracketClientProps {
  leagueId: string;
  seasonId: string;
  initialBracket: PlayoffBracket | null;
  venues: PlayoffVenueOption[];
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

type BracketSection = {
  key: string;
  divisionId: string | null;
  divisionName: string | null;
  rounds: number;
  roundNumbers: number[];
  seriesByRound: Record<number, PlayoffSeries[]>;
  champion: PlayoffSeries | null;
};

function groupBracketSections(series: PlayoffSeries[]): BracketSection[] {
  const sections = new Map<string, BracketSection>();

  for (const entry of series) {
    const key = entry.division_id ?? 'overall';
    const existing = sections.get(key) ?? {
      key,
      divisionId: entry.division_id ?? null,
      divisionName: entry.division_name ?? null,
      rounds: 0,
      roundNumbers: [],
      seriesByRound: {},
      champion: null,
    };

    existing.rounds = Math.max(existing.rounds, entry.round_number);
    if (!existing.seriesByRound[entry.round_number]) {
      existing.seriesByRound[entry.round_number] = [];
      existing.roundNumbers.push(entry.round_number);
    }

    existing.seriesByRound[entry.round_number].push(entry);
    sections.set(key, existing);
  }

  return [...sections.values()]
    .map((section) => {
      for (const round of Object.keys(section.seriesByRound).map(Number)) {
        section.seriesByRound[round].sort((a, b) => a.series_number - b.series_number);
      }

      section.roundNumbers.sort((a, b) => a - b);
      section.champion = section.seriesByRound[section.rounds]?.find(
        (entry) => entry.status === 'completed' && entry.winner_id,
      ) ?? null;

      return section;
    })
    .sort((a, b) => {
      if (!a.divisionName && !b.divisionName) return 0;
      if (!a.divisionName) return -1;
      if (!b.divisionName) return 1;
      return a.divisionName.localeCompare(b.divisionName);
    });
}

function SeriesCard({
  series,
  canEdit,
  onRecordWin,
  onScheduleGame,
  isPending,
}: {
  series: PlayoffSeries;
  canEdit: boolean;
  onRecordWin: (seriesId: string, side: 'high' | 'low') => void;
  onScheduleGame: (seriesId: string, scheduledAt: string, location: string) => void;
  isPending: boolean;
}) {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleLocation, setScheduleLocation] = useState(series.next_game_location ?? '');
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const isCompleted = series.status === 'completed';
  const isActive = series.status === 'in_progress' || series.status === 'pending';
  const hasTeams = series.high_seed_id && series.low_seed_id;

  const highWon = isCompleted && series.winner_id === series.high_seed_id;
  const lowWon = isCompleted && series.winner_id === series.low_seed_id;

  const handleScheduleSubmit = () => {
    if (!scheduleDate || !scheduleTime) {
      setScheduleError('Date and time are required');
      return;
    }

    setScheduleError(null);
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    onScheduleGame(series.id, scheduledAt, scheduleLocation);
    setShowScheduleForm(false);
    setScheduleDate('');
    setScheduleTime('');
  };

  return (
    <div
      className={cn(
        'min-w-[220px] rounded-xl border p-3 transition-all',
        isCompleted
          ? 'border-white/20 bg-neutral-800/60'
          : hasTeams
            ? 'border-rink-500/40 bg-neutral-800/80'
            : 'border-white/10 bg-neutral-900/60',
      )}
    >
      <div
        className={cn(
          'mb-1 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5',
          highWon ? 'bg-rink-500/20' : 'bg-neutral-900/50',
        )}
      >
        <span
          className={cn(
            'flex-1 truncate text-sm font-medium',
            highWon ? 'font-semibold text-rink-400' : 'text-neutral-300',
            !series.high_seed_name && 'italic text-neutral-600',
          )}
        >
          {series.high_seed_name ?? 'TBD'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-5 text-center text-sm font-bold', highWon ? 'text-rink-400' : 'text-neutral-400')}>
            {series.high_seed_wins}
          </span>
          {highWon && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
          {canEdit && isActive && series.high_seed_id ? (
            <button
              onClick={() => onRecordWin(series.id, 'high')}
              disabled={isPending}
              className={cn(
                'ml-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors',
                'bg-rink-500/20 text-rink-400 hover:bg-rink-500/40 hover:text-rink-300',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              title="Record win for top seed"
            >
              +W
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-2 my-1 h-px bg-white/10" />

      <div
        className={cn(
          'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5',
          lowWon ? 'bg-rink-500/20' : 'bg-neutral-900/50',
        )}
      >
        <span
          className={cn(
            'flex-1 truncate text-sm font-medium',
            lowWon ? 'font-semibold text-rink-400' : 'text-neutral-300',
            !series.low_seed_name && 'italic text-neutral-600',
          )}
        >
          {series.low_seed_name ?? 'TBD'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-5 text-center text-sm font-bold', lowWon ? 'text-rink-400' : 'text-neutral-400')}>
            {series.low_seed_wins}
          </span>
          {lowWon && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
          {canEdit && isActive && series.low_seed_id ? (
            <button
              onClick={() => onRecordWin(series.id, 'low')}
              disabled={isPending}
              className={cn(
                'ml-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors',
                'bg-rink-500/20 text-rink-400 hover:bg-rink-500/40 hover:text-rink-300',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              title="Record win for bottom seed"
            >
              +W
            </button>
          ) : null}
        </div>
      </div>

      {isCompleted && series.winner_name ? (
        <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2">
          <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="truncate text-xs font-medium text-amber-400">
            {series.winner_name} advances
          </span>
        </div>
      ) : null}

      {series.next_game_at ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            <Clock3 className="h-3 w-3" />
            Next Game
          </div>
          <p className="mt-1 text-xs font-medium text-neutral-200">
            {new Date(series.next_game_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          {series.next_game_location ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
              <MapPin className="h-3 w-3" />
              {series.next_game_location}
            </p>
          ) : null}
        </div>
      ) : null}

      {canEdit && isActive && hasTeams && !showScheduleForm ? (
        <div className="mt-2 border-t border-white/10 pt-2">
          <button
            onClick={() => setShowScheduleForm(true)}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
              'bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200',
            )}
          >
            <CalendarPlus className="h-3 w-3" />
            {series.next_game_at ? 'Add Another Game' : 'Schedule Game'}
          </button>
        </div>
      ) : null}

      {showScheduleForm ? (
        <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400">Schedule Game</span>
            <button
              onClick={() => {
                setShowScheduleForm(false);
                setScheduleError(null);
              }}
              className="text-neutral-500 hover:text-neutral-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {scheduleError ? <p className="text-xs text-red-400">{scheduleError}</p> : null}
          <input
            type="date"
            value={scheduleDate}
            onChange={(event) => setScheduleDate(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-neutral-800 px-2 py-1.5 text-xs text-white focus:border-rink-500/50 focus:outline-none"
          />
          <input
            type="time"
            value={scheduleTime}
            onChange={(event) => setScheduleTime(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-neutral-800 px-2 py-1.5 text-xs text-white focus:border-rink-500/50 focus:outline-none"
          />
          <input
            type="text"
            value={scheduleLocation}
            onChange={(event) => setScheduleLocation(event.target.value)}
            placeholder="Venue"
            className="w-full rounded-lg border border-white/10 bg-neutral-800 px-2 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-rink-500/50 focus:outline-none"
          />
          <button
            onClick={handleScheduleSubmit}
            disabled={isPending}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
              'bg-rink-500/20 text-rink-400 hover:bg-rink-500/30 hover:text-rink-300',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Confirm
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PlayoffBracketClient({
  leagueId,
  seasonId,
  initialBracket,
  venues,
  canEdit,
}: PlayoffBracketClientProps) {
  const [bracket, setBracket] = useState<PlayoffBracket | null>(initialBracket);
  const [error, setError] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRecordWin = (seriesId: string, side: 'high' | 'low') => {
    setError(null);
    startTransition(async () => {
      const result = await recordSeriesWin(leagueId, seasonId, seriesId, side);
      if (!result.success) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  };

  const handleScheduleGame = (seriesId: string, scheduledAt: string, location: string) => {
    setError(null);
    startTransition(async () => {
      const result = await schedulePlayoffGame(leagueId, seasonId, seriesId, scheduledAt, location);
      if (!result.success) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  };

  if (!bracket) {
    return (
      <>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl bg-purple-500/10 p-4">
              <Trophy className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-bold text-white">No Playoff Bracket Yet</h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-neutral-400">
            Generate official playoff brackets for every division from the current standings, then schedule the opening-round games right away.
          </p>
          {error ? (
            <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
          ) : null}
          {canEdit ? (
            <button
              onClick={() => setGenerateDialogOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all',
                'bg-purple-500 text-white hover:bg-purple-400',
              )}
            >
              <Trophy className="h-4 w-4" />
              Generate Playoff Brackets
            </button>
          ) : null}
        </div>

        {generateDialogOpen ? (
          <PlayoffGenerationDialog
            open={generateDialogOpen}
            leagueId={leagueId}
            seasonId={seasonId}
            venues={venues}
            onOpenChange={setGenerateDialogOpen}
            onGenerated={(nextBracket) => {
              setBracket(nextBracket);
              setError(null);
            }}
          />
        ) : null}
      </>
    );
  }

  const sections = groupBracketSections(bracket.series);
  const hasDivisionSections = sections.filter((section) => section.divisionId).length > 0;
  const multipleSections = sections.length > 1;
  const openingSeriesCount = bracket.series.filter(
    (series) => series.round_number === 1 && Boolean(series.high_seed_id) && Boolean(series.low_seed_id),
  ).length;

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-2">
              <Trophy className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {multipleSections ? 'Playoff Brackets' : 'Playoff Bracket'}
              </h2>
              <p className="text-xs capitalize text-neutral-500">
                {bracket.format.replace(/_/g, ' ')} format
              </p>
            </div>
          </div>
          {canEdit ? (
            <button
              onClick={() => setGenerateDialogOpen(true)}
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 hover:text-white',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Regenerate & Schedule
            </button>
          ) : null}
        </div>

        {hasDivisionSections ? (
          <div className="mb-6 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
            Each division has its own official bracket. The opening round can be scheduled directly from league ice times or manually, and those playoff games flow through the normal scorekeeper and referee workflows.
          </div>
        ) : null}

        {openingSeriesCount > 0 ? (
          <div className="mb-6 rounded-xl border border-rink-500/30 bg-rink-500/5 px-4 py-3 text-sm text-rink-100">
            {openingSeriesCount} opening-round playoff matchup{openingSeriesCount === 1 ? '' : 's'} are live in the bracket.
            {' '}Schedule them here or use the regenerate flow if you want to rebuild the divisional field first.
          </div>
        ) : null}

        {!multipleSections && sections[0]?.champion?.winner_name ? (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <Trophy className="h-6 w-6 shrink-0 text-amber-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-amber-500">Champion</p>
              <p className="text-lg font-black text-amber-400">{sections[0].champion?.winner_name}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
        ) : null}

        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.key}
              className={cn(
                'rounded-2xl border border-white/10 bg-black/20 p-4',
                multipleSections && 'border-white/12',
              )}
            >
              {multipleSections || section.divisionName ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      {section.divisionName ? 'Division playoff bracket' : 'Bracket'}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-white">
                      {section.divisionName ?? 'Overall bracket'}
                    </h3>
                  </div>
                  {section.champion?.winner_name ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-500">
                        Champion
                      </p>
                      <p className="mt-1 text-sm font-bold text-amber-300">
                        {section.champion.winner_name}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <div className="flex min-w-max items-start gap-2 pb-2">
                  {section.roundNumbers.map((round, roundIdx) => {
                    const roundSeries = section.seriesByRound[round];
                    const label = getRoundLabel(round, section.rounds);
                    const isLast = roundIdx === section.roundNumbers.length - 1;

                    return (
                      <div key={`${section.key}-${round}`} className="flex items-start gap-2">
                        <div className="flex flex-col gap-2">
                          <div className="mb-2 text-center">
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                              {label}
                            </span>
                          </div>

                          <div
                            className="flex flex-col"
                            style={{ gap: `${Math.pow(2, roundIdx) * 8 + 8}px` }}
                          >
                            {roundSeries.map((series, seriesIdx) => (
                              <div
                                key={series.id}
                                style={{
                                  marginTop: roundIdx > 0 && seriesIdx % 2 === 0
                                    ? `${Math.pow(2, roundIdx - 1) * 8}px`
                                    : '0px',
                                }}
                              >
                                <SeriesCard
                                  series={series}
                                  canEdit={canEdit}
                                  onRecordWin={handleRecordWin}
                                  onScheduleGame={handleScheduleGame}
                                  isPending={isPending}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {!isLast ? (
                          <div
                            className="mt-10 flex items-center"
                            style={{ height: `${Math.pow(2, roundIdx + 1) * 40}px` }}
                          >
                            <ChevronRight className="h-4 w-4 text-neutral-600" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {generateDialogOpen ? (
        <PlayoffGenerationDialog
          open={generateDialogOpen}
          leagueId={leagueId}
          seasonId={seasonId}
          venues={venues}
          onOpenChange={setGenerateDialogOpen}
          onGenerated={(nextBracket) => {
            setBracket(nextBracket);
            setError(null);
          }}
        />
      ) : null}
    </>
  );
}
