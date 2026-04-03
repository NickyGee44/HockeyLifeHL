'use client';

import { useMemo, useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { ScheduleGenerationResult, Team } from '@/lib/schedule/types';
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

interface SchedulePublishStepProps {
  result: ScheduleGenerationResult;
  teams: Team[];
  isSaving: boolean;
  hasExistingSchedule?: boolean;
  onPublish: () => void;
}

export function SchedulePublishStep({
  result,
  teams,
  isSaving,
  hasExistingSchedule = false,
  onPublish,
}: SchedulePublishStepProps) {
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.id, team])),
    [teams]
  );

  const sortedGames = useMemo(
    () => [...result.games].sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime()),
    [result.games]
  );

  const firstGame = sortedGames[0];
  const lastGame = sortedGames[sortedGames.length - 1];

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-400" />
        <h3 className="text-lg font-bold text-red-300">No draft available</h3>
        <p className="mt-1 text-sm text-red-200/80">
          {result.error ?? 'Go back and adjust the setup before publishing.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-white">Publish your schedule</h3>
        <p className="text-sm text-neutral-400">
          The draft is built. Confirm the basics one more time, then publish it for the season.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
        <h4 className="text-lg font-bold text-emerald-300">Draft ready</h4>
        <p className="mt-1 text-sm text-emerald-200/80">
          {result.totalGames} games placed in {result.durationMs}ms
        </p>
      </div>

      {firstGame && lastGame && (
        <div className="rounded-xl border border-white/10 bg-neutral-800/40 p-4 text-sm text-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-neutral-500">First game: </span>
              {firstGame.scheduledAt.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div>
              <span className="text-neutral-500">Last game: </span>
              {lastGame.scheduledAt.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-neutral-800/40 p-4">
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
            This draft has {result.constraintViolations.length} soft warning
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

            onPublish();
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

      <AlertDialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the current schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Publishing this draft will replace the existing schedule for this season.
              Continue only if you are ready to overwrite it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current schedule</AlertDialogCancel>
            <AlertDialogAction onClick={onPublish}>Replace schedule</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
