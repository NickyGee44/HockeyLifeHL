/**
 * Addon Status Helpers
 *
 * Server-side utilities for checking whether an organization has active
 * premium add-ons. Uses the service role client to bypass RLS.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { AddonType } from '@/lib/actions/addons';

/**
 * Check if an organization has a specific addon active (or trialing).
 */
export async function hasAddonByOrgId(
  orgId: string,
  addonType: AddonType
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data } = await (supabase as any)
    .from('organization_addons')
    .select('id')
    .eq('organization_id', orgId)
    .eq('addon_type', addonType)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  return !!data;
}

/**
 * Check if a league's organization has a specific addon active.
 * Performs league → organization lookup first.
 */
export async function hasAddonByLeagueId(
  leagueId: string,
  addonType: AddonType
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data: league } = await supabase
    .from('leagues')
    .select('organization_id')
    .eq('id', leagueId)
    .single();

  if (!league?.organization_id) return false;

  return hasAddonByOrgId(league.organization_id, addonType);
}

/** Convenience: check Advanced Stats addon for a league */
export async function hasAdvancedStatsAddon(leagueId: string): Promise<boolean> {
  return hasAddonByLeagueId(leagueId, 'advanced_stats');
}

/** Convenience: check AI News addon for a league */
export async function hasAiNewsAddon(leagueId: string): Promise<boolean> {
  return hasAddonByLeagueId(leagueId, 'ai_news');
}

/** Check if an organization has an active Platform Monthly subscription */
export async function hasPlatformSubscription(orgId: string): Promise<boolean> {
  return hasAddonByOrgId(orgId, 'platform_subscription');
}
