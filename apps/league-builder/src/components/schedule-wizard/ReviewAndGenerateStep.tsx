'use client';

/**
 * Review & Generate Step
 *
 * Uses the server-side readiness report before generation and keeps the
 * generated schedule as a draft until the owner explicitly publishes it.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';
import type {
  AdditionalIceSlot,
  ScheduleConfig,
  ScheduleGenerationResult,
  ScheduleReadinessIssue,
  ScheduleReadinessReport,
  Team,
  Venue,
} from '@/lib/schedule/types';
import { generateSeasonSchedule, getScheduleReadinessReport } from '@/lib/schedule/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog';

interface ReviewAndGenerateStepProps {
  seasonId: string;
  leagueId: string;
  config: ScheduleConfig;
  teams: Team[];
  venues: Venue[];
  templateId: string | null;
  additionalIceSlots: AdditionalIceSlot[];
  onResult: (result: ScheduleGenerationResult) => void;
  onSave: () => void;
  isSaving: boolean;
  hasExistingSchedule?: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function IssueList({
  issues,
  tone,
}: {
  issues: ScheduleReadinessIssue[];
  tone: 'warning' | 'error';
}) {
  if (issues.length === 0) return null;

  const styles =
    tone === 'error'
      ? {
          wrapper: 'border-red-500/30 bg-red-500/10',
          icon: 'text-red-400',
          title: 'text-red-300',
          body: 'text-red-200/80',
        }
      : {
          wrapper: 'border-amber-500/30 bg-amber-500/10',
          icon: 'text-amber-400',
          title: 'text-amber-300',
          body: 'text-amber-200/80',
        };

  return (
    <div className={cn('rounded-xl border p-4', styles.wrapper)}>
      <div className="flex items-center gap-2">
        <AlertTriangle className={cn('h-4 w-4', styles.icon)} />
        <p className={cn('text-sm font-semibold', styles.title)}>
          {tone === 'error' ? 'Fix before generating' : 'Heads up before publishing'}
        </p>
      </div>
      <ul className={cn('mt-3 space-y-2 text-sm', styles.body)}>
        {issues.map((issue) => (
          <li key={`${issue.code}-${issue.message}`}>• {issue.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewAndGenerateStep({
  seasonId,
  leagueId,
  config,
  teams,
  venues,
  templateId,
  additionalIceSlots,
  onResult,
  onSave,
  isSaving,
  hasExistingSchedule = false,
}: ReviewAndGenerateStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(true);
  const [readiness, setReadiness] = useState<ScheduleReadinessReport | null>(null);
  const [result, setResult] = useState<ScheduleGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const teamsById = useMemo(() => Object.fromEntries(teams.map((team) => [team.id, team])), [teams]);
  const venuesById = useMemo(() => Object.fromEntries(venues.map((venue) => [venue.id, venue])), [venues]);

  useEffect(() => {
    let cancelled = false;

    async function loadReadiness() {
      setIsCheckingReadiness(true);
      try {
        const report = await getScheduleReadinessReport(
          seasonId,
          leagueId,
          config,
          additionalIceSlots.length > 0 ? additionalIceSlots : undefined
        );

        if (!cancelled) {
          setReadiness(report);
        }
      } catch (readinessError) {
        if (!cancelled) {
          setError(
            readinessError instanceof Error
              ? readinessError.message
              : 'Unable to validate the schedule setup.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsCheckingReadiness(false);
        }
      }
    }

    loadReadiness();

    return () => {
      cancelled = true;
    };
  }, [seasonId, leagueId, config, additionalIceSlots]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const generationResult = await generateSeasonSchedule(
        seasonId,
        leagueId,
        config,
        templateId ?? undefined,
        additionalIceSlots.length > 0 ? additionalIceSlots : undefined
      );

      setResult(generationResult);
      onResult(generationResult);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Failed to generate the schedule draft.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [seasonId, leagueId, config, templateId, additionalIceSlots, onResult]);

  const sortedGames = useMemo(
    () =>
      result
        ? [...result.games].sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())
        : [],
    [result]
  );

  const firstGame = sortedGames[0];
  const lastGame = sortedGames[sortedGames.length - 1];

  const canGenerate =
    !isCheckingReadiness &&
    !isGenerating &&
    (readiness?.blockers.length ?? 0) === 0 &&
    teams.length >= 4;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-white">
          {result?.success ? 'Draft ready to publish' : 'Review and build your draft'}
        </h3>
        <p className="text-sm text-neutral-400">
          {result?.success
            ? 'Look over the draft, then publish it when you are ready.'
            : 'Check the real slot capacity, warnings, and conflicts before generating.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-rink-500" />
          <div className="text-xl font-bold text-white">
            {readiness?.seasonTeamCount ?? teams.length}
          </div>
          <div className="text-xs text-neutral-400">Season teams</div>
        </div>
        <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
          <Calendar className="mx-auto mb-1 h-5 w-5 text-rink-500" />
          <div className="text-xl font-bold text-white">
            {result?.totalGames ?? readiness?.matchupCount ?? 0}
          </div>
          <div className="text-xs text-neutral-400">Games to place</div>
        </div>
        <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
          <Clock className="mx-auto mb-1 h-5 w-5 text-rink-500" />
          <div
            className={cn(
              'text-xl font-bold',
              readiness && readiness.blockers.length === 0 ? 'text-emerald-400' : 'text-amber-400'
            )}
          >
            {isCheckingReadiness ? '...' : readiness?.slotCapacity ?? 0}
          </div>
          <div className="text-xs text-neutral-400">Usable slots</div>
        </div>
        <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
          <MapPin className="mx-auto mb-1 h-5 w-5 text-rink-500" />
          <div className="text-xl font-bold text-white">{venues.length}</div>
          <div className="text-xs text-neutral-400">Venues</div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-800/40 p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-neutral-500">Who plays who</dt>
            <dd className="text-white capitalize">{config.scheduleType.replaceAll('_', ' ')}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Games per team</dt>
            <dd className="text-white">{config.gamesPerTeam}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Game nights</dt>
            <dd className="text-white">{config.gameDays.map((day) => DAY_NAMES[day]).join(', ')}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Ice times</dt>
            <dd className="text-white">{config.gameTimes.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Season range</dt>
            <dd className="text-white">
              {new Date(config.startDate).toLocaleDateString()} - {new Date(config.endDate).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Default venue</dt>
            <dd className="text-white">
              {config.defaultVenueId ? venuesById[config.defaultVenueId]?.name ?? 'Unknown' : 'First available venue'}
            </dd>
          </div>
        </dl>
      </div>

      {isCheckingReadiness && (
        <div className="rounded-xl border border-rink-500/20 bg-rink-500/10 p-4 text-sm text-rink-300">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking real venue capacity, blackout rules, and team participation...
          </div>
        </div>
      )}

      {readiness && <IssueList issues={readiness.blockers} tone="error" />}
      {readiness && <IssueList issues={readiness.warnings} tone="warning" />}

      {!result && !isGenerating && (
        <div className="py-2 text-center">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-rink-500 px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-rink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Calendar className="h-5 w-5" />
            Build draft schedule
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="rounded-xl border border-rink-500/30 bg-rink-500/10 p-6 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-rink-500" />
          <p className="font-medium text-rink-400">Building your draft schedule...</p>
          <p className="mt-1 text-sm text-rink-400/80">This uses the same readiness and slot model you just reviewed.</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-300">Draft generation failed</p>
              <p className="mt-1 text-sm text-red-200/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result?.success && (
        <>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
            <h4 className="text-lg font-bold text-emerald-300">Draft ready</h4>
            <p className="mt-1 text-sm text-emerald-200/80">
              {result.totalGames} games placed in {result.durationMs}ms
            </p>
          </div>

          {firstGame && lastGame && (
            <div className="flex items-center justify-between rounded-xl bg-neutral-800/50 p-3 text-sm">
              <div>
                <span className="text-neutral-500">First game: </span>
                <span className="text-white">
                  {firstGame.scheduledAt.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Last game: </span>
                <span className="text-white">
                  {lastGame.scheduledAt.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-neutral-800 bg-neutral-800/40 p-4">
            <h4 className="mb-3 text-sm font-medium text-neutral-300">First few games</h4>
            <div className="space-y-2">
              {sortedGames.slice(0, 5).map((game, index) => (
                <div
                  key={`${game.homeTeamId}-${game.awayTeamId}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-neutral-900/60 p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-28 text-neutral-400">
                      {game.scheduledAt.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="w-16 text-neutral-500">
                      {game.scheduledAt.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-medium text-white">
                      {teamsById[game.homeTeamId]?.name ?? 'Unknown'}
                    </span>
                    <span className="text-neutral-500">vs</span>
                    <span className="font-medium text-white">
                      {teamsById[game.awayTeamId]?.name ?? 'Unknown'}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">{game.location}</span>
                </div>
              ))}
            </div>
          </div>

          {result.constraintViolations.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-300">
                This draft still has {result.constraintViolations.length} soft warning
                {result.constraintViolations.length === 1 ? '' : 's'}.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-200/80">
                {result.constraintViolations.slice(0, 5).map((violation, index) => (
                  <li key={`${violation.constraintId}-${index}`}>• {violation.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="py-2 text-center">
            <button
              onClick={() => {
                if (hasExistingSchedule) {
                  setShowReplaceConfirm(true);
                  return;
                }
                onSave();
              }}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-rink-500 px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-rink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  {hasExistingSchedule ? 'Replace existing schedule' : 'Publish schedule'}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {result && !result.success && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-400" />
          <h4 className="text-lg font-bold text-red-300">Unable to build a draft</h4>
          <p className="mt-1 text-sm text-red-200/80">
            {result.error ?? 'The current setup could not produce a valid schedule.'}
          </p>
        </div>
      )}

      <AlertDialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the current schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Publishing this draft will replace the existing schedule for this season.
              Make sure you are ready before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current schedule</AlertDialogCancel>
            <AlertDialogAction onClick={onSave}>Replace schedule</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
