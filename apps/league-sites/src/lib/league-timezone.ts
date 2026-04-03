export const DEFAULT_LEAGUE_TIMEZONE = 'America/Toronto';

type DateInput = string | Date | null | undefined;

function toValidDate(value: DateInput): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveLeagueTimezone(timeZone?: string | null): string {
  return timeZone || DEFAULT_LEAGUE_TIMEZONE;
}

export function formatInLeagueTimezone(
  value: DateInput,
  timeZone: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = 'TBD'
): string {
  const date = toValidDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: resolveLeagueTimezone(timeZone),
    ...options,
  }).format(date);
}

export function getLeagueDateKey(value: DateInput, timeZone?: string | null): string | null {
  const date = toValidDate(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveLeagueTimezone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

export function formatLeagueRelativeDateLabel(value: DateInput, timeZone?: string | null): string {
  const dateKey = getLeagueDateKey(value, timeZone);
  const todayKey = getLeagueDateKey(new Date(), timeZone);

  if (!dateKey || !todayKey) return 'TBD';
  if (dateKey === todayKey) return 'Today';
  if (dateKey === shiftDateKey(todayKey, 1)) return 'Tomorrow';
  if (dateKey === shiftDateKey(todayKey, -1)) return 'Yesterday';

  return formatLeagueShortDate(value, timeZone);
}

export function formatLeagueShortDate(value: DateInput, timeZone?: string | null): string {
  return formatInLeagueTimezone(value, timeZone, { month: 'short', day: 'numeric' });
}

export function formatLeagueShortWeekdayDate(value: DateInput, timeZone?: string | null): string {
  return formatInLeagueTimezone(value, timeZone, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatLeagueLongWeekdayDate(value: DateInput, timeZone?: string | null): string {
  return formatInLeagueTimezone(value, timeZone, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatLeagueLongCalendarDate(value: DateInput, timeZone?: string | null): string {
  return formatInLeagueTimezone(value, timeZone, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatLeagueTime(value: DateInput, timeZone?: string | null): string {
  return formatInLeagueTimezone(value, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
