import { describe, expect, it } from '@jest/globals';
import {
  generateIdempotencyKey,
  generateTimedIdempotencyKey,
} from '@/lib/stripe/idempotency';

describe('stripe idempotency helpers', () => {
  it('generates deterministic keys for the same data regardless of object key order', () => {
    const keyA = generateIdempotencyKey('create_payment_intent', {
      amount: 5000,
      leagueId: 'league_1',
      userId: 'user_1',
    });

    const keyB = generateIdempotencyKey('create_payment_intent', {
      userId: 'user_1',
      amount: 5000,
      leagueId: 'league_1',
    });

    expect(keyA).toBe(keyB);
    expect(keyA.startsWith('create_payment_intent-')).toBe(true);
  });

  it('produces different deterministic keys for different payloads', () => {
    const keyA = generateIdempotencyKey('create_payment_intent', { amount: 5000 });
    const keyB = generateIdempotencyKey('create_payment_intent', { amount: 7500 });
    expect(keyA).not.toBe(keyB);
  });

  it('generates time-based keys with operation and unique id prefix', () => {
    const key = generateTimedIdempotencyKey('refund', 'pi_123');
    expect(key.startsWith('refund-pi_123-')).toBe(true);
  });
});

