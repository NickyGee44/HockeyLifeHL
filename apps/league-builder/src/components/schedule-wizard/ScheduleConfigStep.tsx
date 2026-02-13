'use client';

/**
 * Schedule Configuration Step
 *
 * First step of the schedule wizard for configuring schedule parameters.
 * Includes regular season games per team and playoff structure configuration.
 */

import { cn } from '@hockey-life/ui/lib/utils';
import { Calendar, Clock, MapPin, Users, Repeat, Trophy, Info } from 'lucide-react';
import type { ScheduleConfig, ScheduleTemplate, Venue } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleConfigStepProps {
  config: ScheduleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScheduleConfig>>;
  templates: ScheduleTemplate[];
  selectedTemplateId: string | null;
  onApplyTemplate: (template: ScheduleTemplate) => void;
  venues: Venue[];
  teamCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SCHEDULE_TYPES = [
  { value: 'round_robin', label: 'Round Robin', description: 'Each team plays every other team once' },
  { value: 'double_round_robin', label: 'Double Round Robin', description: 'Each team plays every other team twice (home and away)' },
  { value: 'custom', label: 'Custom', description: 'Specify exact number of regular season games per team' },
];

const PLAYOFF_FORMATS = [
  {
    value: 'none',
    label: 'No Playoffs',
    description: 'Regular season only, standings determine final rankings',
  },
  {
    value: 'single_elimination',
    label: 'Single Elimination',
    description: "One loss and you're out. Quick tournament-style playoffs.",
    rounds: (teams: number) => Math.ceil(Math.log2(teams)),
    gamesPerRound: (teams: number, round: number) => Math.ceil(teams / Math.pow(2, round)),
  },
  {
    value: 'best_of_3',
    label: 'Best of 3 Series',
    description: 'First team to win 2 games advances. More competitive format.',
    gamesPerSeries: 3,
  },
  {
    value: 'best_of_5',
    label: 'Best of 5 Series',
    description: 'First team to win 3 games advances. Full playoff experience.',
    gamesPerSeries: 5,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleConfigStep({
  config,
  setConfig,
  templates,
  selectedTemplateId,
  onApplyTemplate,
  venues,
  teamCount,
}: ScheduleConfigStepProps) {
  // Calculate expected games
  const gamesPerRound = Math.floor(teamCount / 2);
  const rounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
  const totalGames = gamesPerRound * rounds * (config.scheduleType === 'double_round_robin' ? 2 : 1);

  const toggleGameDay = (day: number) => {
    setConfig((prev) => ({
      ...prev,
      gameDays: prev.gameDays.includes(day)
        ? prev.gameDays.filter((d) => d !== day)
        : [...prev.gameDays, day].sort(),
    }));
  };

  const toggleGameTime = (time: string) => {
    setConfig((prev) => ({
      ...prev,
      gameTimes: prev.gameTimes.includes(time)
        ? prev.gameTimes.filter((t) => t !== time)
        : [...prev.gameTimes, time].sort(),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      {templates.length > 0 && (
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">Quick Start with Template</h3>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onApplyTemplate(template)}
                className={cn(
                  'px-3 py-2 text-sm rounded-lg border transition-colors',
                  selectedTemplateId === template.id
                    ? 'border-rink-500 bg-rink-500/10 text-rink-500'
                    : 'border-neutral-700 text-neutral-300 hover:border-rink-500/50'
                )}
              >
                {template.name}
                {template.isDefault && (
                  <span className="ml-1 text-xs text-neutral-500">(Default)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Type */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Repeat className="w-4 h-4 inline mr-2" />
          Regular Season Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SCHEDULE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setConfig((prev) => ({ ...prev, scheduleType: type.value as ScheduleConfig['scheduleType'] }))}
              className={cn(
                'p-4 rounded-lg border text-left transition-colors',
                config.scheduleType === type.value
                  ? 'border-rink-500 bg-rink-500/10'
                  : 'border-neutral-700 hover:border-rink-500/50'
              )}
            >
              <div className="font-medium text-white">{type.label}</div>
              <div className="text-sm text-neutral-400 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Games Per Team Input (for custom mode) */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Users className="w-4 h-4 inline mr-2" />
          Regular Season Games Per Team
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min={teamCount > 1 ? teamCount - 1 : 1}
            max={50}
            value={config.gamesPerTeam}
            onChange={(e) => {
              const value = parseInt(e.target.value) || teamCount - 1;
              setConfig((prev) => ({
                ...prev,
                gamesPerTeam: Math.max(teamCount - 1, Math.min(50, value)),
                scheduleType: 'custom', // Switch to custom when manually editing
              }));
            }}
            className="w-24 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-rink-500"
          />
          <span className="text-sm text-neutral-400">
            games per team ({totalGames} total games)
          </span>
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          Minimum: {teamCount - 1} games (play each team once). Maximum: 50 games.
        </p>
      </div>

      {/* Team Count & Games Info */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rink-500" />
            <span className="text-neutral-300">{teamCount} Teams</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rink-500" />
            <span className="text-neutral-300">{totalGames} Regular Season Games</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">{config.gamesPerTeam} games per team</span>
          </div>
        </div>
      </div>

      {/* Playoff Configuration */}
      <div className="border-t border-neutral-800 pt-6">
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Trophy className="w-4 h-4 inline mr-2" />
          Playoff Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLAYOFF_FORMATS.map((format) => (
            <button
              key={format.value}
              onClick={() => setConfig((prev) => ({
                ...prev,
                playoffFormat: format.value as 'none' | 'single_elimination' | 'best_of_3' | 'best_of_5',
              }))}
              className={cn(
                'p-4 rounded-lg border text-left transition-colors',
                config.playoffFormat === format.value
                  ? 'border-rink-500 bg-rink-500/10'
                  : 'border-neutral-700 hover:border-rink-500/50'
              )}
            >
              <div className="font-medium text-white">{format.label}</div>
              <div className="text-sm text-neutral-400 mt-1">{format.description}</div>
            </button>
          ))}
        </div>

        {/* Playoff Teams Selection */}
        {config.playoffFormat && config.playoffFormat !== 'none' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Number of Playoff Teams
            </label>
            <div className="flex flex-wrap gap-2">
              {[4, 6, 8, 10, 12, 16].filter(n => n <= teamCount).map((num) => (
                <button
                  key={num}
                  onClick={() => setConfig((prev) => ({ ...prev, playoffTeams: num }))}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm transition-colors',
                    config.playoffTeams === num
                      ? 'border-rink-500 bg-rink-500/10 text-rink-500'
                      : 'border-neutral-700 text-neutral-400 hover:border-rink-500/50'
                  )}
                >
                  Top {num}
                </button>
              ))}
            </div>

            {/* Playoff Info */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-300">
                  <p>
                    {config.playoffFormat === 'single_elimination' && (
                      <>Single elimination bracket with {config.playoffTeams || 8} teams = {Math.ceil(Math.log2(config.playoffTeams || 8))} rounds</>
                    )}
                    {config.playoffFormat === 'best_of_3' && (
                      <>Best of 3 series: Up to {(config.playoffTeams || 8) / 2 * 3} playoff games</>
                    )}
                    {config.playoffFormat === 'best_of_5' && (
                      <>Best of 5 series: Up to {(config.playoffTeams || 8) / 2 * 5} playoff games</>
                    )}
                  </p>
                  <p className="mt-1 text-blue-400/80">
                    Playoffs will be automatically scheduled after regular season ends.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Days */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-2" />
          Game Days
        </label>
        <div className="flex flex-wrap gap-2">
          {DAY_NAMES.map((name, index) => (
            <button
              key={index}
              onClick={() => toggleGameDay(index)}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm transition-colors',
                config.gameDays.includes(index)
                  ? 'border-rink-500 bg-rink-500/10 text-rink-500'
                  : 'border-neutral-700 text-neutral-400 hover:border-rink-500/50'
              )}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
        {config.gameDays.length === 0 && (
          <p className="text-sm text-red-400 mt-2">Please select at least one game day</p>
        )}
      </div>

      {/* Game Times */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Clock className="w-4 h-4 inline mr-2" />
          Game Times
        </label>
        <div className="flex flex-wrap gap-2">
          {['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'].map((time) => (
            <button
              key={time}
              onClick={() => toggleGameTime(time)}
              className={cn(
                'px-3 py-2 rounded-lg border text-sm transition-colors',
                config.gameTimes.includes(time)
                  ? 'border-rink-500 bg-rink-500/10 text-rink-500'
                  : 'border-neutral-700 text-neutral-400 hover:border-rink-500/50'
              )}
            >
              {time}
            </button>
          ))}
        </div>
        {config.gameTimes.length === 0 && (
          <p className="text-sm text-red-400 mt-2">Please select at least one game time</p>
        )}
      </div>

      {/* Game Duration */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Game Duration (minutes)
        </label>
        <select
          value={config.gameDurationMinutes}
          onChange={(e) => setConfig((prev) => ({ ...prev, gameDurationMinutes: parseInt(e.target.value) }))}
          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
        >
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes (1 hour)</option>
          <option value={75}>75 minutes</option>
          <option value={90}>90 minutes (1.5 hours)</option>
        </select>
      </div>

      {/* Default Venue */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <MapPin className="w-4 h-4 inline mr-2" />
          Default Venue
        </label>
        <select
          value={config.defaultVenueId ?? ''}
          onChange={(e) => setConfig((prev) => ({ ...prev, defaultVenueId: e.target.value || null }))}
          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
        >
          <option value="">No default venue</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-neutral-300">Advanced Options</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.homeAwayBalance}
            onChange={(e) => setConfig((prev) => ({ ...prev, homeAwayBalance: e.target.checked }))}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
          />
          <span className="text-sm text-neutral-300">Balance home and away games (recommended)</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.allowBackToBack}
            onChange={(e) => setConfig((prev) => ({ ...prev, allowBackToBack: e.target.checked }))}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
          />
          <span className="text-sm text-neutral-300">Allow back-to-back games for same team</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.rotateHomeVenue}
            onChange={(e) => setConfig((prev) => ({ ...prev, rotateHomeVenue: e.target.checked }))}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
          />
          <span className="text-sm text-neutral-300">Use team&apos;s home venue when available</span>
        </label>
      </div>
    </div>
  );
}
