/**
 * Unit Tests: Stripe Client Helpers
 *
 * Tests price/tier mapping functions for organization subscriptions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getPriceIdByTier, getTierByPriceId } from '../client';

describe('Stripe Client - Price/Tier Mapping', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getPriceIdByTier', () => {
    it('should return enterprise price ID for enterprise tier', () => {
      process.env.STRIPE_PRICE_ENTERPRISE = 'price_test_enterprise';

      const result = getPriceIdByTier('enterprise');

      expect(result).toBe('price_test_enterprise');
    });

    it('should throw error if enterprise price ID not configured', () => {
      delete process.env.STRIPE_PRICE_ENTERPRISE;

      expect(() => getPriceIdByTier('enterprise')).toThrow(
        /Stripe price ID not configured for tier: enterprise/
      );
    });

    it('should throw error with helpful message', () => {
      delete process.env.STRIPE_PRICE_ENTERPRISE;

      expect(() => getPriceIdByTier('enterprise')).toThrow(
        /Please set STRIPE_PRICE_ENTERPRISE in your environment/
      );
    });
  });

  describe('getTierByPriceId', () => {
    beforeEach(() => {
      process.env.STRIPE_PRICE_ENTERPRISE = 'price_test_enterprise';
    });

    it('should return enterprise for enterprise price ID', () => {
      const result = getTierByPriceId('price_test_enterprise');

      expect(result).toBe('enterprise');
    });

    it('should return null for unknown price ID', () => {
      const result = getTierByPriceId('price_unknown_12345');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = getTierByPriceId('');

      expect(result).toBeNull();
    });

    it('should handle case sensitivity correctly', () => {
      // Price IDs are case-sensitive in Stripe
      const result = getTierByPriceId('PRICE_TEST_ENTERPRISE');

      expect(result).toBeNull();
    });

    it('should handle null price ID gracefully', () => {
      const result = getTierByPriceId(null as any);

      expect(result).toBeNull();
    });

    it('should handle undefined price ID gracefully', () => {
      const result = getTierByPriceId(undefined as any);

      expect(result).toBeNull();
    });
  });

  describe('Round-trip conversion', () => {
    beforeEach(() => {
      process.env.STRIPE_PRICE_ENTERPRISE = 'price_test_enterprise';
    });

    it('should convert tier -> price -> tier correctly', () => {
      const priceId = getPriceIdByTier('enterprise');
      const tier = getTierByPriceId(priceId);

      expect(tier).toBe('enterprise');
    });
  });
});
