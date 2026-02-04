'use server';

import {
  getPlatformFeeConfig,
  getLeagueBillingConfig,
  invalidateLeagueBillingCache,
  type PlatformFeeConfig,
  type LeagueBillingConfig,
  type PlatformFeeMode,
} from '@/lib/fees/platform-fees';
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
