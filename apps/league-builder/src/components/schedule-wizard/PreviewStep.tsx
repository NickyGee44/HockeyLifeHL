'use client';

/**
 * Preview Step
 *
 * Third step for previewing and generating the schedule.
 */

import { useEffect, useCallback, useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Calendar, Clock, Users, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import type { ScheduleConfig, ScheduleGenerationResult, Team, AdditionalIceSlot } from '@/lib/schedule/types';
import { generateSeasonSchedule } from '@/lib/schedule/actions';

// ============================================================================
// TYPES
// ============================================================================

interface PreviewStepProps {
  seasonId: string;
  leagueId: string;
  config: ScheduleConfig;
  teams: Team[];
  templateId: string | null;
  additionalIceSlots: AdditionalIceSlot[];
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  onResult: (result: ScheduleGenerationResult) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// COMPONENT
// ============================================================================

export function PreviewStep({
  seasonId,
  leagueId,
  config,
  teams,
  templateId,
  additionalIceSlots,
  isGenerating,
  setIsGenerating,
  onResult,
}: PreviewStepProps) {
  const [previewResult, setPreviewResult] = useState<ScheduleGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate schedule info
  const gamesPerRound = Math.floor(teams.length / 2);
  const rounds = teams.length % 2 === 0 ? teams.length - 1 : teams.length;
  const multiplier = config.scheduleType === 'double_round_robin' ? 2 : 1;
  const totalGames = gamesPerRound * rounds * multiplier;

  // Calculate available slots
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const gameDaysPerWeek = config.gameDays.length;
  const slotsPerDay = config.gameTimes.length;
  const totalWeeks = Math.ceil(daysDiff / 7);
  const availableSlots = totalWeeks * gameDaysPerWeek * slotsPerDay;

  // Generate schedule when user clicks generate
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateSeasonSchedule(
        seasonId,
        leagueId,
        config,
        templateId ?? undefined,
        additionalIceSlots.length > 0 ? additionalIceSlots : undefined
      );
      setPreviewResult(result);
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule');
      setIsGenerating(false);
    }
  }, [seasonId, leagueId, config, templateId, additionalIceSlots, setIsGenerating, onResult]);

  // Auto-generate when isGenerating becomes true
  useEffect(() => {
    if (isGenerating && !previewResult) {
      handleGenerate(); // eslint-disable-line -- trigger generation when parent sets isGenerating
    }
  }, [isGenerating, previewResult, handleGenerate]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Schedule Preview</h3>
        <p className="text-sm text-neutral-400">
          Review your configuration before generating the schedule.
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <Users className="w-4 h-4" />
            Teams
          </div>
          <div className="text-2xl font-bold text-white">{teams.length}</div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <Calendar className="w-4 h-4" />
            Total Games
          </div>
          <div className="text-2xl font-bold text-white">{totalGames}</div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Available Slots
          </div>
          <div className={cn('text-2xl font-bold', availableSlots >= totalGames ? 'text-green-500' : 'text-red-500')}>
            {availableSlots}
          </div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
            Schedule Type
          </div>
          <div className="text-lg font-bold text-white capitalize">
            {config.scheduleType.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Slot Warning */}
      {availableSlots < totalGames && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Not enough time slots</p>
            <p className="text-sm text-yellow-400/80 mt-1">
              You need {totalGames} slots but only have {availableSlots} available. Consider adding more game days or times, or extending the season dates.
            </p>
          </div>
        </div>
      )}

      {/* Configuration Details */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-neutral-300 mb-3">Schedule Configuration</h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">Date Range</dt>
            <dd className="text-white">
              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Game Days</dt>
            <dd className="text-white">{config.gameDays.map((d) => DAY_NAMES[d]).join(', ')}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Game Times</dt>
            <dd className="text-white">{config.gameTimes.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Game Duration</dt>
            <dd className="text-white">{config.gameDurationMinutes} minutes</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Home/Away Balance</dt>
            <dd className="text-white">{config.homeAwayBalance ? 'Enabled' : 'Disabled'}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Back-to-Back Games</dt>
            <dd className="text-white">{config.allowBackToBack ? 'Allowed' : 'Not Allowed'}</dd>
          </div>
        </dl>
      </div>

      {/* Teams List */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-neutral-300 mb-3">Teams ({teams.length})</h4>
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <span
              key={team.id}
              className="px-3 py-1 bg-neutral-700 rounded-full text-sm text-white"
            >
              {team.name}
            </span>
          ))}
        </div>
      </div>

      {/* Generation Status */}
      {isGenerating && (
        <div className="p-6 bg-rink-500/10 border border-rink-500/30 rounded-lg text-center">
          <Loader2 className="w-8 h-8 text-rink-500 mx-auto mb-3 animate-spin" />
          <p className="text-rink-400 font-medium">Generating Schedule...</p>
          <p className="text-sm text-rink-400/80 mt-1">
            This may take a few seconds depending on the number of teams and constraints.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Generation Failed</p>
            <p className="text-sm text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Ready State */}
      {!isGenerating && !error && availableSlots >= totalGames && (
        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
          <p className="text-green-400 font-medium">Ready to Generate</p>
          <p className="text-sm text-green-400/80 mt-1">
            Click &quot;Generate Schedule&quot; to create the schedule with these settings.
          </p>
        </div>
      )}
    </div>
  );
}
