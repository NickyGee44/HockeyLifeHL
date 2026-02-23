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
      // STRIPE_PRICE_IDS is captured at module load time, so we need to
      // re-import the module with a clean environment to test missing env vars
      jest.resetModules();
      const savedVal = process.env.STRIPE_PRICE_ENTERPRISE;
      delete process.env.STRIPE_PRICE_ENTERPRISE;

      const { getPriceIdByTier: freshGetPriceIdByTier } = require('../client');

      expect(() => freshGetPriceIdByTier('enterprise')).toThrow(
        /Stripe price ID not configured for tier: enterprise/
      );
      process.env.STRIPE_PRICE_ENTERPRISE = savedVal;
    });

    it('should throw error with helpful message', () => {
      jest.resetModules();
      const savedVal = process.env.STRIPE_PRICE_ENTERPRISE;
      delete process.env.STRIPE_PRICE_ENTERPRISE;

      const { getPriceIdByTier: freshGetPriceIdByTier } = require('../client');

      expect(() => freshGetPriceIdByTier('enterprise')).toThrow(
        /Please set STRIPE_PRICE_ENTERPRISE in your environment/
      );
      process.env.STRIPE_PRICE_ENTERPRISE = savedVal;
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
