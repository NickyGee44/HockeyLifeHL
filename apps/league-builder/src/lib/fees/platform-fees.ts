/**
 * Platform Fee Configuration
 *
 * Two-level fee system:
 * 1. Platform defaults from `platform_fee_config` table (global)
 * 2. Per-league overrides from `league_billing_settings` table
 *
 * Revenue model (ratified 2026-03-02):
 * - Tiered pricing based on team count and gross registration fees
 * - Small     (<10 teams AND <$50K fees):  $299/season flat
 * - Standard  (10–99 teams OR $50K–$499K): 3.5% of gross reg fees, $250/mo floor
 * - Large     (100–499 teams):             3.25% + 2-year contract, $500/mo floor
 * - Enterprise (500+ teams OR $2M+ fees):  2.75–3.0% negotiated, multi-year
 * - Fee mode: pass to player (default) or absorb by league
 * - Referral discount: 0.25% per referral, max 0.75% off, floor 2.75%
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
export type PricingTier = 'small' | 'standard' | 'large' | 'enterprise';

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
  pricingTier: PricingTier;
  monthlyFloorCents: number;
  contractTermMonths: number;
  referralDiscountBps: number;
  flatSeasonFeeCents: number;
  playerFeeSharePercent: number;
  // Floor subscription tracking (added by 20260306_auto_tier_columns migration)
  floorStripeSubscriptionId: string | null;
  floorStripeProductId: string | null;
  stripeBillingCustomerId: string | null;
}

// ============================================================================
// Tier Constants
// ============================================================================

/** Thresholds that determine which pricing tier a league falls into. */
export const TIER_THRESHOLDS = {
  /** Max teams (exclusive) to qualify for Small tier */
  SMALL_MAX_TEAMS: 10,
  /** Max gross fees in cents (exclusive) to qualify for Small tier */
  SMALL_MAX_FEES_CENTS: 5_000_000, // $50,000
  /** Min teams (inclusive) to qualify for Large tier */
  LARGE_MIN_TEAMS: 100,
  /** Min teams (inclusive) to qualify for Enterprise tier */
  ENTERPRISE_MIN_TEAMS: 500,
  /** Min gross fees in cents (inclusive) to qualify for Enterprise tier */
  ENTERPRISE_MIN_FEES_CENTS: 200_000_000, // $2,000,000
} as const;

/** Rate in basis points per tier (100 bps = 1%). Enterprise is the lower bound. */
export const TIER_RATE_BPS: Record<PricingTier, number> = {
  small: 0,       // flat fee — no % rate
  standard: 350,  // 3.5%
  large: 325,     // 3.25%
  enterprise: 275, // 2.75% floor (negotiated up to 3.0%)
};

/** Monthly floor in cents per tier. 0 = no floor. */
export const TIER_MONTHLY_FLOOR_CENTS: Record<PricingTier, number> = {
  small: 0,
  standard: 25_000,   // $250/mo
  large: 50_000,      // $500/mo
  enterprise: -1,     // negotiated — -1 signals "contact sales"
};

/** Default contract term in months per tier. 0 = none. */
export const TIER_CONTRACT_MONTHS: Record<PricingTier, number> = {
  small: 0,
  standard: 12,
  large: 24,
  enterprise: 36, // multi-year baseline
};

/** Flat season fee in cents (only used for Small tier). */
export const SMALL_TIER_FLAT_FEE_CENTS = 29_900; // $299 CAD

// ============================================================================
// Tier Determination & Helpers
// ============================================================================

/**
 * Determine which pricing tier applies to a league.
 * Tier is locked at registration open and based on expected team count
 * and total gross registration fees processed through BLH.
 *
 * Evaluation order: enterprise → large → standard → small.
 * Meeting *either* criterion for a higher tier bumps the league up.
 */
export function determinePricingTier(
  teamCount: number,
  totalFeesCents: number
): PricingTier {
  const { ENTERPRISE_MIN_TEAMS, ENTERPRISE_MIN_FEES_CENTS, LARGE_MIN_TEAMS, SMALL_MAX_TEAMS, SMALL_MAX_FEES_CENTS } =
    TIER_THRESHOLDS;

  if (teamCount >= ENTERPRISE_MIN_TEAMS || totalFeesCents >= ENTERPRISE_MIN_FEES_CENTS) {
    return 'enterprise';
  }
  if (teamCount >= LARGE_MIN_TEAMS) {
    return 'large';
  }
  if (teamCount < SMALL_MAX_TEAMS && totalFeesCents < SMALL_MAX_FEES_CENTS) {
    return 'small';
  }
  return 'standard';
}

/**
 * Get the platform fee rate in basis points for a given tier.
 * For enterprise tiers, returns the floor rate (275 bps = 2.75%).
 * Small tier returns 0 — it uses a flat season fee instead.
 */
export function getTierRate(tier: PricingTier): number {
  return TIER_RATE_BPS[tier];
}

/**
 * Get the monthly floor in cents for a given tier.
 * Returns -1 for enterprise (negotiated — caller should treat as "contact sales").
 * Returns 0 for small (no monthly floor).
 */
export function getMonthlyFloorCents(tier: PricingTier): number {
  return TIER_MONTHLY_FLOOR_CENTS[tier];
}

/**
 * Calculate the effective fee rate in bps after applying referral discounts.
 * Capped at 75 bps total discount; effective floor is 275 bps (2.75%).
 */
export function getEffectiveRateBps(tier: PricingTier, referralDiscountBps: number): number {
  const base = TIER_RATE_BPS[tier];
  if (base === 0) return 0; // small tier: flat fee, no percentage
  const discount = Math.min(referralDiscountBps, 75);
  return Math.max(base - discount, 275);
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
  setupFeeCents: 0,
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
        pricingTier: 'standard',
        monthlyFloorCents: TIER_MONTHLY_FLOOR_CENTS.standard,
        contractTermMonths: TIER_CONTRACT_MONTHS.standard,
        referralDiscountBps: 0,
        flatSeasonFeeCents: 0,
        playerFeeSharePercent: 100,
        floorStripeSubscriptionId: null,
        floorStripeProductId: null,
        stripeBillingCustomerId: null,
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
      pricingTier: (row.pricing_tier ?? 'standard') as PricingTier,
      monthlyFloorCents: row.monthly_floor_cents ?? TIER_MONTHLY_FLOOR_CENTS.standard,
      contractTermMonths: row.contract_term_months ?? TIER_CONTRACT_MONTHS.standard,
      referralDiscountBps: row.referral_discount_bps ?? 0,
      flatSeasonFeeCents: row.flat_season_fee_cents ?? 0,
      playerFeeSharePercent: (row as Record<string, unknown>).player_fee_share_percent as number ?? 100,
      floorStripeSubscriptionId: row.floor_stripe_subscription_id ?? null,
      floorStripeProductId: row.floor_stripe_product_id ?? null,
      stripeBillingCustomerId: row.stripe_billing_customer_id ?? null,
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
      pricingTier: 'standard',
      monthlyFloorCents: TIER_MONTHLY_FLOOR_CENTS.standard,
      contractTermMonths: TIER_CONTRACT_MONTHS.standard,
      referralDiscountBps: 0,
      flatSeasonFeeCents: 0,
      playerFeeSharePercent: 100,
      floorStripeSubscriptionId: null,
      floorStripeProductId: null,
      stripeBillingCustomerId: null,
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
): Promise<{ fee: number; percent: number; mode: PlatformFeeMode; playerFeeSharePercent: number }> {
  if (amountCents <= 0) return { fee: 0, percent: 0, mode: 'pass_to_player', playerFeeSharePercent: 100 };

  const billing = await getLeagueBillingConfig(leagueId);
  const fee = Math.round((amountCents * billing.platformFeeBps) / 10000);
  return { fee, percent: billing.platformFeePercent, mode: billing.platformFeeMode, playerFeeSharePercent: billing.playerFeeSharePercent };
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

// ============================================================================
// Auto-Tier Assignment
// ============================================================================

export interface AssignTierResult {
  tier: PricingTier;
  platformFeeBps: number;
  monthlyFloorCents: number;
  flatSeasonFeeCents: number;
  contractTermMonths: number;
}

/**
 * Determine and lock the pricing tier for a league based on current team count
 * and total registration fees processed.
 *
 * Tier is locked at registration open. Call this when a season's registration
 * opens (or when a platform admin manually triggers it).
 *
 * - Queries team count + total paid fees from the DB if not provided in options.
 * - Applies referral discount to the effective bps stored in platform_fee_bps.
 * - Small tier sets platform_fee_bps = 0 (flat $299 season fee instead).
 * - Invalidates the in-memory billing cache after update.
 */
export async function assignLeaguePricingTier(
  leagueId: string,
  options: {
    teamCount?: number;
    estimatedFeesCents?: number;
    referralDiscountBps?: number;
  } = {}
): Promise<AssignTierResult> {
  const supabase = createServiceRoleClient();

  // ── Resolve team count ──────────────────────────────────────────────────
  let teamCount = options.teamCount;
  if (teamCount === undefined) {
    const { count } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId);
    teamCount = count ?? 0;
  }

  // ── Resolve estimated fees (sum of completed player payments) ───────────
  let estimatedFeesCents = options.estimatedFeesCents;
  if (estimatedFeesCents === undefined) {
    const { data: payments } = await supabase
      .from('player_payments')
      .select('total_amount_cents')
      .eq('league_id', leagueId)
      .eq('status', 'paid');
    estimatedFeesCents =
      payments?.reduce((sum, p) => sum + (p.total_amount_cents ?? 0), 0) ?? 0;
  }

  const referralDiscountBps = options.referralDiscountBps ?? 0;

  const tier = determinePricingTier(teamCount, estimatedFeesCents);
  const effectiveBps = getEffectiveRateBps(tier, referralDiscountBps);
  // Enterprise floor is negotiated; store 0 in the column (display layer handles it)
  const monthlyFloorCents = Math.max(0, TIER_MONTHLY_FLOOR_CENTS[tier]);
  const flatSeasonFeeCents = tier === 'small' ? SMALL_TIER_FLAT_FEE_CENTS : 0;
  const contractTermMonths = TIER_CONTRACT_MONTHS[tier];

  const { error } = await supabase
    .from('league_billing_settings')
    .update({
      pricing_tier: tier,
      platform_fee_bps: effectiveBps,
      monthly_floor_cents: monthlyFloorCents,
      flat_season_fee_cents: flatSeasonFeeCents,
      contract_term_months: contractTermMonths,
      referral_discount_bps: referralDiscountBps,
    })
    .eq('league_id', leagueId);

  if (error) {
    throw new Error(`[Fees] Failed to assign pricing tier: ${error.message}`);
  }

  invalidateLeagueBillingCache(leagueId);

  return { tier, platformFeeBps: effectiveBps, monthlyFloorCents, flatSeasonFeeCents, contractTermMonths };
}

/**
 * Save floor subscription IDs back to league_billing_settings.
 * Called after successfully creating the Stripe floor subscription.
 */
export async function saveFloorSubscription(
  leagueId: string,
  data: {
    floorStripeSubscriptionId: string;
    floorStripeProductId: string;
    stripeBillingCustomerId: string;
  }
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('league_billing_settings')
    .update({
      floor_stripe_subscription_id: data.floorStripeSubscriptionId,
      floor_stripe_product_id: data.floorStripeProductId,
      stripe_billing_customer_id: data.stripeBillingCustomerId,
    })
    .eq('league_id', leagueId);

  if (error) {
    throw new Error(`[Fees] Failed to save floor subscription: ${error.message}`);
  }

  invalidateLeagueBillingCache(leagueId);
}
