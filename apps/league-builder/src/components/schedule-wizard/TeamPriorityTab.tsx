'use client';

/**
 * Team Priority Tab
 *
 * Configure team seniority and priority rules for schedule generation:
 * - Seniority-based time slot preference
 * - New team penalties (less desirable slots)
 * - Priority teams get first pick
 */

import { useState, useMemo, useRef } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Trophy, Users, ArrowUpDown, GripVertical, Info, Star } from 'lucide-react';
import type { Team, TeamSchedulePreference, ScheduleConstraintConfig } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface TeamPriorityTabProps {
  teams: Team[];
  teamPreferences: TeamSchedulePreference[];
  constraintConfig: Partial<ScheduleConstraintConfig>;
  onTeamPreferencesChange: (preferences: TeamSchedulePreference[]) => void;
  onConstraintConfigChange: (config: Partial<ScheduleConstraintConfig>) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SENIORITY_LEVELS = [
  { value: 10, label: 'Founding Team', description: 'Original league team, highest priority' },
  { value: 9, label: 'Legacy Team', description: '5+ years in the league' },
  { value: 8, label: 'Established Team', description: '3-5 years in the league' },
  { value: 7, label: 'Veteran Team', description: '2-3 years in the league' },
  { value: 6, label: 'Experienced Team', description: '1-2 years in the league' },
  { value: 5, label: 'Regular Team', description: 'Standard priority (default)' },
  { value: 4, label: 'Developing Team', description: 'Under 1 year in the league' },
  { value: 3, label: 'New Team', description: 'First season' },
  { value: 2, label: 'Expansion Team', description: 'New expansion team' },
  { value: 1, label: 'Provisional Team', description: 'Lowest priority' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TeamPriorityTab({
  teams,
  teamPreferences,
  constraintConfig,
  onTeamPreferencesChange,
  onConstraintConfigChange,
}: TeamPriorityTabProps) {
  const [sortOrder, setSortOrder] = useState<'name' | 'seniority'>('seniority');
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

  // Sorted teams
  const sortedTeams = useMemo(() => {
    const teamsWithSeniority = teams.map((team) => ({
      ...team,
      seniority: teamPreferences.find((p) => p.teamId === team.id)?.seniorityLevel ?? 5,
    }));

    if (sortOrder === 'name') {
      return [...teamsWithSeniority].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return [...teamsWithSeniority].sort((a, b) => b.seniority - a.seniority);
    }
  }, [teams, teamPreferences, sortOrder]);

  // Get seniority label
  const getSeniorityLabel = (level: number) => {
    return SENIORITY_LEVELS.find((s) => s.value === level)?.label ?? 'Regular Team';
  };

  // Get seniority color
  const getSeniorityColor = (level: number) => {
    if (level >= 9) return 'text-yellow-500';
    if (level >= 7) return 'text-green-500';
    if (level >= 5) return 'text-blue-500';
    if (level >= 3) return 'text-neutral-400';
    return 'text-neutral-500';
  };

  return (
    <div className="space-y-6">
      {/* Seniority Enforcement Settings */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Seniority Enforcement
        </h4>
        <p className="text-sm text-neutral-400 mb-4">
          Enable seniority-based scheduling to give higher-priority teams better time slots.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={constraintConfig.enforceSeniorityPreferences ?? false}
              onChange={(e) =>
                onConstraintConfigChange({ enforceSeniorityPreferences: e.target.checked })
              }
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
            />
            <span className="text-sm text-neutral-300">
              Enable seniority-based time slot preferences
            </span>
          </label>

          {constraintConfig.enforceSeniorityPreferences && (
            <div className="pl-7">
              <label className="block text-sm text-neutral-300 mb-2">
                Seniority Weight (how much seniority affects slot assignment)
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500">Less</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={constraintConfig.seniorityWeight ?? 0.5}
                  onChange={(e) =>
                    onConstraintConfigChange({ seniorityWeight: parseFloat(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-xs text-neutral-500">More</span>
                <span className="text-white font-medium w-10 text-right">
                  {Math.round((constraintConfig.seniorityWeight ?? 0.5) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Team Penalty */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-rink-500" />
          New Team Handling
        </h4>
        <p className="text-sm text-neutral-400 mb-4">
          Configure how new teams (seniority level 1-3) are handled during scheduling.
        </p>

        <div>
          <label className="block text-sm text-neutral-300 mb-2">
            New Team Penalty Period (weeks)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={12}
              value={constraintConfig.newTeamPenaltyWeeks ?? 0}
              onChange={(e) =>
                onConstraintConfigChange({ newTeamPenaltyWeeks: parseInt(e.target.value) || 0 })
              }
              className="w-20 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
            <span className="text-sm text-neutral-400">
              weeks of less desirable time slots for new teams
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Set to 0 to treat new teams equally from the start.
          </p>
        </div>
      </div>

      {/* Team Seniority Levels */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <Star className="w-4 h-4 text-rink-500" />
            Team Seniority Levels
          </h4>
          <button
            onClick={() => setSortOrder(sortOrder === 'name' ? 'seniority' : 'name')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort by {sortOrder === 'name' ? 'Seniority' : 'Name'}
          </button>
        </div>

        <p className="text-sm text-neutral-400 mb-4">
          Assign seniority levels to teams. Higher seniority = better time slot priority.
        </p>

        {/* Seniority Legend */}
        <div className="mb-4 p-3 bg-neutral-900 rounded-lg">
          <div className="text-xs text-neutral-400 mb-2">Seniority Levels:</div>
          <div className="flex flex-wrap gap-2">
            {SENIORITY_LEVELS.filter((_, i) => i % 2 === 0).map((level) => (
              <span
                key={level.value}
                className={cn('text-xs', getSeniorityColor(level.value))}
                title={level.description}
              >
                {level.value}: {level.label}
              </span>
            ))}
          </div>
        </div>

        {/* Team List */}
        <div className="space-y-2">
          {sortedTeams.map((team, index) => {
            const pref = getTeamPreference(team.id);
            const seniority = pref?.seniorityLevel ?? 5;

            return (
              <div
                key={team.id}
                className="flex items-center gap-3 p-3 bg-neutral-900 rounded-lg"
              >
                <div className="text-neutral-600">
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{team.name}</span>
                    {seniority >= 9 && <Trophy className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <div className={cn('text-sm', getSeniorityColor(seniority))}>
                    {getSeniorityLabel(seniority)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={seniority}
                    onChange={(e) =>
                      updateTeamPreference(team.id, {
                        seniorityLevel: parseInt(e.target.value),
                      })
                    }
                    className={cn(
                      'px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rink-500',
                      getSeniorityColor(seniority)
                    )}
                  >
                    {SENIORITY_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.value} - {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority Explanation */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-2">How Seniority Affects Scheduling</p>
            <ul className="space-y-1 list-disc list-inside text-blue-300/80">
              <li>Teams with higher seniority get first choice of preferred time slots</li>
              <li>New teams may receive more late night or early morning games initially</li>
              <li>The seniority weight controls how strongly seniority influences slot assignment</li>
              <li>Seniority only affects soft preferences; hard constraints are always respected</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
