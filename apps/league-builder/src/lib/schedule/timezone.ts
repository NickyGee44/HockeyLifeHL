/**
 * Schedule timezone helpers.
 *
 * These utilities keep schedule generation and grouping aligned to the
 * league timezone instead of server/browser local timezone.
 */

export const DEFAULT_SCHEDULE_TIMEZONE = 'America/Toronto';

export const SCHEDULE_TIMEZONES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'America/Toronto', label: 'Eastern Time - Canada (ET)' },
  { value: 'America/Winnipeg', label: 'Central Time - Canada (CT)' },
  { value: 'America/Edmonton', label: 'Mountain Time - Canada (MT)' },
  { value: 'America/Vancouver', label: 'Pacific Time - Canada (PT)' },
  { value: 'America/Halifax', label: 'Atlantic Time (AT)' },
  { value: 'America/St_Johns', label: 'Newfoundland Time (NT)' },
];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPart['type']): number {
  const value = parts.find((p) => p.type === type)?.value;
  return Number(value ?? '0');
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTimeValue(timeValue: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
  if (!match) {
    return { hour: 0, minute: 0 };
  }

  return {
    hour: Math.min(23, Math.max(0, Number(match[1]))),
    minute: Math.min(59, Math.max(0, Number(match[2]))),
  };
}

function getDateTimePartsInTimeZone(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  return {
    year: getPart(parts, 'year'),
    month: getPart(parts, 'month'),
    day: getPart(parts, 'day'),
    hour: getPart(parts, 'hour'),
    minute: getPart(parts, 'minute'),
    second: getPart(parts, 'second'),
  };
}

export function resolveScheduleTimeZone(timeZone?: string | null): string {
  if (!timeZone) {
    return DEFAULT_SCHEDULE_TIMEZONE;
  }

  return isValidIanaTimeZone(timeZone) ? timeZone : DEFAULT_SCHEDULE_TIMEZONE;
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const tz = resolveScheduleTimeZone(timeZone);
  const parts = getDateTimePartsInTimeZone(date, tz);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function getTimeStringInTimeZone(date: Date, timeZone: string): string {
  const tz = resolveScheduleTimeZone(timeZone);
  const parts = getDateTimePartsInTimeZone(date, tz);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function formatDateInTimeZone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-US'
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: resolveScheduleTimeZone(timeZone),
  }).format(date);
}

export function toDatetimeLocalInTimeZone(date: Date, timeZone: string): string {
  const parts = getDateTimePartsInTimeZone(date, resolveScheduleTimeZone(timeZone));
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function parseDatetimeLocalInTimeZone(value: string, timeZone: string): Date {
  const [dateKey, timeWithSeconds] = value.split('T');
  if (!dateKey || !timeWithSeconds) {
    throw new Error(`Invalid datetime-local value: ${value}`);
  }

  return createDateAtTimeInTimeZone(dateKey, timeWithSeconds.slice(0, 5), timeZone);
}

export function normalizeScheduledAtInput(
  value: Date | string,
  timeZone: string,
): Date {
  if (value instanceof Date) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Invalid scheduled_at value: empty string');
  }

  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
    return new Date(trimmed);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return parseDatetimeLocalInTimeZone(trimmed.slice(0, 16), timeZone);
  }

  return new Date(trimmed);
}

export function getDayOfWeekInTimeZone(date: Date, timeZone: string): number {
  const dateKey = getDateKeyInTimeZone(date, timeZone);
  return getDayOfWeekForDateKey(dateKey);
}

export function getUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getDayOfWeekForDateKey(dateKey: string): number {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)).getUTCDay();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

export function shiftDatetimeLocalByDays(value: string, days: number, timeZone: string): string {
  const [dateKey, timeWithSeconds] = value.split('T');
  if (!dateKey || !timeWithSeconds) {
    return value;
  }

  const shiftedDateKey = addDaysToDateKey(dateKey, days);
  const timeValue = timeWithSeconds.slice(0, 5);
  return toDatetimeLocalInTimeZone(
    createDateAtTimeInTimeZone(shiftedDateKey, timeValue, timeZone),
    timeZone
  );
}

/**
 * Convert a local date+time in an IANA timezone into an absolute UTC Date.
 */
export function createDateAtTimeInTimeZone(
  dateKey: string,
  timeValue: string,
  timeZone: string
): Date {
  const tz = resolveScheduleTimeZone(timeZone);
  const { year, month, day } = parseDateKey(dateKey);
  const { hour, minute } = parseTimeValue(timeValue);

  // Initial guess treats local wall-clock time as UTC.
  let utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  // Iteratively converge to the instant that renders as desired local time.
  for (let i = 0; i < 3; i++) {
    const rendered = getDateTimePartsInTimeZone(new Date(utcMillis), tz);
    const renderedAsUtc = Date.UTC(
      rendered.year,
      rendered.month - 1,
      rendered.day,
      rendered.hour,
      rendered.minute,
      rendered.second,
      0
    );

    const diff = targetAsUtc - renderedAsUtc;
    if (diff === 0) {
      break;
    }

    utcMillis += diff;
  }

  return new Date(utcMillis);
}
