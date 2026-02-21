import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_SCHEDULE_TIMEZONE,
  createDateAtTimeInTimeZone,
  getDateKeyInTimeZone,
  getTimeStringInTimeZone,
  resolveScheduleTimeZone,
} from '@/lib/schedule/timezone';

describe('schedule timezone utilities', () => {
  it('converts local league date/time into a UTC Date while preserving local display', () => {
    const date = createDateAtTimeInTimeZone(
      '2026-01-15',
      '19:30',
      'America/Toronto'
    );

    expect(getDateKeyInTimeZone(date, 'America/Toronto')).toBe('2026-01-15');
    expect(getTimeStringInTimeZone(date, 'America/Toronto')).toBe('19:30');
  });

  it('falls back to the default timezone when input is missing or invalid', () => {
    expect(resolveScheduleTimeZone(undefined)).toBe(DEFAULT_SCHEDULE_TIMEZONE);
    expect(resolveScheduleTimeZone(null)).toBe(DEFAULT_SCHEDULE_TIMEZONE);
    expect(resolveScheduleTimeZone('Mars/Phobos')).toBe(DEFAULT_SCHEDULE_TIMEZONE);
  });

  it('renders schedule times in each league timezone (timezone display behavior)', () => {
    const utcGame = new Date('2026-01-15T01:00:00.000Z');

    expect(getTimeStringInTimeZone(utcGame, 'America/Toronto')).toBe('20:00');
    expect(getTimeStringInTimeZone(utcGame, 'America/Vancouver')).toBe('17:00');
  });
});

