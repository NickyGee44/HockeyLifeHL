'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, Sparkles, Trophy, CalendarClock, CalendarPlus2 } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import {
  applySuggestedDivisionBalanceMoves,
  autoScheduleOpeningPlayoffGames,
  generatePlayoffBracket,
  getPlayoffGenerationPreview,
  scheduleOpeningPlayoffGames,
  type PlayoffBracket,
  type PlayoffSeries,
  type PlayoffVenueOption,
} from '@/lib/actions/playoff-bracket';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ManualScheduleRow = {
  seriesId: string;
  date: string;
  time: string;
  venueId: string;
};

interface PlayoffGenerationDialogProps {
  open: boolean;
  leagueId: string;
  seasonId: string;
  venues: PlayoffVenueOption[];
  onOpenChange: (open: boolean) => void;
  onGenerated: (bracket: PlayoffBracket) => void;
}

function getDefaultStartDate() {
  return new Date().toISOString().split('T')[0];
}

function buildInitialRows(series: PlayoffSeries[], venues: PlayoffVenueOption[]): ManualScheduleRow[] {
  return series.map((entry) => ({
    seriesId: entry.id,
    date: '',
    time: '',
    venueId: venues[0]?.id ?? '',
  }));
}

export function PlayoffGenerationDialog({
  open,
  leagueId,
  seasonId,
  venues,
  onOpenChange,
  onGenerated,
}: PlayoffGenerationDialogProps) {
  const [step, setStep] = useState<'balance' | 'schedule'>('balance');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [generationLoading, startGenerationTransition] = useTransition();
  const [scheduleLoading, startScheduleTransition] = useTransition();
  const [balanceRecommendations, setBalanceRecommendations] = useState<
    Array<{
      teamId: string;
      teamName: string;
      fromDivisionName: string;
      toDivisionName: string;
      reason: string;
      impact: number;
    }>
  >([]);
  const [generatedBracket, setGeneratedBracket] = useState<PlayoffBracket | null>(null);
  const [openingSeries, setOpeningSeries] = useState<PlayoffSeries[]>([]);
  const [autoScheduleStartDate, setAutoScheduleStartDate] = useState(getDefaultStartDate);
  const [manualRows, setManualRows] = useState<ManualScheduleRow[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void getPlayoffGenerationPreview(leagueId, seasonId)
      .then((result) => {
        if (!result.success) {
          setBalanceRecommendations([]);
          return;
        }

        setBalanceRecommendations(result.data.recommendations);
      })
      .finally(() => setPreviewLoading(false));
  }, [open, leagueId, seasonId]);

  const handleGenerate = (applyBalance: boolean) => {
    setError(null);
    setStatusMessage(null);

    startGenerationTransition(async () => {
      if (applyBalance && balanceRecommendations.length > 0) {
        const balanceResult = await applySuggestedDivisionBalanceMoves(leagueId, seasonId);
        if (!balanceResult.success) {
          setError(balanceResult.error);
          return;
        }

        if (balanceResult.data.appliedCount > 0) {
          setStatusMessage(`Applied ${balanceResult.data.appliedCount} suggested division move${balanceResult.data.appliedCount === 1 ? '' : 's'} before generating playoffs.`);
        }
      }

      const bracketResult = await generatePlayoffBracket(leagueId, seasonId, {
        forceDivisionPlayoffs: true,
      });

      if (!bracketResult.success) {
        setError(bracketResult.error);
        return;
      }

      setGeneratedBracket(bracketResult.data.bracket);
      setOpeningSeries(bracketResult.data.openingSeries);
      setManualRows(buildInitialRows(bracketResult.data.openingSeries, venues));
      onGenerated(bracketResult.data.bracket);
      setStep('schedule');
      setStatusMessage(
        bracketResult.data.usedDivisionPlayoffs
          ? 'Official playoff brackets were generated for every division. Next, schedule the opening games.'
          : 'The playoff bracket is ready. Next, schedule the opening games.',
      );
    });
  };

  const handleAutoSchedule = () => {
    setError(null);
    setStatusMessage(null);

    startScheduleTransition(async () => {
      const result = await autoScheduleOpeningPlayoffGames(
        leagueId,
        seasonId,
        autoScheduleStartDate,
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      const unscheduled = result.data.unscheduledSeries.length;
      setStatusMessage(
        unscheduled > 0
          ? `Scheduled ${result.data.scheduled} opening playoff games. ${unscheduled} series still need manual times.`
          : `Scheduled ${result.data.scheduled} opening playoff games from your league ice times.`,
      );

      window.location.reload();
    });
  };

  const handleManualSchedule = () => {
    setError(null);
    setStatusMessage(null);

    const schedules = manualRows
      .filter((row) => row.date && row.time && row.venueId)
      .map((row) => {
        const venue = venues.find((entry) => entry.id === row.venueId);
        return {
          seriesId: row.seriesId,
          scheduledAt: new Date(`${row.date}T${row.time}`).toISOString(),
          venueId: row.venueId,
          location: venue?.name ?? '',
        };
      });

    startScheduleTransition(async () => {
      const result = await scheduleOpeningPlayoffGames(leagueId, seasonId, schedules);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setStatusMessage(
        result.data.skippedSeries.length > 0
          ? `Scheduled ${result.data.scheduled} opening playoff games. Some series were skipped because they already had games scheduled.`
          : `Scheduled ${result.data.scheduled} opening playoff games.`,
      );
      window.location.reload();
    });
  };

  const updateManualRow = (seriesId: string, field: keyof ManualScheduleRow, value: string) => {
    setManualRows((previous) =>
      previous.map((row) =>
        row.seriesId === seriesId
          ? { ...row, [field]: value }
          : row,
      ),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-white/10 bg-neutral-950 p-0 text-white sm:max-h-[90vh] sm:w-full">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-white">
            {step === 'balance' ? <Sparkles className="h-5 w-5 text-rink-400" /> : <Trophy className="h-5 w-5 text-purple-400" />}
            {step === 'balance' ? 'Generate Playoffs' : 'Schedule Opening Playoff Games'}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {step === 'balance'
              ? 'Before the bracket is created, review whether any division balance moves should be made.'
              : 'Use your league ice schedule or enter game times manually for the opening playoff round.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 pb-4">
          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {statusMessage}
            </div>
          ) : null}

          <div className={cn('space-y-4', error || statusMessage ? 'mt-4' : null)}>
            {step === 'balance' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                        Division balance check
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        Generate playoff brackets for every division
                      </h3>
                    </div>
                    {previewLoading ? <Loader2 className="h-5 w-5 animate-spin text-neutral-500" /> : null}
                  </div>
                  <p className="mt-3 text-sm text-neutral-400">
                    BLH will create an official bracket for each division, then take you straight into scheduling the opening playoff games.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-rink-400" />
                    <h3 className="text-sm font-semibold text-white">Suggested balance moves</h3>
                  </div>

                  {previewLoading ? (
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading playoff prep suggestions...
                    </div>
                  ) : balanceRecommendations.length === 0 ? (
                    <p className="text-sm text-neutral-400">
                      No strong division-balance moves are suggested right now. You can generate the divisional brackets as-is.
                    </p>
                  ) : (
                    <div className="max-h-[min(26rem,45vh)] space-y-3 overflow-y-auto pr-1">
                      {balanceRecommendations.map((recommendation) => (
                        <div key={recommendation.teamId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-white">{recommendation.teamName}</span>
                            <span className="text-neutral-500">from</span>
                            <span className="text-neutral-300">{recommendation.fromDivisionName}</span>
                            <span className="text-neutral-500">to</span>
                            <span className="text-rink-300">{recommendation.toDivisionName}</span>
                            <span className="rounded-full bg-rink-500/10 px-2 py-0.5 text-[11px] font-semibold text-rink-300">
                              impact {recommendation.impact.toFixed(1)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-neutral-500">
                            {recommendation.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-purple-300" />
                    <h3 className="text-sm font-semibold text-white">Bracket ready</h3>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">
                    {generatedBracket
                      ? `${generatedBracket.series.length} playoff series were created. Schedule the opening round now so scorekeepers, referees, and the public playoffs page all work from the live bracket.`
                      : 'The playoff bracket is ready. Schedule the opening round now.'}
                  </p>
                </div>

                {openingSeries.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">
                    All current opening-round series already have games scheduled, or there are no ready matchups yet.
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-rink-400" />
                        <h3 className="text-sm font-semibold text-white">Use league ice times</h3>
                      </div>
                      <p className="mb-3 text-sm text-neutral-400">
                        Auto-assign the opening playoff series to your recurring venue schedule, starting on the date you choose below.
                      </p>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="flex-1 text-sm text-neutral-400">
                          Start scheduling on
                          <input
                            type="date"
                            value={autoScheduleStartDate}
                            onChange={(event) => setAutoScheduleStartDate(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-white"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoSchedule}
                          disabled={scheduleLoading}
                          className={cn(
                            'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                            'bg-rink-500 text-black hover:bg-rink-400 disabled:opacity-50',
                          )}
                        >
                          {scheduleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus2 className="h-4 w-4" />}
                          Auto-schedule opening games
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-neutral-300" />
                        <h3 className="text-sm font-semibold text-white">Or enter them manually</h3>
                      </div>
                      <div className="space-y-3">
                        {openingSeries.map((series) => {
                          const row = manualRows.find((entry) => entry.seriesId === series.id);
                          const matchup = `${series.high_seed_name ?? 'TBD'} vs ${series.low_seed_name ?? 'TBD'}`;
                          return (
                            <div key={series.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="mb-3">
                                <p className="text-sm font-semibold text-white">{matchup}</p>
                                <p className="text-xs text-neutral-500">
                                  {series.division_name ?? 'Overall bracket'} • Round {series.round_number} • Series {series.series_number}
                                </p>
                              </div>
                              <div className="grid gap-3 md:grid-cols-3">
                                <input
                                  type="date"
                                  value={row?.date ?? ''}
                                  onChange={(event) => updateManualRow(series.id, 'date', event.target.value)}
                                  className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
                                />
                                <input
                                  type="time"
                                  value={row?.time ?? ''}
                                  onChange={(event) => updateManualRow(series.id, 'time', event.target.value)}
                                  className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
                                />
                                <select
                                  value={row?.venueId ?? ''}
                                  onChange={(event) => updateManualRow(series.id, 'venueId', event.target.value)}
                                  className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white"
                                >
                                  <option value="">Select venue</option>
                                  {venues.map((venue) => (
                                    <option key={venue.id} value={venue.id}>
                                      {venue.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleManualSchedule}
                          disabled={scheduleLoading || manualRows.every((row) => !row.date || !row.time || !row.venueId)}
                          className={cn(
                            'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                            'bg-neutral-100 text-neutral-900 hover:bg-white disabled:opacity-50',
                          )}
                        >
                          {scheduleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus2 className="h-4 w-4" />}
                          Save manual opening games
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 px-6 py-4 sm:justify-between">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
          >
            {step === 'schedule' ? 'Close for now' : 'Cancel'}
          </button>

          {step === 'balance' ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={generationLoading}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white disabled:opacity-50"
              >
                {generationLoading ? 'Generating...' : 'Continue without balancing'}
              </button>
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={generationLoading}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                  'bg-rink-500 text-black hover:bg-rink-400 disabled:opacity-50',
                )}
              >
                {generationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {balanceRecommendations.length > 0 ? 'Apply moves and generate' : 'Generate divisional playoffs'}
              </button>
            </div>
          ) : (
            <div className="text-xs text-neutral-500">
              {openingSeries.length > 0
                ? `${openingSeries.length} opening-round matchup${openingSeries.length === 1 ? '' : 's'} ready for scheduling.`
                : 'No opening-round games need scheduling right now.'}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
