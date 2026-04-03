'use client';

/**
 * Basics step for the owner-first schedule builder.
 */

import { useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Repeat,
  ChevronDown,
  ChevronUp,
  Snowflake,
} from 'lucide-react';
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
  { value: 'round_robin', label: 'Play each team once', desc: 'A lighter season where teams meet one time' },
  { value: 'double_round_robin', label: 'Play each team twice', desc: 'A fuller season with a home-and-away feel' },
  { value: 'custom', label: 'Set games manually', desc: 'Choose the exact number of games per team' },
];

const TIME_OPTIONS = [
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
  '22:30',
];

function countAvailableSlots(start: Date, end: Date, gameDays: number[], skipDates?: string[]) {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(23, 59, 59, 999);
  const skipSet = new Set(skipDates ?? []);

  while (current <= endNorm) {
    if (gameDays.includes(current.getDay()) && !skipSet.has(toLocalDateString(current))) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function QuickSetupStep({ config, setConfig, venues, teams }: QuickSetupStepProps) {
  const [showHolidays, setShowHolidays] = useState(false);

  const teamCount = teams.length;
  const detectedHolidays = getStandardHolidayGroupsInRange(config.startDate, config.endDate);
  const holidayCount = config.holidayDates.length;
  const maxFillableGames =
    config.gameDays.length > 0
      ? countAvailableSlots(config.startDate, config.endDate, config.gameDays, config.holidayDates)
      : 0;

  const toggleGameDay = (day: number) => {
    setConfig((prev) => ({
      ...prev,
      gameDays: prev.gameDays.includes(day)
        ? prev.gameDays.filter((value) => value !== day)
        : [...prev.gameDays, day].sort(),
    }));
  };

  const toggleGameTime = (time: string) => {
    setConfig((prev) => ({
      ...prev,
      gameTimes: prev.gameTimes.includes(time)
        ? prev.gameTimes.filter((value) => value !== time)
        : [...prev.gameTimes, time].sort(),
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-white">Basics</h3>
        <p className="text-sm text-neutral-400">
          Choose when the season runs, which nights you use, and how much hockey to fit into the calendar.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">
          <Repeat className="mr-2 inline h-4 w-4" />
          Who plays who
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SCHEDULE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  scheduleType: type.value as ScheduleConfig['scheduleType'],
                }))
              }
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                config.scheduleType === type.value
                  ? 'border-rink-500 bg-rink-500/10'
                  : 'border-neutral-700 hover:border-rink-500/50'
              )}
            >
              <div className="text-sm font-medium text-white">{type.label}</div>
              <div className="mt-0.5 text-xs text-neutral-400">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">
          <Calendar className="mr-2 inline h-4 w-4" />
          Date range
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">From</span>
            <input
              type="date"
              value={
                config.startDate instanceof Date ? config.startDate.toISOString().split('T')[0] : ''
              }
              onChange={(event) => {
                const value = event.target.value
                  ? new Date(`${event.target.value}T00:00:00`)
                  : config.startDate;
                setConfig((prev) => ({ ...prev, startDate: value }));
              }}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">To</span>
            <input
              type="date"
              value={config.endDate instanceof Date ? config.endDate.toISOString().split('T')[0] : ''}
              onChange={(event) => {
                const value = event.target.value
                  ? new Date(`${event.target.value}T23:59:59`)
                  : config.endDate;
                setConfig((prev) => ({ ...prev, endDate: value }));
              }}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">
          <Calendar className="mr-2 inline h-4 w-4" />
          Game nights
        </label>
        <div className="flex flex-wrap gap-2">
          {DAY_NAMES.map((name, index) => (
            <button
              key={index}
              onClick={() => toggleGameDay(index)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition-colors',
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
          <p className="mt-1 text-xs text-red-400">Select at least one game night</p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">
          <Clock className="mr-2 inline h-4 w-4" />
          Ice times
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              onClick={() => toggleGameTime(time)}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-sm transition-colors',
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
          <p className="mt-1 text-xs text-red-400">Select at least one ice time</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            <MapPin className="mr-2 inline h-4 w-4" />
            Main venue
          </label>
          <select
            value={config.defaultVenueId ?? ''}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, defaultVenueId: event.target.value || null }))
            }
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
          >
            <option value="">No main venue</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            <Users className="mr-2 inline h-4 w-4" />
            How often teams play
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={200}
              value={config.gamesPerTeam}
              onChange={(event) => {
                const value = parseInt(event.target.value, 10) || 1;
                setConfig((prev) => ({
                  ...prev,
                  gamesPerTeam: Math.max(1, Math.min(200, value)),
                  scheduleType: 'custom',
                }));
              }}
              className="w-24 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-center text-sm text-white focus:outline-none focus:ring-2 focus:ring-rink-500"
            />
            {maxFillableGames > 0 && config.gamesPerTeam !== maxFillableGames && (
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    gamesPerTeam: maxFillableGames,
                    scheduleType: 'custom',
                  }))
                }
                className="rounded-lg border border-rink-500/30 bg-rink-500/10 px-2.5 py-1.5 text-xs font-medium text-rink-400 transition-colors hover:bg-rink-500/20"
              >
                Fill season ({maxFillableGames})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-neutral-800/50 px-4 py-3 text-sm">
        <span className="text-neutral-300">
          <Users className="mr-1 inline h-3.5 w-3.5 text-rink-500" />
          {teamCount} teams
        </span>
        <span className="text-neutral-300">
          <Calendar className="mr-1 inline h-3.5 w-3.5 text-rink-500" />
          {Math.floor(teamCount * config.gamesPerTeam / 2)} projected games
        </span>
        {maxFillableGames > 0 && (
          <span className="text-neutral-400">
            {maxFillableGames} available dates before extra venue capacity is counted
          </span>
        )}
      </div>

      <div className="border-t border-neutral-800 pt-4">
        <button
          type="button"
          onClick={() => setShowHolidays((prev) => !prev)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">Holiday dates</span>
            <span className="text-xs text-neutral-500">
              {holidayCount > 0
                ? `${holidayCount} holiday${holidayCount === 1 ? '' : 's'} auto-skipped`
                : 'No holidays in range'}
            </span>
          </div>
          {showHolidays ? (
            <ChevronUp className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          )}
        </button>

        {showHolidays && (
          <div className="mt-3 space-y-1.5">
            {detectedHolidays.length === 0 ? (
              <p className="text-sm text-neutral-500">No holidays fall inside this date range.</p>
            ) : (
              <>
                {detectedHolidays.map((holiday) =>
                  holiday.dates.map((dateString) => {
                    const checked = config.holidayDates.includes(dateString);
                    const displayDate = new Date(`${dateString}T12:00:00`).toLocaleDateString(
                      'en-US',
                      {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      }
                    );

                    return (
                      <label
                        key={`${holiday.id}-${dateString}`}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-800/50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setConfig((prev) => ({
                                ...prev,
                                holidayDates: [...prev.holidayDates, dateString].sort(),
                              }));
                            } else {
                              setConfig((prev) => ({
                                ...prev,
                                holidayDates: prev.holidayDates.filter((value) => value !== dateString),
                              }));
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
                        />
                        <span className="text-sm text-neutral-300">{holiday.label}</span>
                        <span className="ml-auto text-xs text-neutral-500">{displayDate}</span>
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
