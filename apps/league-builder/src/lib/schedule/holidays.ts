/**
 * Shared holiday utilities for scheduling and blackout generation.
 *
 * These definitions focus on standard Canadian / Ontario holidays that
 * commonly affect beer league scheduling.
 */

export interface StandardHolidayDefinition {
  id: string;
  label: string;
  compute: (year: number) => Date[];
}

export interface StandardHolidayGroup {
  id: string;
  label: string;
  dates: string[];
}

export interface StandardHolidayDate {
  id: string;
  label: string;
  date: string;
}

function toLocalDate(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const diff = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + diff + (n - 1) * 7);
}

function lastWeekdayOnOrBefore(year: number, month: number, day: number, weekday: number): Date {
  const reference = new Date(year, month, day);
  const delta = (reference.getDay() - weekday + 7) % 7;
  return new Date(year, month, day - delta);
}

export const STANDARD_HOLIDAYS: StandardHolidayDefinition[] = [
  { id: 'new_years_day', label: "New Year's Day (Jan 1)", compute: (year) => [new Date(year, 0, 1)] },
  { id: 'family_day_on', label: 'Family Day (3rd Mon of Feb)', compute: (year) => [nthWeekdayOfMonth(year, 1, 1, 3)] },
  {
    id: 'good_friday',
    label: 'Good Friday',
    compute: (year) => {
      const easter = computeEaster(year);
      return [new Date(year, easter.getMonth(), easter.getDate() - 2)];
    },
  },
  { id: 'easter_sunday', label: 'Easter Sunday', compute: (year) => [computeEaster(year)] },
  {
    id: 'victoria_day',
    label: 'Victoria Day (Mon before May 25)',
    compute: (year) => [lastWeekdayOnOrBefore(year, 4, 24, 1)],
  },
  { id: 'canada_day', label: 'Canada Day (Jul 1)', compute: (year) => [new Date(year, 6, 1)] },
  {
    id: 'civic_holiday',
    label: 'Civic Holiday (1st Mon of Aug)',
    compute: (year) => [nthWeekdayOfMonth(year, 7, 1, 1)],
  },
  {
    id: 'labour_day',
    label: 'Labour Day (1st Mon of Sep)',
    compute: (year) => [nthWeekdayOfMonth(year, 8, 1, 1)],
  },
  {
    id: 'thanksgiving_ca',
    label: 'Thanksgiving (2nd Mon of Oct)',
    compute: (year) => [nthWeekdayOfMonth(year, 9, 1, 2)],
  },
  { id: 'remembrance_day', label: 'Remembrance Day (Nov 11)', compute: (year) => [new Date(year, 10, 11)] },
  { id: 'christmas_eve', label: 'Christmas Eve (Dec 24)', compute: (year) => [new Date(year, 11, 24)] },
  { id: 'christmas_day', label: 'Christmas Day (Dec 25)', compute: (year) => [new Date(year, 11, 25)] },
  { id: 'boxing_day', label: 'Boxing Day (Dec 26)', compute: (year) => [new Date(year, 11, 26)] },
  { id: 'new_years_eve', label: "New Year's Eve (Dec 31)", compute: (year) => [new Date(year, 11, 31)] },
];

export function getStandardHolidayGroupsInRange(
  startDate: Date | string,
  endDate: Date | string
): StandardHolidayGroup[] {
  const start = toLocalDate(startDate);
  const end = toLocalDate(endDate);

  if (end.getTime() < start.getTime()) {
    return [];
  }

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const startKey = toLocalDateString(start);
  const endKey = toLocalDateString(end);

  return STANDARD_HOLIDAYS.flatMap((holiday) => {
    const dates: string[] = [];

    for (let year = startYear; year <= endYear; year += 1) {
      for (const date of holiday.compute(year)) {
        const normalized = toLocalDateString(date);
        if (normalized >= startKey && normalized <= endKey) {
          dates.push(normalized);
        }
      }
    }

    return dates.length > 0
      ? [{ id: holiday.id, label: holiday.label, dates: dates.sort((a, b) => a.localeCompare(b)) }]
      : [];
  });
}

export function getStandardHolidayDatesInRange(
  startDate: Date | string,
  endDate: Date | string
): StandardHolidayDate[] {
  return getStandardHolidayGroupsInRange(startDate, endDate)
    .flatMap((holiday) => holiday.dates.map((date) => ({ id: holiday.id, label: holiday.label, date })))
    .sort((left, right) => {
      const dateCompare = left.date.localeCompare(right.date);
      return dateCompare !== 0 ? dateCompare : left.label.localeCompare(right.label);
    });
}
