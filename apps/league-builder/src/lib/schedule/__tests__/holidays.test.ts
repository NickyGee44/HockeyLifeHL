import { getStandardHolidayDatesInRange, getStandardHolidayGroupsInRange } from '@/lib/schedule/holidays';

describe('schedule holiday utilities', () => {
  it('returns Ontario / Canadian standard holidays within a single-year range', () => {
    const holidays = getStandardHolidayDatesInRange('2026-01-01', '2026-12-31');

    expect(holidays).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'new_years_day', date: '2026-01-01' }),
        expect.objectContaining({ id: 'family_day_on', date: '2026-02-16' }),
        expect.objectContaining({ id: 'good_friday', date: '2026-04-03' }),
        expect.objectContaining({ id: 'canada_day', date: '2026-07-01' }),
        expect.objectContaining({ id: 'thanksgiving_ca', date: '2026-10-12' }),
        expect.objectContaining({ id: 'christmas_day', date: '2026-12-25' }),
      ])
    );
  });

  it('groups multi-year holiday ranges by holiday definition', () => {
    const groups = getStandardHolidayGroupsInRange('2026-12-20', '2027-01-05');

    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'christmas_eve', dates: ['2026-12-24'] }),
        expect.objectContaining({ id: 'christmas_day', dates: ['2026-12-25'] }),
        expect.objectContaining({ id: 'boxing_day', dates: ['2026-12-26'] }),
        expect.objectContaining({ id: 'new_years_eve', dates: ['2026-12-31'] }),
        expect.objectContaining({ id: 'new_years_day', dates: ['2027-01-01'] }),
      ])
    );
  });
});
