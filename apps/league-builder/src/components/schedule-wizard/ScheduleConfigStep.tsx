'use client';

/**
 * Schedule Configuration Step
 *
 * First step of the schedule wizard for configuring schedule parameters.
 */

import { cn } from '@hockey-life/ui/lib/utils';
import { Calendar, Clock, MapPin, Users, Repeat } from 'lucide-react';
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
                    ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                    : 'border-neutral-700 text-neutral-300 hover:border-gold-500/50'
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
          Schedule Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCHEDULE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setConfig((prev) => ({ ...prev, scheduleType: type.value as ScheduleConfig['scheduleType'] }))}
              className={cn(
                'p-4 rounded-lg border text-left transition-colors',
                config.scheduleType === type.value
                  ? 'border-gold-500 bg-gold-500/10'
                  : 'border-neutral-700 hover:border-gold-500/50'
              )}
            >
              <div className="font-medium text-white">{type.label}</div>
              <div className="text-sm text-neutral-400 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Team Count & Games Info */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gold-500" />
            <span className="text-neutral-300">{teamCount} Teams</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold-500" />
            <span className="text-neutral-300">{totalGames} Total Games</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">≈ {Math.ceil(totalGames / teamCount * 2)} games per team</span>
          </div>
        </div>
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
                  ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                  : 'border-neutral-700 text-neutral-400 hover:border-gold-500/50'
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
                  ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                  : 'border-neutral-700 text-neutral-400 hover:border-gold-500/50'
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
          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-gold-500 focus:ring-gold-500"
          />
          <span className="text-sm text-neutral-300">Balance home and away games (recommended)</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.allowBackToBack}
            onChange={(e) => setConfig((prev) => ({ ...prev, allowBackToBack: e.target.checked }))}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-gold-500 focus:ring-gold-500"
          />
          <span className="text-sm text-neutral-300">Allow back-to-back games for same team</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.rotateHomeVenue}
            onChange={(e) => setConfig((prev) => ({ ...prev, rotateHomeVenue: e.target.checked }))}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-gold-500 focus:ring-gold-500"
          />
          <span className="text-sm text-neutral-300">Use team's home venue when available</span>
        </label>
      </div>
    </div>
  );
}
