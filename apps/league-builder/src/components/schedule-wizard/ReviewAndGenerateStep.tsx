'use client';

/**
 * Review & Generate Step
 *
 * Combined preview + result step. Shows config summary, feasibility check,
 * generate button, and after generation shows results inline.
 */

import { useState, useCallback } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Loader2,
  MapPin,
} from 'lucide-react';
import type {
  ScheduleConfig,
  ScheduleGenerationResult,
  Team,
  Venue,
  AdditionalIceSlot,
} from '@/lib/schedule/types';
import { generateSeasonSchedule } from '@/lib/schedule/actions';

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
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
}: ReviewAndGenerateStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ScheduleGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const venuesById = Object.fromEntries(venues.map((v) => [v.id, v]));

  // Calculate schedule info
  const gamesPerRound = Math.floor(teams.length / 2);
  const rounds = teams.length % 2 === 0 ? teams.length - 1 : teams.length;
  const multiplier = config.scheduleType === 'double_round_robin' ? 2 : 1;
  const totalGames =
    config.divisionAware || config.scheduleType === 'custom'
      ? Math.floor(teams.length * config.gamesPerTeam / 2)
      : gamesPerRound * rounds * multiplier;

  const concurrentGamesPerSlot = Math.max(1, Math.floor(teams.length / 2));
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const gameDaysPerWeek = config.gameDays.length;
  const slotsPerDay = config.gameTimes.length;
  const totalWeeks = Math.ceil(daysDiff / 7);
  const dateTimeSlots = totalWeeks * gameDaysPerWeek * slotsPerDay;
  const availableSlots = dateTimeSlots * concurrentGamesPerSlot;
  const hasEnoughSlots = availableSlots >= totalGames;

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const genResult = await generateSeasonSchedule(
        seasonId,
        leagueId,
        config,
        templateId ?? undefined,
        additionalIceSlots.length > 0 ? additionalIceSlots : undefined
      );
      setResult(genResult);
      onResult(genResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule');
    } finally {
      setIsGenerating(false);
    }
  }, [seasonId, leagueId, config, templateId, additionalIceSlots, onResult]);

  // Balance data for result view
  const balanceData = result
    ? teams.map((team) => ({
        team,
        home: result.homeGamesPerTeam[team.id] ?? 0,
        away: result.awayGamesPerTeam[team.id] ?? 0,
        balance: (result.homeGamesPerTeam[team.id] ?? 0) - (result.awayGamesPerTeam[team.id] ?? 0),
      }))
    : [];

  const sortedGames = result
    ? [...result.games].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    : [];
  const firstGame = sortedGames[0];
  const lastGame = sortedGames[sortedGames.length - 1];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-white">
          {result?.success ? 'Schedule Generated!' : 'Review & Generate'}
        </h3>
        <p className="text-sm text-neutral-400">
          {result?.success
            ? `${result.totalGames} games ready to save.`
            : 'Review your configuration and generate the schedule.'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
          <Users className="w-5 h-5 text-rink-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-white">{teams.length}</div>
          <div className="text-xs text-neutral-400">Teams</div>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
          <Calendar className="w-5 h-5 text-rink-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-white">{result?.totalGames ?? totalGames}</div>
          <div className="text-xs text-neutral-400">Games</div>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
          <Clock className="w-5 h-5 text-rink-500 mx-auto mb-1" />
          <div className={cn('text-xl font-bold', hasEnoughSlots ? 'text-green-500' : 'text-red-500')}>
            {availableSlots}
          </div>
          <div className="text-xs text-neutral-400">Slots</div>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
          <Calendar className="w-5 h-5 text-neutral-500 mx-auto mb-1" />
          <div className="text-sm font-bold text-white capitalize">
            {config.scheduleType.replace('_', ' ')}
          </div>
          <div className="text-xs text-neutral-400">Format</div>
        </div>
      </div>

      {/* Config Details */}
      {!result && (
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-neutral-500">Date Range</dt>
              <dd className="text-white">
                {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
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
              <dt className="text-neutral-500">Venue</dt>
              <dd className="text-white">
                {config.defaultVenueId ? venuesById[config.defaultVenueId]?.name ?? 'Unknown' : 'None set'}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Holidays Skipped</dt>
              <dd className="text-white">{config.holidayDates.length}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Bye Weeks</dt>
              <dd className="text-white">
                {config.allowByeWeeks ? `${config.byeWeeksPerTeam} per team` : 'None'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Slot Warning */}
      {!result && !hasEnoughSlots && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium text-sm">Not enough time slots</p>
            <p className="text-xs text-yellow-400/80 mt-0.5">
              Need {totalGames} slots but only {availableSlots} available. Add more game days/times or extend dates.
            </p>
          </div>
        </div>
      )}

      {/* Generate Button */}
      {!result && !isGenerating && (
        <div className="text-center py-4">
          <button
            onClick={handleGenerate}
            disabled={!hasEnoughSlots || teams.length < 2}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-black bg-rink-500 rounded-xl hover:bg-rink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="w-5 h-5" />
            Generate Schedule
          </button>
          {teams.length < 2 && (
            <p className="text-xs text-red-400 mt-2">Need at least 2 teams to generate a schedule.</p>
          )}
        </div>
      )}

      {/* Generating */}
      {isGenerating && (
        <div className="p-6 bg-rink-500/10 border border-rink-500/30 rounded-lg text-center">
          <Loader2 className="w-8 h-8 text-rink-500 mx-auto mb-3 animate-spin" />
          <p className="text-rink-400 font-medium">Generating Schedule...</p>
          <p className="text-sm text-rink-400/80 mt-1">This may take a few seconds.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">Generation Failed</p>
            <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ═══ Result Section ═══ */}
      {result?.success && (
        <>
          {/* Success Banner */}
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h4 className="text-lg font-bold text-green-400">Schedule Generated!</h4>
            <p className="text-sm text-green-400/80 mt-1">
              {result.totalGames} games scheduled in {result.durationMs}ms
            </p>
          </div>

          {/* Schedule Period */}
          {firstGame && lastGame && (
            <div className="bg-neutral-800/50 rounded-lg p-3 flex items-center justify-between text-sm">
              <div>
                <span className="text-neutral-500">First game: </span>
                <span className="text-white">{firstGame.scheduledAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <span className="text-neutral-600">→</span>
              <div>
                <span className="text-neutral-500">Last game: </span>
                <span className="text-white">{lastGame.scheduledAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          )}

          {/* Home/Away Balance */}
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-neutral-300 mb-3">Home/Away Balance</h4>
            <div className="space-y-1.5">
              {balanceData.map(({ team, home, away, balance }) => (
                <div key={team.id} className="flex items-center gap-3 text-sm">
                  <div className="w-28 truncate text-white">{team.name}</div>
                  <div className="flex-1 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rink-500"
                      style={{ width: `${home + away > 0 ? (home / (home + away)) * 100 : 50}%` }}
                    />
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-green-400">{home}H</span>
                    <span className="text-neutral-500">/</span>
                    <span className="text-blue-400">{away}A</span>
                  </div>
                  <div className={cn('w-6 text-right text-xs font-medium', balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-neutral-400')}>
                    {balance > 0 ? '+' : ''}{balance}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Violations */}
          {result.constraintViolations.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Soft Violations ({result.constraintViolations.length})
              </h4>
              <ul className="space-y-0.5 text-xs text-yellow-400/80">
                {result.constraintViolations.slice(0, 5).map((v, i) => (
                  <li key={i}>• Game #{v.gameIndex}: {v.message}</li>
                ))}
                {result.constraintViolations.length > 5 && (
                  <li className="text-yellow-400/60">... and {result.constraintViolations.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Sample Games */}
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-neutral-300 mb-3">First 5 Games</h4>
            <div className="space-y-1.5">
              {sortedGames.slice(0, 5).map((game, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-neutral-900/50 rounded-lg text-sm">
                  <span className="text-neutral-500 w-24">
                    {game.scheduledAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-neutral-400 w-14">
                    {game.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-white font-medium">{teamsById[game.homeTeamId]?.name ?? '?'}</span>
                  <span className="text-neutral-500">vs</span>
                  <span className="text-white font-medium">{teamsById[game.awayTeamId]?.name ?? '?'}</span>
                  <span className="text-neutral-500 text-xs w-20 text-right truncate">{game.location}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save CTA */}
          <div className="text-center py-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-black bg-rink-500 rounded-xl hover:bg-rink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle className="w-5 h-5" /> Save Schedule</>
              )}
            </button>
          </div>
        </>
      )}

      {/* Failed result */}
      {result && !result.success && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h4 className="text-lg font-bold text-red-400">Generation Failed</h4>
          <p className="text-sm text-red-400/80 mt-1">
            {result.error ?? 'Unable to generate a valid schedule with these constraints.'}
          </p>
          <button
            onClick={() => { setResult(null); setError(null); }}
            className="mt-3 px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
