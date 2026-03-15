'use client';

/**
 * Quick Setup Step
 *
 * Simplified first step with only essential schedule configuration.
 * Removes playoff config, division toggles, bye weeks, templates —
 * those can be handled by the AI assistant step or advanced mode.
 */

import { useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Calendar, Clock, MapPin, Users, Repeat, ChevronDown, ChevronUp, Snowflake } from 'lucide-react';
import type { ScheduleConfig, Venue, Team } from '@/lib/schedule/types';
import { getStandardHolidayGroupsInRange, toLocalDateString } from '@/lib/schedule/holidays';

interface QuickSetupStepProps {
  config: ScheduleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScheduleConfig>>;
  venues: Venue[];
  teams: Team[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SCHEDULE_TYPES = [
  { value: 'round_robin', label: 'Round Robin', desc: 'Each team plays every other team once' },
  { value: 'double_round_robin', label: 'Double Round Robin', desc: 'Play every team twice (home & away)' },
  { value: 'custom', label: 'Custom', desc: 'Set exact number of games per team' },
];

const TIME_OPTIONS = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];

/** Count available game-day slots between two dates for the given day-of-week set, skipping any skipDates. */
function countAvailableSlots(start: Date, end: Date, gameDays: number[], skipDates?: string[]): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(23, 59, 59, 999);
  const skipSet = new Set(skipDates ?? []);
  while (current <= endNorm) {
    if (gameDays.includes(current.getDay()) && !skipSet.has(toLocalDateString(current))) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function QuickSetupStep({ config, setConfig, venues, teams }: QuickSetupStepProps) {
  const [showHolidays, setShowHolidays] = useState(false);

  const teamCount = teams.length;
  const detectedHolidays = getStandardHolidayGroupsInRange(config.startDate, config.endDate);
  const holidayCount = config.holidayDates.length;

  const maxFillableGames = config.gameDays.length > 0
    ? countAvailableSlots(config.startDate, config.endDate, config.gameDays, config.holidayDates)
    : 0;

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
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-white">Quick Setup</h3>
        <p className="text-sm text-neutral-400">
          Set the essentials — you can fine-tune with the AI assistant in the next step.
        </p>
      </div>

      {/* Schedule Type */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Repeat className="w-4 h-4 inline mr-2" />
          Schedule Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SCHEDULE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setConfig((prev) => ({ ...prev, scheduleType: type.value as ScheduleConfig['scheduleType'] }))}
              className={cn(
                'p-3 rounded-lg border text-left transition-colors',
                config.scheduleType === type.value
                  ? 'border-rink-500 bg-rink-500/10'
                  : 'border-neutral-700 hover:border-rink-500/50'
              )}
            >
              <div className="font-medium text-white text-sm">{type.label}</div>
              <div className="text-xs text-neutral-400 mt-0.5">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-2" />
          Date Range
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">From</span>
            <input
              type="date"
              value={config.startDate instanceof Date ? config.startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : config.startDate;
                setConfig((prev) => ({ ...prev, startDate: d }));
              }}
              className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">To</span>
            <input
              type="date"
              value={config.endDate instanceof Date ? config.endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const d = e.target.value ? new Date(e.target.value + 'T23:59:59') : config.endDate;
                setConfig((prev) => ({ ...prev, endDate: d }));
              }}
              className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
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
                'px-3 py-1.5 rounded-lg border text-sm transition-colors',
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
          <p className="text-xs text-red-400 mt-1">Select at least one game day</p>
        )}
      </div>

      {/* Game Times */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Clock className="w-4 h-4 inline mr-2" />
          Game Times
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              onClick={() => toggleGameTime(time)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-sm transition-colors',
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
          <p className="text-xs text-red-400 mt-1">Select at least one game time</p>
        )}
      </div>

      {/* Venue + Games Per Team row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            <MapPin className="w-4 h-4 inline mr-2" />
            Default Venue
          </label>
          <select
            value={config.defaultVenueId ?? ''}
            onChange={(e) => setConfig((prev) => ({ ...prev, defaultVenueId: e.target.value || null }))}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
          >
            <option value="">No default venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            <Users className="w-4 h-4 inline mr-2" />
            Games Per Team
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={200}
              value={config.gamesPerTeam}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setConfig((prev) => ({ ...prev, gamesPerTeam: Math.max(1, Math.min(200, value)), scheduleType: 'custom' }));
              }}
              className="w-20 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
            {maxFillableGames > 0 && config.gamesPerTeam !== maxFillableGames && (
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, gamesPerTeam: maxFillableGames, scheduleType: 'custom' }))}
                className="px-2.5 py-1.5 text-xs font-medium text-rink-400 bg-rink-500/10 border border-rink-500/30 rounded-lg hover:bg-rink-500/20 transition-colors"
              >
                Fill ({maxFillableGames})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-neutral-800/50 rounded-lg px-4 py-3 flex items-center gap-4 text-sm flex-wrap">
        <span className="text-neutral-300">
          <Users className="w-3.5 h-3.5 inline mr-1 text-rink-500" />
          {teamCount} teams
        </span>
        <span className="text-neutral-300">
          <Calendar className="w-3.5 h-3.5 inline mr-1 text-rink-500" />
          {Math.floor(teamCount * config.gamesPerTeam / 2)} total games
        </span>
        {maxFillableGames > 0 && (
          <span className="text-neutral-400">
            {maxFillableGames} slots available
          </span>
        )}
      </div>

      {/* Holidays - collapsed summary */}
      <div className="border-t border-neutral-800 pt-4">
        <button
          type="button"
          onClick={() => setShowHolidays(!showHolidays)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">Holidays</span>
            <span className="text-xs text-neutral-500">
              {holidayCount > 0
                ? `${holidayCount} holiday${holidayCount !== 1 ? 's' : ''} auto-skipped`
                : 'No holidays in range'}
            </span>
          </div>
          {showHolidays
            ? <ChevronUp className="w-4 h-4 text-neutral-500" />
            : <ChevronDown className="w-4 h-4 text-neutral-500" />}
        </button>

        {showHolidays && (
          <div className="mt-3 space-y-1.5">
            {detectedHolidays.length === 0 ? (
              <p className="text-sm text-neutral-500">No holidays fall within this date range.</p>
            ) : (
              <>
                {detectedHolidays.map((holiday) =>
                  holiday.dates.map((ds) => {
                    const checked = config.holidayDates.includes(ds);
                    const displayDate = new Date(ds + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    });
                    return (
                      <label
                        key={`${holiday.id}-${ds}`}
                        className="flex items-center gap-3 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig((prev) => ({ ...prev, holidayDates: [...prev.holidayDates, ds].sort() }));
                            } else {
                              setConfig((prev) => ({ ...prev, holidayDates: prev.holidayDates.filter((d) => d !== ds) }));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
                        />
                        <span className="text-sm text-neutral-300">{holiday.label}</span>
                        <span className="text-xs text-neutral-500 ml-auto">{displayDate}</span>
                      </label>
                    );
                  })
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
