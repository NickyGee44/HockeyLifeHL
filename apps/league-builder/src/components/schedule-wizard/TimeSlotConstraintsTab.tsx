'use client';

/**
 * Time Slot Constraints Tab
 *
 * Configure time-related constraints for schedule generation:
 * - Late night game limits
 * - Early morning restrictions
 * - Preferred game times by team
 * - Weekend vs weekday distribution
 */

import { useState, useRef } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Clock, Sun, Moon, CalendarDays, Info } from 'lucide-react';
import type { Team, TeamSchedulePreference, ScheduleConstraintConfig } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface TimeSlotConstraintsTabProps {
  teams: Team[];
  teamPreferences: TeamSchedulePreference[];
  constraintConfig: Partial<ScheduleConstraintConfig>;
  onTeamPreferencesChange: (preferences: TeamSchedulePreference[]) => void;
  onConstraintConfigChange: (config: Partial<ScheduleConstraintConfig>) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GAME_TIMES = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================================================
// COMPONENT
// ============================================================================

export function TimeSlotConstraintsTab({
  teams,
  teamPreferences,
  constraintConfig,
  onTeamPreferencesChange,
  onConstraintConfigChange,
}: TimeSlotConstraintsTabProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const tempIdCounter = useRef(0);

  // Get preference for a team
  const getTeamPreference = (teamId: string): TeamSchedulePreference | undefined => {
    return teamPreferences.find((p) => p.teamId === teamId);
  };

  // Update team preference
  const updateTeamPreference = (teamId: string, updates: Partial<TeamSchedulePreference>) => {
    const existing = getTeamPreference(teamId);
    if (existing) {
      onTeamPreferencesChange(
        teamPreferences.map((p) => (p.teamId === teamId ? { ...p, ...updates } : p))
      );
    } else {
      // Create new preference
      const team = teams.find((t) => t.id === teamId);
      const newPref: TeamSchedulePreference = {
        id: `temp-${++tempIdCounter.current}`,
        leagueId: '',
        teamId,
        seasonId: null,
        homeVenueId: team?.homeVenueId ?? null,
        seniorityLevel: 5,
        preferredGameTimes: [],
        avoidedGameTimes: [],
        preferredDays: [],
        avoidedDays: [],
        maxLateNightGames: null,
        maxEarlyMorningGames: null,
        weekendPreference: 0.5,
        minHoursBetweenGames: 24,
        notes: null,
        ...updates,
      };
      onTeamPreferencesChange([...teamPreferences, newPref]);
    }
  };

  // Toggle time in preferred/avoided list
  const toggleTime = (
    teamId: string,
    time: string,
    type: 'preferred' | 'avoided'
  ) => {
    const pref = getTeamPreference(teamId);
    const key = type === 'preferred' ? 'preferredGameTimes' : 'avoidedGameTimes';
    const currentList = pref?.[key] ?? [];

    if (currentList.includes(time)) {
      updateTeamPreference(teamId, { [key]: currentList.filter((t) => t !== time) });
    } else {
      // Remove from opposite list if present
      const oppositeKey = type === 'preferred' ? 'avoidedGameTimes' : 'preferredGameTimes';
      const oppositeList = pref?.[oppositeKey] ?? [];
      updateTeamPreference(teamId, {
        [key]: [...currentList, time],
        [oppositeKey]: oppositeList.filter((t) => t !== time),
      });
    }
  };

  // Toggle day in preferred/avoided list
  const toggleDay = (teamId: string, day: number, type: 'preferred' | 'avoided') => {
    const pref = getTeamPreference(teamId);
    const key = type === 'preferred' ? 'preferredDays' : 'avoidedDays';
    const currentList = pref?.[key] ?? [];

    if (currentList.includes(day)) {
      updateTeamPreference(teamId, { [key]: currentList.filter((d) => d !== day) });
    } else {
      const oppositeKey = type === 'preferred' ? 'avoidedDays' : 'preferredDays';
      const oppositeList = pref?.[oppositeKey] ?? [];
      updateTeamPreference(teamId, {
        [key]: [...currentList, day],
        [oppositeKey]: oppositeList.filter((d) => d !== day),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Time Definitions */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-rink-500" />
          Time Slot Definitions
        </h4>
        <p className="text-sm text-neutral-400 mb-4">
          Define what constitutes "early morning" and "late night" games.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-300 mb-2">
              <Sun className="w-4 h-4 text-yellow-500" />
              Early Morning Ends At
            </label>
            <select
              value={constraintConfig.earlyMorningEndTime ?? '10:00'}
              onChange={(e) =>
                onConstraintConfigChange({ earlyMorningEndTime: e.target.value })
              }
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            >
              {GAME_TIMES.filter((t) => t <= '12:00').map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              Games before this time are considered "early morning"
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-300 mb-2">
              <Moon className="w-4 h-4 text-blue-400" />
              Late Night Starts At
            </label>
            <select
              value={constraintConfig.lateNightStartTime ?? '21:00'}
              onChange={(e) =>
                onConstraintConfigChange({ lateNightStartTime: e.target.value })
              }
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            >
              {GAME_TIMES.filter((t) => t >= '18:00').map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              Games at or after this time are considered "late night"
            </p>
          </div>
        </div>
      </div>

      {/* Global Limits */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3">Global Time Slot Limits</h4>
        <p className="text-sm text-neutral-400 mb-4">
          Set maximum undesirable time slots for all teams (can be overridden per team).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              Max Late Night Games Per Team
            </label>
            <input
              type="number"
              min={0}
              value={constraintConfig.globalMaxLateNightGamesPerTeam ?? ''}
              onChange={(e) =>
                onConstraintConfigChange({
                  globalMaxLateNightGamesPerTeam: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="No limit"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              Max Early Morning Games Per Team
            </label>
            <input
              type="number"
              min={0}
              value={constraintConfig.globalMaxEarlyMorningGamesPerTeam ?? ''}
              onChange={(e) =>
                onConstraintConfigChange({
                  globalMaxEarlyMorningGamesPerTeam: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="No limit"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
          </div>
        </div>
      </div>

      {/* Weekend Distribution */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-rink-500" />
          Weekend vs Weekday Distribution
        </h4>
        <p className="text-sm text-neutral-400 mb-4">
          Control how games are distributed between weekends and weekdays.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              Target Weekend Game Percentage
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={constraintConfig.targetWeekendGamePercentage ?? 50}
                onChange={(e) =>
                  onConstraintConfigChange({
                    targetWeekendGamePercentage: parseInt(e.target.value),
                  })
                }
                className="flex-1"
              />
              <span className="text-white font-medium w-12 text-right">
                {constraintConfig.targetWeekendGamePercentage ?? 50}%
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              Tolerance Percentage (+/-)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={constraintConfig.weekendTolerancePercentage ?? 10}
              onChange={(e) =>
                onConstraintConfigChange({
                  weekendTolerancePercentage: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
          </div>
        </div>

        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-300">
            With {constraintConfig.targetWeekendGamePercentage ?? 50}% target and{' '}
            {constraintConfig.weekendTolerancePercentage ?? 10}% tolerance, each team will have
            between{' '}
            {Math.max(0, (constraintConfig.targetWeekendGamePercentage ?? 50) - (constraintConfig.weekendTolerancePercentage ?? 10))}%
            and{' '}
            {Math.min(100, (constraintConfig.targetWeekendGamePercentage ?? 50) + (constraintConfig.weekendTolerancePercentage ?? 10))}%
            of their games on weekends.
          </p>
        </div>
      </div>

      {/* Per-Team Time Preferences */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3">Team Time Preferences</h4>
        <p className="text-sm text-neutral-400 mb-4">
          Configure specific time preferences for individual teams.
        </p>

        <div className="space-y-2">
          {teams.map((team) => {
            const pref = getTeamPreference(team.id);
            const isExpanded = expandedTeam === team.id;

            return (
              <div
                key={team.id}
                className="border border-neutral-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  className="w-full flex items-center justify-between p-3 bg-neutral-800 hover:bg-neutral-700 transition-colors"
                >
                  <span className="font-medium text-white">{team.name}</span>
                  <div className="flex items-center gap-3 text-sm text-neutral-400">
                    {pref?.maxLateNightGames != null && (
                      <span className="flex items-center gap-1">
                        <Moon className="w-3 h-3" />
                        Max {pref.maxLateNightGames}
                      </span>
                    )}
                    {(pref?.preferredGameTimes?.length ?? 0) > 0 && (
                      <span>{pref?.preferredGameTimes?.length} preferred times</span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Late night / Early morning limits */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-neutral-300 mb-2">
                          Max Late Night Games
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={pref?.maxLateNightGames ?? ''}
                          onChange={(e) =>
                            updateTeamPreference(team.id, {
                              maxLateNightGames: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          placeholder="Use global setting"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-300 mb-2">
                          Max Early Morning Games
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={pref?.maxEarlyMorningGames ?? ''}
                          onChange={(e) =>
                            updateTeamPreference(team.id, {
                              maxEarlyMorningGames: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          placeholder="Use global setting"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                        />
                      </div>
                    </div>

                    {/* Preferred/Avoided Times */}
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">
                        Game Time Preferences
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'].map(
                          (time) => {
                            const isPreferred = pref?.preferredGameTimes?.includes(time);
                            const isAvoided = pref?.avoidedGameTimes?.includes(time);

                            return (
                              <div key={time} className="flex flex-col items-center">
                                <span className="text-xs text-neutral-500 mb-1">{time}</span>
                                <div className="flex gap-0.5">
                                  <button
                                    onClick={() => toggleTime(team.id, time, 'preferred')}
                                    className={cn(
                                      'w-6 h-6 rounded-l text-xs font-bold transition-colors',
                                      isPreferred
                                        ? 'bg-green-600 text-white'
                                        : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                                    )}
                                    title="Preferred"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => toggleTime(team.id, time, 'avoided')}
                                    className={cn(
                                      'w-6 h-6 rounded-r text-xs font-bold transition-colors',
                                      isAvoided
                                        ? 'bg-red-600 text-white'
                                        : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                                    )}
                                    title="Avoided"
                                  >
                                    -
                                  </button>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-2">
                        <span className="text-green-500">+</span> = preferred,{' '}
                        <span className="text-red-500">-</span> = avoided
                      </p>
                    </div>

                    {/* Preferred/Avoided Days */}
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">
                        Day Preferences
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DAY_NAMES.map((day, idx) => {
                          const isPreferred = pref?.preferredDays?.includes(idx);
                          const isAvoided = pref?.avoidedDays?.includes(idx);

                          return (
                            <div key={idx} className="flex flex-col items-center">
                              <span className="text-xs text-neutral-500 mb-1">{day.slice(0, 3)}</span>
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => toggleDay(team.id, idx, 'preferred')}
                                  className={cn(
                                    'w-6 h-6 rounded-l text-xs font-bold transition-colors',
                                    isPreferred
                                      ? 'bg-green-600 text-white'
                                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                                  )}
                                  title="Preferred"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => toggleDay(team.id, idx, 'avoided')}
                                  className={cn(
                                    'w-6 h-6 rounded-r text-xs font-bold transition-colors',
                                    isAvoided
                                      ? 'bg-red-600 text-white'
                                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                                  )}
                                  title="Avoided"
                                >
                                  -
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weekend Preference */}
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">
                        Weekend Preference
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-500">Weekdays</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={pref?.weekendPreference ?? 0.5}
                          onChange={(e) =>
                            updateTeamPreference(team.id, {
                              weekendPreference: parseFloat(e.target.value),
                            })
                          }
                          className="flex-1"
                        />
                        <span className="text-xs text-neutral-500">Weekends</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
