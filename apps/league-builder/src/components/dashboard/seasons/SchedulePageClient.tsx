'use client';

/**
 * Schedule Page Client Component
 *
 * Client-side interactivity for schedule management.
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Calendar, List, Grid, CloudOff, AlertTriangle } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import { ScheduleWizard } from '@/components/schedule-wizard';
import { ScheduleCalendar } from '@/components/schedule-wizard/ScheduleCalendar';
import { GameReschedulePanel } from '@/components/dashboard/seasons/GameReschedulePanel';
import { GameDetailSheet } from '@/components/dashboard/seasons/GameDetailSheet';
import { saveScheduleGames } from '@/lib/schedule/actions';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/dialog';
import type { Team, Venue, ScheduledGame, ScheduleTemplate, ScheduleGenerationResult } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface SchedulePageClientProps {
  seasonId: string;
  leagueId: string;
  teams: Team[];
  venues: Venue[];
  existingGames: ScheduledGame[];
  templates: ScheduleTemplate[];
  startDate: Date;
  endDate: Date;
  hasExistingSchedule: boolean;
}

type ViewMode = 'calendar' | 'list';

// ============================================================================
// STATUS BADGE
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/10 text-green-400 border-green-500/30',
  },
  postponed: {
    label: 'Postponed',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
};

function GameStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SchedulePageClient({
  seasonId,
  leagueId,
  teams,
  venues,
  existingGames,
  templates,
  startDate,
  endDate,
  hasExistingSchedule,
}: SchedulePageClientProps) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [games, setGames] = useState<ScheduledGame[]>(existingGames);
  const [isSaving, setIsSaving] = useState(false);
  const [showReschedulePanel, setShowReschedulePanel] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [selectedGame, setSelectedGame] = useState<ScheduledGame | null>(null);
  const [showGameDetail, setShowGameDetail] = useState(false);

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));

  const postponedCount = useMemo(
    () => games.filter((g) => g.status === 'postponed').length,
    [games]
  );

  // Handle wizard completion
  const handleWizardComplete = useCallback(
    async (result: ScheduleGenerationResult) => {
      if (!result.success) {
        return;
      }

      setIsSaving(true);
      try {
        const saveResult = await saveScheduleGames(seasonId, leagueId, result.games, result.logId);
        if (saveResult.success) {
          setGames(result.games);
          setShowWizard(false);
          router.refresh();
        }
      } finally {
        setIsSaving(false);
      }
    },
    [seasonId, leagueId, router]
  );

  // No teams warning
  if (teams.length < 4) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
        <Calendar className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-yellow-400">Not Enough Teams</h2>
        <p className="text-yellow-400/80 mt-2">
          You need at least 4 teams to generate a schedule. Currently you have {teams.length} team
          {teams.length !== 1 ? 's' : ''}.
        </p>
        <button
          onClick={() => router.push(`/dashboard/teams`)}
          className="mt-4 px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400 transition-colors"
        >
          Add Teams
        </button>
      </div>
    );
  }

  // Wizard Modal
  if (showWizard) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-4xl h-[90vh] flex flex-col">
          <ScheduleWizard
            seasonId={seasonId}
            leagueId={leagueId}
            teams={teams}
            venues={venues}
            templates={templates}
            startDate={startDate}
            endDate={endDate}
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              viewMode === 'calendar'
                ? 'bg-rink-500/10 text-rink-500'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            )}
          >
            <Grid className="w-4 h-4" />
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              viewMode === 'list'
                ? 'bg-rink-500/10 text-rink-500'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            )}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Manage Cancellations */}
          {hasExistingSchedule && (
            <button
              onClick={() => setShowReschedulePanel(true)}
              className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              <CloudOff className="w-4 h-4" />
              Manage Cancellations
              {postponedCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {postponedCount}
                </span>
              )}
            </button>
          )}

          {/* Regenerate All */}
          {hasExistingSchedule && (
            <button
              onClick={() => setShowRegenerateConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate All
            </button>
          )}
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {hasExistingSchedule ? 'New Schedule' : 'Generate Schedule'}
          </button>
        </div>
      </div>

      {/* Content */}
      {games.length === 0 ? (
        <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-12 text-center">
          <Calendar className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">No Schedule Generated</h2>
          <p className="text-neutral-400 mt-2 max-w-md mx-auto">
            Generate a schedule to assign games to dates and times. You can customize game days,
            times, and add constraints for teams or venues.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-6 px-6 py-3 bg-rink-500 text-black rounded-lg font-medium hover:bg-rink-600 transition-colors"
          >
            Generate Schedule
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <ScheduleCalendar
          games={games}
          teams={teams}
          onGameClick={(game) => {
            setSelectedGame(game);
            setShowGameDetail(true);
          }}
        />
      ) : (
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                    Home
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-neutral-400 uppercase">
                    vs
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                    Away
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                    Round
                  </th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, index) => (
                  <tr
                    key={game.id ?? index}
                    onClick={() => {
                      setSelectedGame(game);
                      setShowGameDetail(true);
                    }}
                    className={cn(
                      'border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50 transition-colors cursor-pointer',
                      game.status === 'cancelled' && 'opacity-50',
                      game.status === 'postponed' && 'bg-yellow-500/[0.02]'
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-white">
                      {game.scheduledAt.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">
                      {game.scheduledAt.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {teamsById[game.homeTeamId]?.name ?? 'Unknown'}
                      {game.status === 'completed' && game.homeScore != null && (
                        <span className="ml-2 text-green-400 font-bold">{game.homeScore}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-neutral-500">
                      {game.status === 'completed' &&
                      game.homeScore != null &&
                      game.awayScore != null
                        ? '-'
                        : 'vs'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {game.status === 'completed' && game.awayScore != null && (
                        <span className="mr-2 text-green-400 font-bold">{game.awayScore}</span>
                      )}
                      {teamsById[game.awayTeamId]?.name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">{game.location}</td>
                    <td className="px-4 py-3">
                      <GameStatusBadge status={game.status ?? 'scheduled'} />
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">Round {game.roundNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regenerate All Confirmation Dialog */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent className="bg-neutral-800 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Regenerate Entire Schedule?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              This will replace all unplayed games. Completed games will be preserved.
              Use &apos;Manage Cancellations&apos; to reschedule individual games.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRegenerateConfirm(false);
                setShowWizard(true);
              }}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              Yes, Regenerate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Game Reschedule Panel */}
      <GameReschedulePanel
        open={showReschedulePanel}
        onOpenChange={setShowReschedulePanel}
        games={games}
        teams={teams}
        onGamesUpdated={() => router.refresh()}
      />

      {/* Game Detail Sheet */}
      <GameDetailSheet
        open={showGameDetail}
        onOpenChange={setShowGameDetail}
        game={selectedGame}
        teams={teams}
        onGameUpdated={() => router.refresh()}
      />
    </div>
  );
}
