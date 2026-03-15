'use server';

import {
  getPlatformFeeConfig,
  getLeagueBillingConfig,
  invalidateLeagueBillingCache,
  assignLeaguePricingTier,
  getEffectiveRateBps,
  TIER_RATE_BPS,
  TIER_MONTHLY_FLOOR_CENTS,
  TIER_CONTRACT_MONTHS,
  SMALL_TIER_FLAT_FEE_CENTS,
  type PlatformFeeConfig,
  type LeagueBillingConfig,
  type PlatformFeeMode,
  type PricingTier,
} from '@/lib/fees/platform-fees';
import {
  createFloorSubscription,
  cancelFloorSubscription,
} from '@/lib/leagues/stripe-connect';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// ============================================================================
// Platform-Level Fee Config (public read)
// ============================================================================

/**
 * Server action: fetch the global platform fee configuration.
 */
export async function getPlatformFees(): Promise<PlatformFeeConfig> {
  return getPlatformFeeConfig();
}

// ============================================================================
// League-Level Billing Config (admin only)
// ============================================================================

/**
 * Server action: fetch billing configuration for a specific league.
 * Requires the caller to be an owner or admin of the league.
 */
export async function getLeagueBilling(
  leagueId: string
): Promise<{ success: true; data: LeagueBillingConfig } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required.' };

    // Verify ownership/admin via membership
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role) || membership.status !== 'active') {
      return { success: false, error: 'You do not have access to this league\'s billing.' };
    }

    const config = await getLeagueBillingConfig(leagueId);
    return { success: true, data: config };
  } catch {
    return { success: false, error: 'Failed to fetch billing configuration.' };
  }
}

/**
 * Server action: update the platform fee mode for a league.
 * Only the league owner can change this setting.
 */
export async function updateLeagueFeeMode(
  leagueId: string,
  mode: PlatformFeeMode
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required.' };

    // Only owners can modify billing settings
    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner' || membership.status !== 'active') {
      return { success: false, error: 'Only league owners can update billing settings.' };
    }

    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase
      .from('league_billing_settings')
      .update({ platform_fee_mode: mode })
      .eq('league_id', leagueId);

    if (error) {
      console.error('[Billing] Update fee mode error:', error.message);
      return { success: false, error: 'Failed to update fee mode.' };
    }

    invalidateLeagueBillingCache(leagueId);
    return { success: true };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Server action: update the player fee share percentage for a league.
 * Only the league owner can change this setting.
 * The platform_fee_mode is derived for backward compat:
 *   100 => 'pass_to_player', anything else => 'absorb_by_league'.
 */
export async function updateLeagueFeeShare(
  leagueId: string,
  playerFeeSharePercent: number
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isInteger(playerFeeSharePercent) || playerFeeSharePercent < 0 || playerFeeSharePercent > 100) {
    return { success: false, error: 'Player fee share must be an integer between 0 and 100.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required.' };

    const { data: membership } = await supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner' || membership.status !== 'active') {
      return { success: false, error: 'Only league owners can update billing settings.' };
    }

    // Derive backward-compat mode
    const derivedMode: PlatformFeeMode = playerFeeSharePercent === 100 ? 'pass_to_player' : 'absorb_by_league';

    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase
      .from('league_billing_settings')
      .update({
        player_fee_share_percent: playerFeeSharePercent,
        platform_fee_mode: derivedMode,
      } as any)
      .eq('league_id', leagueId);

    if (error) {
      console.error('[Billing] Update fee share error:', error.message);
      return { success: false, error: 'Failed to update fee split.' };
    }

    invalidateLeagueBillingCache(leagueId);
    return { success: true };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// Auto-Tier Assignment (platform admin or registration-open trigger)
// ============================================================================

/**
 * Server action: auto-assign the pricing tier for a league.
 *
 * Counts teams and paid fees from the DB, calls determinePricingTier, and
 * writes the results to league_billing_settings. For Standard/Large tiers,
 * also creates the monthly floor Stripe subscription if the league has a
 * connected Stripe account.
 *
 * Accessible by platform admins only (can also be triggered internally on
 * registration open).
 */
export async function assignLeagueTier(
  leagueId: string,
  options: {
    teamCount?: number;
    estimatedFeesCents?: number;
    referralDiscountBps?: number;
    leagueName?: string;
    ownerEmail?: string;
  } = {}
): Promise<{ success: true; tier: PricingTier } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_platform_admin) {
      return { success: false, error: 'Only platform administrators can assign tiers.' };
    }

    const result = await assignLeaguePricingTier(leagueId, {
      teamCount: options.teamCount,
      estimatedFeesCents: options.estimatedFeesCents,
      referralDiscountBps: options.referralDiscountBps,
    });

    // For Standard/Large tiers, create the monthly floor subscription if needed.
    if (result.tier === 'standard' || result.tier === 'large') {
      const billing = await getLeagueBillingConfig(leagueId);
      if (!billing.floorStripeSubscriptionId) {
        try {
          await createFloorSubscription({
            leagueId,
            tier: result.tier,
            leagueName: options.leagueName ?? leagueId,
            existingCustomerId: billing.stripeBillingCustomerId,
            ownerEmail: options.ownerEmail,
          });
        } catch (floorErr) {
          // Log but don't fail — tier is assigned; subscription can be retried
          console.error('[Fees] Floor subscription creation failed:', floorErr);
        }
      }
    }

    return { success: true, tier: result.tier };
  } catch (err) {
    console.error('[Fees] assignLeagueTier error:', err);
    return { success: false, error: 'Failed to assign pricing tier.' };
  }
}

/**
 * Server action: override the pricing tier for a league (platform admin only).
 *
 * Allows platform admins to manually set a tier and referral discount without
 * triggering the auto-detection logic. Useful for enterprise negotiations or
 * correcting mis-assignments.
 */
export async function overrideLeagueTier(
  leagueId: string,
  tier: PricingTier,
  referralDiscountBps = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_platform_admin) {
      return { success: false, error: 'Only platform administrators can override tiers.' };
    }

    // Direct override: bypass the threshold logic by writing tier explicitly.
    const effectiveBps = getEffectiveRateBps(tier, referralDiscountBps);
    const monthlyFloor = Math.max(0, TIER_MONTHLY_FLOOR_CENTS[tier]);
    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase
      .from('league_billing_settings')
      .update({
        pricing_tier: tier,
        platform_fee_bps: effectiveBps,
        monthly_floor_cents: monthlyFloor,
        flat_season_fee_cents: tier === 'small' ? SMALL_TIER_FLAT_FEE_CENTS : 0,
        contract_term_months: TIER_CONTRACT_MONTHS[tier],
        referral_discount_bps: referralDiscountBps,
      })
      .eq('league_id', leagueId);

    if (error) return { success: false, error: 'Failed to save tier override.' };

    invalidateLeagueBillingCache(leagueId);
    return { success: true };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Server action: mark setup fee as waived (platform admin only).
 * Uses service role to bypass RLS.
 */
export async function waiveSetupFee(
  leagueId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required.' };

    // Check platform admin flag on profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_platform_admin) {
      return { success: false, error: 'Only platform administrators can waive setup fees.' };
    }

    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase
      .from('league_billing_settings')
      .update({
        setup_fee_status: 'waived',
        setup_fee_waived_by: user.id,
        setup_fee_waived_at: new Date().toISOString(),
        setup_fee_waived_reason: reason,
      })
      .eq('league_id', leagueId)
      .in('setup_fee_status', ['unbilled', 'invoiced']);

    if (error) {
      console.error('[Billing] Waive setup fee error:', error.message);
      return { success: false, error: 'Failed to waive setup fee.' };
    }

    invalidateLeagueBillingCache(leagueId);
    return { success: true };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
