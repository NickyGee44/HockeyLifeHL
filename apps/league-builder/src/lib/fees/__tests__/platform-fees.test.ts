import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  determinePricingTier,
  getEffectiveRateBps,
  getLeagueBillingConfig,
  invalidateLeagueBillingCache,
} from '../platform-fees';

describe('platform fees', () => {
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateLeagueBillingCache('league-1');
  });

  it('assigns pricing tiers using the configured thresholds', () => {
    expect(determinePricingTier(8, 4_000_000)).toBe('small');
    expect(determinePricingTier(12, 4_000_000)).toBe('standard');
    expect(determinePricingTier(120, 20_000_000)).toBe('large');
    expect(determinePricingTier(12, 250_000_000)).toBe('enterprise');
  });

  it('caps referral discounts and preserves the 2.75% enterprise floor', () => {
    expect(getEffectiveRateBps('standard', 25)).toBe(325);
    expect(getEffectiveRateBps('large', 100)).toBe(275);
    expect(getEffectiveRateBps('enterprise', 50)).toBe(275);
    expect(getEffectiveRateBps('small', 75)).toBe(0);
  });

  it('hydrates league billing config from the RPC including tiered pricing fields', async () => {
    mockCreateServiceRoleClient.mockReturnValue({
      rpc: jest.fn(async (fn: string) => {
        if (fn === 'get_league_billing_settings') {
          return {
            data: [
              {
                league_id: 'league-1',
                setup_fee_amount_cents: 0,
                setup_fee_currency: 'cad',
                setup_fee_status: 'paid',
                setup_fee_paid_at: '2026-03-06T00:00:00.000Z',
                platform_fee_bps: 325,
                platform_fee_mode: 'pass_to_player',
                stripe_account_id: 'acct_123',
                stripe_account_status: 'active',
                payouts_enabled: true,
                charges_enabled: true,
                pricing_tier: 'large',
                monthly_floor_cents: 50_000,
                contract_term_months: 24,
                referral_discount_bps: 50,
                flat_season_fee_cents: 0,
              },
            ],
            error: null,
          };
        }

        throw new Error(`Unexpected RPC call: ${fn}`);
      }),
    } as never);

    const config = await getLeagueBillingConfig('league-1');

    expect(config).toMatchObject({
      leagueId: 'league-1',
      pricingTier: 'large',
      monthlyFloorCents: 50_000,
      contractTermMonths: 24,
      referralDiscountBps: 50,
      flatSeasonFeeCents: 0,
      platformFeePercent: 3.25,
    });
  });
});
