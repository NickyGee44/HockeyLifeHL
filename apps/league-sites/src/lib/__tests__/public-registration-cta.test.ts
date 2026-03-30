import { hasActiveSeasonRegistration } from '../registration/public-registration-cta';

describe('hasActiveSeasonRegistration', () => {
  it('treats submitted season registrations as active', () => {
    expect(hasActiveSeasonRegistration('pending')).toBe(true);
    expect(hasActiveSeasonRegistration('approved')).toBe(true);
    expect(hasActiveSeasonRegistration('waitlisted')).toBe(true);
    expect(hasActiveSeasonRegistration('submitted')).toBe(true);
  });

  it('does not treat auth-only or rejected states as active registrations', () => {
    expect(hasActiveSeasonRegistration('rejected')).toBe(false);
    expect(hasActiveSeasonRegistration(null)).toBe(false);
    expect(hasActiveSeasonRegistration(undefined)).toBe(false);
  });
});
