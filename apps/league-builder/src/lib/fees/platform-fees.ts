/**
 * Platform Fee Configuration
 *
 * Two-level fee system:
 * 1. Platform defaults from `platform_fee_config` table (global)
 * 2. Per-league overrides from `league_billing_settings` table
 *
 * Revenue model:
 * - One-time setup fee ($4,999 CAD default) per league
 * - 3.5% processing fee (basis points: 350) on all player payments
 * - Fee mode: pass to player (default) or absorb by league
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface PlatformFeeConfig {
  processingFeePercent: number;
  setupFeeCents: number;
  migrationFeeCents: number;
  setupFeeLabel: string;
  migrationFeeLabel: string;
}

export type SetupFeeStatus = 'unbilled' | 'invoiced' | 'paid' | 'waived';
export type PlatformFeeMode = 'pass_to_player' | 'absorb_by_league';

export interface LeagueBillingConfig {
  leagueId: string;
  setupFeeAmountCents: number;
  setupFeeCurrency: string;
  setupFeeStatus: SetupFeeStatus;
  setupFeePaidAt: string | null;
  platformFeeBps: number;
  platformFeePercent: number; // derived: bps / 100
  platformFeeMode: PlatformFeeMode;
  stripeAccountId: string | null;
  stripeAccountStatus: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
}

// ============================================================================
// In-Memory Cache (5-minute TTL)
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedConfig: PlatformFeeConfig | null = null;
let cacheExpiresAt = 0;

const leagueBillingCache = new Map<string, { config: LeagueBillingConfig; expiresAt: number }>();

const DEFAULT_CONFIG: PlatformFeeConfig = {
  processingFeePercent: 3.5,
  setupFeeCents: 499900,
  migrationFeeCents: 0,
  setupFeeLabel: 'League Setup Fee',
  migrationFeeLabel: 'Historic Data Import',
};

// ============================================================================
// Platform-Level Config (global defaults)
// ============================================================================

export async function getPlatformFeeConfig(): Promise<PlatformFeeConfig> {
  const now = Date.now();

  if (cachedConfig && now < cacheExpiresAt) {
    return cachedConfig;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('get_platform_fee_config');

    if (error || !data || data.length === 0) {
      console.error('[Fees] Failed to fetch platform fee config:', error?.message);
      return DEFAULT_CONFIG;
    }

    const row = data[0];
    cachedConfig = {
      processingFeePercent: Number(row.processing_fee_percent),
      setupFeeCents: row.setup_fee_cents,
      migrationFeeCents: row.migration_fee_cents,
      setupFeeLabel: row.setup_fee_label,
      migrationFeeLabel: row.migration_fee_label,
    };
    cacheExpiresAt = now + CACHE_TTL_MS;

    return cachedConfig;
  } catch (err) {
    console.error('[Fees] Unexpected error fetching fee config:', err);
    return DEFAULT_CONFIG;
  }
}

// ============================================================================
// League-Level Billing Config
// ============================================================================

/**
 * Get billing configuration for a specific league.
 * Uses in-memory cache with 5-minute TTL.
 */
export async function getLeagueBillingConfig(leagueId: string): Promise<LeagueBillingConfig> {
  const now = Date.now();
  const cached = leagueBillingCache.get(leagueId);

  if (cached && now < cached.expiresAt) {
    return cached.config;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('get_league_billing_settings', {
      p_league_id: leagueId,
    });

    if (error || !data || data.length === 0) {
      console.error('[Fees] Failed to fetch league billing config:', error?.message);
      // Return defaults based on platform config
      const platform = await getPlatformFeeConfig();
      return {
        leagueId,
        setupFeeAmountCents: platform.setupFeeCents,
        setupFeeCurrency: 'cad',
        setupFeeStatus: 'unbilled',
        setupFeePaidAt: null,
        platformFeeBps: Math.round(platform.processingFeePercent * 100),
        platformFeePercent: platform.processingFeePercent,
        platformFeeMode: 'pass_to_player',
        stripeAccountId: null,
        stripeAccountStatus: null,
        payoutsEnabled: false,
        chargesEnabled: false,
      };
    }

    const row = data[0];
    const config: LeagueBillingConfig = {
      leagueId: row.league_id,
      setupFeeAmountCents: row.setup_fee_amount_cents,
      setupFeeCurrency: row.setup_fee_currency,
      setupFeeStatus: row.setup_fee_status as SetupFeeStatus,
      setupFeePaidAt: row.setup_fee_paid_at,
      platformFeeBps: row.platform_fee_bps,
      platformFeePercent: row.platform_fee_bps / 100,
      platformFeeMode: row.platform_fee_mode as PlatformFeeMode,
      stripeAccountId: row.stripe_account_id,
      stripeAccountStatus: row.stripe_account_status,
      payoutsEnabled: row.payouts_enabled,
      chargesEnabled: row.charges_enabled,
    };

    leagueBillingCache.set(leagueId, { config, expiresAt: now + CACHE_TTL_MS });
    return config;
  } catch (err) {
    console.error('[Fees] Unexpected error fetching league billing config:', err);
    const platform = await getPlatformFeeConfig();
    return {
      leagueId,
      setupFeeAmountCents: platform.setupFeeCents,
      setupFeeCurrency: 'cad',
      setupFeeStatus: 'unbilled',
      setupFeePaidAt: null,
      platformFeeBps: Math.round(platform.processingFeePercent * 100),
      platformFeePercent: platform.processingFeePercent,
      platformFeeMode: 'pass_to_player',
      stripeAccountId: null,
      stripeAccountStatus: null,
      payoutsEnabled: false,
      chargesEnabled: false,
    };
  }
}

/** Invalidate cached billing config for a league (call after updates). */
export function invalidateLeagueBillingCache(leagueId: string): void {
  leagueBillingCache.delete(leagueId);
}

// ============================================================================
// Fee Calculation Helpers
// ============================================================================

/**
 * Calculate application fee using the platform default.
 * For per-league fee calculation, use calculateLeagueApplicationFee instead.
 */
export async function calculateApplicationFeeFromConfig(
  amountCents: number
): Promise<{ fee: number; percent: number }> {
  if (amountCents <= 0) return { fee: 0, percent: 0 };

  const config = await getPlatformFeeConfig();
  const fee = Math.round(amountCents * (config.processingFeePercent / 100));
  return { fee, percent: config.processingFeePercent };
}

/**
 * Calculate application fee for a specific league (uses per-league BPS).
 * Returns the fee amount, the percent, and the fee mode.
 */
export async function calculateLeagueApplicationFee(
  leagueId: string,
  amountCents: number
): Promise<{ fee: number; percent: number; mode: PlatformFeeMode }> {
  if (amountCents <= 0) return { fee: 0, percent: 0, mode: 'pass_to_player' };

  const billing = await getLeagueBillingConfig(leagueId);
  const fee = Math.round((amountCents * billing.platformFeeBps) / 10000);
  return { fee, percent: billing.platformFeePercent, mode: billing.platformFeeMode };
}

/**
 * Get the one-time setup fee from the DB config.
 */
export async function getSetupFee(): Promise<{ cents: number; label: string }> {
  const config = await getPlatformFeeConfig();
  return { cents: config.setupFeeCents, label: config.setupFeeLabel };
}

/**
 * Get the one-time migration (data import) fee from the DB config.
 */
export async function getMigrationFee(): Promise<{ cents: number; label: string }> {
  const config = await getPlatformFeeConfig();
  return { cents: config.migrationFeeCents, label: config.migrationFeeLabel };
}
