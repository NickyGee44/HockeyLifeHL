import { describe, expect, it } from '@jest/globals';
import {
  buildRegistrationPaymentQuote,
  calculatePlatformFeeCents,
} from '@/lib/registration/payment-pricing';

describe('registration payment pricing', () => {
  it('adds the platform fee to the player total when the league passes it through', () => {
    const quote = buildRegistrationPaymentQuote({
      baseFeeCents: 50_000,
      baseAmountPaidCents: 0,
      platformFeeBps: 300,
      platformFeeMode: 'pass_to_player',
    });

    expect(quote.applicationFeeCents).toBe(1_500);
    expect(quote.platformFeeCents).toBe(1_500);
    expect(quote.totalChargeCents).toBe(51_500);
    expect(quote.outstandingChargeCents).toBe(51_500);
  });

  it('keeps the player total at the league fee when the league absorbs the platform fee', () => {
    const quote = buildRegistrationPaymentQuote({
      baseFeeCents: 50_000,
      baseAmountPaidCents: 0,
      platformFeeBps: 300,
      platformFeeMode: 'absorb_by_league',
    });

    expect(quote.applicationFeeCents).toBe(1_500);
    expect(quote.platformFeeCents).toBe(0);
    expect(quote.totalChargeCents).toBe(50_000);
    expect(quote.outstandingChargeCents).toBe(50_000);
  });

  it('tracks remaining due and paid display values from the base amount paid', () => {
    const quote = buildRegistrationPaymentQuote({
      baseFeeCents: 50_000,
      baseAmountPaidCents: 25_000,
      platformFeeBps: 300,
      platformFeeMode: 'pass_to_player',
    });

    expect(quote.baseAmountDueCents).toBe(25_000);
    expect(quote.platformFeeCents).toBe(750);
    expect(quote.outstandingChargeCents).toBe(25_750);
    expect(quote.totalPaidDisplayCents).toBe(25_750);
  });

  it('enforces the minimum platform fee when the calculated fee would be too small', () => {
    expect(calculatePlatformFeeCents(1_000, 300)).toBe(50);
  });
});
