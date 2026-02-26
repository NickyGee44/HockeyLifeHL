'use client';

/**
 * Schedule Configuration Step
 *
 * First step of the schedule wizard for configuring schedule parameters.
 * Includes regular season games per team and playoff structure configuration.
 */

import { cn } from '@hockey-life/ui/lib/utils';
import { Calendar, CalendarOff, Clock, MapPin, Users, Repeat, Trophy, Info, GitBranch, Percent, Hash, Snowflake } from 'lucide-react';
import type { ScheduleConfig, ScheduleTemplate, Team, Venue } from '@/lib/schedule/types';

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
  teams: Team[];
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

/** Format a Date as YYYY-MM-DD using local (not UTC) components. */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Count available game-day slots between two dates for the given day-of-week set, skipping any skipDates. */
function countAvailableSlots(start: Date, end: Date, gameDays: number[], skipDates?: string[]): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(23, 59, 59, 999);
  const skipSet = new Set(skipDates ?? []);
  while (current <= endNorm) {
    if (gameDays.includes(current.getDay()) && !skipSet.has(toLocalDateStr(current))) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ============================================================================
// HOLIDAY UTILITIES
// ============================================================================

/** Meeus/Jones/Butcher Easter algorithm — returns Easter Sunday for a given year. */
function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/** Returns the nth occurrence of a weekday (0=Sun…6=Sat) in a given month. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const diff = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + diff + (n - 1) * 7);
}

/** Returns the last occurrence of a weekday on or before the given day of month. */
function lastWeekdayOnOrBefore(year: number, month: number, day: number, weekday: number): Date {
  const ref = new Date(year, month, day);
  const back = (ref.getDay() - weekday + 7) % 7;
  return new Date(year, month, day - back);
}

interface HolidayDef {
  id: string;
  label: string;
  compute: (year: number) => Date[];
}

const HOCKEY_HOLIDAYS: HolidayDef[] = [
  { id: 'new_years_day',    label: "New Year's Day (Jan 1)",           compute: (y) => [new Date(y, 0, 1)] },
  { id: 'good_friday',      label: 'Good Friday',                      compute: (y) => { const e = computeEaster(y); return [new Date(y, e.getMonth(), e.getDate() - 2)]; } },
  { id: 'easter_sunday',    label: 'Easter Sunday',                    compute: (y) => [computeEaster(y)] },
  { id: 'victoria_day',     label: 'Victoria Day (Mon before May 25)', compute: (y) => [lastWeekdayOnOrBefore(y, 4, 24, 1)] },
  { id: 'canada_day',       label: 'Canada Day (Jul 1)',               compute: (y) => [new Date(y, 6, 1)] },
  { id: 'civic_holiday',    label: 'Civic Holiday (1st Mon of Aug)',   compute: (y) => [nthWeekdayOfMonth(y, 7, 1, 1)] },
  { id: 'labour_day',       label: 'Labour Day (1st Mon of Sep)',      compute: (y) => [nthWeekdayOfMonth(y, 8, 1, 1)] },
  { id: 'thanksgiving_ca',  label: 'Thanksgiving (2nd Mon of Oct)',    compute: (y) => [nthWeekdayOfMonth(y, 9, 1, 2)] },
  { id: 'remembrance_day',  label: 'Remembrance Day (Nov 11)',         compute: (y) => [new Date(y, 10, 11)] },
  { id: 'christmas_eve',    label: 'Christmas Eve (Dec 24)',           compute: (y) => [new Date(y, 11, 24)] },
  { id: 'christmas_day',    label: 'Christmas Day (Dec 25)',           compute: (y) => [new Date(y, 11, 25)] },
  { id: 'boxing_day',       label: 'Boxing Day (Dec 26)',              compute: (y) => [new Date(y, 11, 26)] },
  { id: 'new_years_eve',    label: "New Year's Eve (Dec 31)",          compute: (y) => [new Date(y, 11, 31)] },
];

/** Returns holidays that fall within [startDate, endDate], grouped by holiday definition. */
function getHolidaysInRange(
  startDate: Date,
  endDate: Date
): { id: string; label: string; dates: string[] }[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const startStr = toLocalDateStr(startDate);
  const endStr = toLocalDateStr(endDate);

  return HOCKEY_HOLIDAYS.flatMap((h) => {
    const dates: string[] = [];
    for (let y = startYear; y <= endYear; y++) {
      for (const d of h.compute(y)) {
        const ds = toLocalDateStr(d);
        if (ds >= startStr && ds <= endStr) dates.push(ds);
      }
    }
    return dates.length > 0 ? [{ id: h.id, label: h.label, dates }] : [];
  });
}

export function ScheduleConfigStep({
  config,
  setConfig,
  templates,
  selectedTemplateId,
  onApplyTemplate,
  venues,
  teams,
  teamCount,
}: ScheduleConfigStepProps) {
  // Detect divisions from team data
  const divisionIds = new Set(teams.filter((t) => t.divisionId).map((t) => t.divisionId!));
  const hasDivisions = divisionIds.size > 1;
  // Calculate expected games
  const gamesPerRound = Math.floor(teamCount / 2);
  const rounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
  const totalGames = gamesPerRound * rounds * (config.scheduleType === 'double_round_robin' ? 2 : 1);

  // Max games fillable in the current date range with the selected game days (minus holidays)
  const maxFillableGames = config.gameDays.length > 0
    ? countAvailableSlots(config.startDate, config.endDate, config.gameDays, config.holidayDates)
    : 0;

  // Holidays detected in the date range
  const detectedHolidays = getHolidaysInRange(config.startDate, config.endDate);

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

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-2" />
          Schedule Date Range
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
        {maxFillableGames > 0 && (
          <p className="text-xs text-neutral-500 mt-1">
            {maxFillableGames} game-day slot{maxFillableGames !== 1 ? 's' : ''} available in this date range with selected game days
          </p>
        )}
      </div>

      {/* Games Per Team Input (for custom mode) */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Users className="w-4 h-4 inline mr-2" />
          Regular Season Games Per Team
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            min={teamCount > 1 ? teamCount - 1 : 1}
            max={200}
            value={config.gamesPerTeam}
            onChange={(e) => {
              const value = parseInt(e.target.value) || teamCount - 1;
              setConfig((prev) => ({
                ...prev,
                gamesPerTeam: Math.max(teamCount - 1, Math.min(200, value)),
                scheduleType: 'custom', // Switch to custom when manually editing
              }));
            }}
            className="w-24 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-rink-500"
          />
          <span className="text-sm text-neutral-400">
            games per team ({totalGames} total games)
          </span>
          {maxFillableGames > 0 && config.gamesPerTeam !== maxFillableGames && (
            <button
              type="button"
              onClick={() => setConfig((prev) => ({
                ...prev,
                gamesPerTeam: maxFillableGames,
                scheduleType: 'custom',
              }))}
              className="px-3 py-1.5 text-xs font-medium text-rink-400 bg-rink-500/10 border border-rink-500/30 rounded-lg hover:bg-rink-500/20 transition-colors"
            >
              Fill date range ({maxFillableGames})
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          Minimum: {teamCount - 1} games (play each team once). Use &ldquo;Fill date range&rdquo; to schedule all available game days.
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
          <div className="mt-4 space-y-4">
            {/* Qualification Mode Toggle (only show when divisions exist) */}
            {hasDivisions && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Qualification Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfig((prev) => ({ ...prev, playoffQualificationMode: 'count' }))}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      config.playoffQualificationMode === 'count'
                        ? 'border-rink-500 bg-rink-500/10'
                        : 'border-neutral-700 hover:border-rink-500/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-rink-500" />
                      <span className="font-medium text-white">Top N Teams</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">Fixed number of teams qualify overall</p>
                  </button>
                  <button
                    onClick={() => setConfig((prev) => ({ ...prev, playoffQualificationMode: 'percentage' }))}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      config.playoffQualificationMode === 'percentage'
                        ? 'border-rink-500 bg-rink-500/10'
                        : 'border-neutral-700 hover:border-rink-500/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-rink-500" />
                      <span className="font-medium text-white">Top X% of Division</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">Proportional qualification per division</p>
                  </button>
                </div>
              </div>
            )}

            {/* Count mode: existing "Top N" buttons */}
            {config.playoffQualificationMode === 'count' && (
              <div>
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
              </div>
            )}

            {/* Percentage mode: slider + per-division preview */}
            {config.playoffQualificationMode === 'percentage' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-neutral-300">
                  Playoff Qualification Percentage
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={config.playoffPercentage}
                    onChange={(e) => setConfig((prev) => ({ ...prev, playoffPercentage: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-rink-500"
                  />
                  <span className="text-lg font-semibold text-rink-500 w-14 text-right">
                    {config.playoffPercentage}%
                  </span>
                </div>

                {/* Per-division preview */}
                {hasDivisions && (() => {
                  const divisionTeams = new Map<string, Team[]>();
                  for (const team of teams) {
                    if (team.divisionId) {
                      const existing = divisionTeams.get(team.divisionId) ?? [];
                      existing.push(team);
                      divisionTeams.set(team.divisionId, existing);
                    }
                  }
                  let totalQualifying = 0;
                  const divisionPreviews = Array.from(divisionTeams.entries()).map(([divId, divTeams]) => {
                    const qualifying = Math.max(2, Math.ceil(divTeams.length * config.playoffPercentage / 100));
                    totalQualifying += qualifying;
                    return { divId, teamCount: divTeams.length, qualifying };
                  });

                  return (
                    <div className="p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Division Breakdown</p>
                      {divisionPreviews.map((dp) => (
                        <div key={dp.divId} className="flex items-center justify-between text-sm">
                          <span className="text-neutral-300">Division ({dp.teamCount} teams)</span>
                          <span className="text-rink-400 font-medium">
                            Top {dp.qualifying} qualify ({Math.round(dp.qualifying / dp.teamCount * 100)}%)
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-neutral-700 pt-2 flex items-center justify-between text-sm">
                        <span className="text-neutral-300 font-medium">Total playoff teams</span>
                        <span className="text-rink-500 font-semibold">{totalQualifying}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Playoff Info */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
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
                  {config.playoffQualificationMode === 'percentage' && (
                    <p className="mt-1 text-blue-400/80">
                      Minimum 2 teams per division will always qualify regardless of percentage.
                    </p>
                  )}
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

      {/* Constraints Hint */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-300">
          <p className="font-medium text-blue-200">Venue availability &amp; constraints</p>
          <p className="mt-1">
            Venue availability windows, blackout dates, time restrictions, and team priority rules can be configured in the next step.
          </p>
        </div>
      </div>

      {/* Division-Aware Scheduling */}
      {hasDivisions && (
        <div className="border-t border-neutral-800 pt-6 space-y-4">
          <label className="block text-sm font-medium text-neutral-300">
            <GitBranch className="w-4 h-4 inline mr-2" />
            Division-Aware Scheduling
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.divisionAware}
              onChange={(e) => setConfig((prev) => ({ ...prev, divisionAware: e.target.checked }))}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
            />
            <span className="text-sm text-neutral-300">Schedule games by division</span>
          </label>

          {config.divisionAware && (
            <>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Cross-division games per team
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={config.crossDivisionGamesPerTeam}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setConfig((prev) => ({
                        ...prev,
                        crossDivisionGamesPerTeam: Math.max(0, Math.min(10, value)),
                      }));
                    }}
                    className="w-24 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-rink-500"
                  />
                  <span className="text-sm text-neutral-400">
                    games against other divisions
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-300">
                    Teams will primarily play within their division ({divisionIds.size} divisions detected),
                    with {config.crossDivisionGamesPerTeam} game{config.crossDivisionGamesPerTeam !== 1 ? 's' : ''} against
                    teams from other divisions.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bye Weeks */}
      <div className="border-t border-neutral-800 pt-6 space-y-4">
        <label className="block text-sm font-medium text-neutral-300">
          <CalendarOff className="w-4 h-4 inline mr-2" />
          Bye Weeks (Rest Weeks)
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.allowByeWeeks}
            onChange={(e) => setConfig((prev) => ({ ...prev, allowByeWeeks: e.target.checked }))}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
          />
          <span className="text-sm text-neutral-300">Allow bye weeks</span>
        </label>

        {config.allowByeWeeks && (
          <>
            <div>
              <label className="block text-sm text-neutral-400 mb-2">
                Bye weeks per team
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={config.byeWeeksPerTeam}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setConfig((prev) => ({
                      ...prev,
                      byeWeeksPerTeam: Math.max(1, Math.min(4, value)),
                    }));
                  }}
                  className="w-24 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-rink-500"
                />
                <span className="text-sm text-neutral-400">
                  rest week{config.byeWeeksPerTeam !== 1 ? 's' : ''} per team
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-300">
                  {teamCount % 2 === 1
                    ? `With ${teamCount} teams (odd), each team naturally gets 1 bye per cycle. `
                    : ''}
                  Bye weeks will be distributed evenly throughout the season. No team will have
                  consecutive bye weeks.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Holiday Avoidance */}
      <div className="border-t border-neutral-800 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-300 flex items-center gap-2 cursor-pointer">
            <Snowflake className="w-4 h-4" />
            Holiday Avoidance
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.skipHolidays}
              onChange={(e) => {
                const enabled = e.target.checked;
                if (enabled) {
                  // Pre-populate all detected holidays
                  const allDates = detectedHolidays.flatMap((h) => h.dates);
                  setConfig((prev) => ({ ...prev, skipHolidays: true, holidayDates: allDates }));
                } else {
                  setConfig((prev) => ({ ...prev, skipHolidays: false, holidayDates: [] }));
                }
              }}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
            />
            <span className="text-sm text-neutral-300">Skip major holidays</span>
          </label>
        </div>

        {config.skipHolidays && (
          <div className="space-y-2">
            {detectedHolidays.length === 0 ? (
              <p className="text-sm text-neutral-500">No major holidays fall within the selected date range.</p>
            ) : (
              <>
                <p className="text-xs text-neutral-500">
                  {detectedHolidays.length} holiday{detectedHolidays.length !== 1 ? 's' : ''} detected in this date range.
                  Checked dates will be skipped when generating the schedule.
                </p>
                <div className="space-y-1.5">
                  {detectedHolidays.map((holiday) =>
                    holiday.dates.map((ds) => {
                      const checked = config.holidayDates.includes(ds);
                      const displayDate = new Date(ds + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      });
                      return (
                        <label
                          key={`${holiday.id}-${ds}`}
                          className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-neutral-800/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfig((prev) => ({
                                  ...prev,
                                  holidayDates: [...prev.holidayDates, ds].sort(),
                                }));
                              } else {
                                setConfig((prev) => ({
                                  ...prev,
                                  holidayDates: prev.holidayDates.filter((d) => d !== ds),
                                }));
                              }
                            }}
                            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-rink-500 focus:ring-rink-500"
                          />
                          <span className="text-sm text-neutral-300">{holiday.label}</span>
                          <span className="text-xs text-neutral-500 ml-auto">{displayDate}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const allDates = detectedHolidays.flatMap((h) => h.dates);
                      setConfig((prev) => ({ ...prev, holidayDates: allDates.sort() }));
                    }}
                    className="text-xs text-rink-400 hover:text-rink-300 transition-colors"
                  >
                    Select all
                  </button>
                  <span className="text-xs text-neutral-600">·</span>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, holidayDates: [] }))}
                    className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                  >
                    Deselect all
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
