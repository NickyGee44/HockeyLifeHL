'use client';

/**
 * Schedule Page Client Component
 *
 * Client-side interactivity for schedule management.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Calendar, List, Grid } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import { ScheduleWizard } from '@/components/schedule-wizard';
import { ScheduleCalendar } from '@/components/schedule-wizard/ScheduleCalendar';
import { saveScheduleGames } from '@/lib/schedule/actions';
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

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));

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
          {hasExistingSchedule && (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-300 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
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
            console.log('Game clicked:', game);
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
                    Round
                  </th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, index) => (
                  <tr
                    key={game.id ?? index}
                    className="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50 transition-colors"
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
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-neutral-500">vs</td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {teamsById[game.awayTeamId]?.name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">{game.location}</td>
                    <td className="px-4 py-3 text-sm text-neutral-400">Round {game.roundNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
