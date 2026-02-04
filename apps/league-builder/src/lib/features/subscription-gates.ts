/**
 * Subscription Feature Gating
 *
 * Controls access to features based on organization subscription tier.
 * Use in server actions, API routes, and UI components to enforce subscription limits.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { FEATURES_BY_TIER, type Feature, type SubscriptionTier } from '@/lib/types/subscription';

// ============================================================================
// Feature Access Check
// ============================================================================

/**
 * Check if the current user's organization has access to a feature
 */
export async function canAccessFeature(feature: Feature): Promise<boolean> {
  try {
    const org = await getUserOrganization();

    if (!org) {
      return false;
    }

    const allowedFeatures = FEATURES_BY_TIER[org.subscription_tier];

    return allowedFeatures.includes(feature);
  } catch (error) {
    console.error('[FeatureGate] Error checking feature access:', error);
    return false;
  }
}

/**
 * Require access to a feature, throw error if not allowed
 * Use this in server actions and API routes
 */
export async function requireFeature(feature: Feature): Promise<void> {
  const hasAccess = await canAccessFeature(feature);

  if (!hasAccess) {
    throw new Error(
      `This feature requires a higher subscription tier. Please upgrade your subscription to access ${feature}.`
    );
  }
}

/**
 * Check multiple features at once
 */
export async function canAccessFeatures(features: Feature[]): Promise<{
  [key in Feature]?: boolean;
}> {
  const org = await getUserOrganization();

  if (!org) {
    return Object.fromEntries(features.map((f) => [f, false]));
  }

  const allowedFeatures = FEATURES_BY_TIER[org.subscription_tier];

  return Object.fromEntries(
    features.map((f) => [f, allowedFeatures.includes(f)])
  );
}

// ============================================================================
// Resource Limits
// ============================================================================

/**
 * Check if organization can create more leagues
 */
export async function canCreateLeague(): Promise<{
  allowed: boolean;
  current: number;
  limit: number | 'unlimited';
  message?: string;
}> {
  const org = await getUserOrganization();

  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: 'Organization not found',
    };
  }

  // Get current league count
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('leagues')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org.id);

  if (error) {
    console.error('[FeatureGate] Error counting leagues:', error);
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: 'Error checking league count',
    };
  }

  const currentCount = count || 0;

  // Check tier limits
  const limits = getTierLimits(org.subscription_tier);

  if (limits.maxLeagues === 'unlimited') {
    return {
      allowed: true,
      current: currentCount,
      limit: 'unlimited',
    };
  }

  if (currentCount >= limits.maxLeagues) {
    return {
      allowed: false,
      current: currentCount,
      limit: limits.maxLeagues,
      message: `You've reached the maximum of ${limits.maxLeagues} league${limits.maxLeagues !== 1 ? 's' : ''} for your subscription tier. Please upgrade to create more leagues.`,
    };
  }

  return {
    allowed: true,
    current: currentCount,
    limit: limits.maxLeagues,
  };
}

/**
 * Check if organization can add more players (checks TOTAL across all leagues)
 */
export async function canAddPlayer(leagueId?: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number | 'unlimited';
  message?: string;
}> {
  const org = await getUserOrganization();

  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: 'Organization not found',
    };
  }

  // Get TOTAL player count across ALL leagues in the organization
  const supabase = await createClient();

  // First get all leagues for this organization
  const { data: leagues, error: leaguesError } = await supabase
    .from('leagues')
    .select('id')
    .eq('organization_id', org.id);

  if (leaguesError) {
    console.error('[FeatureGate] Error fetching leagues:', leaguesError);
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: 'Error checking leagues',
    };
  }

  const leagueIds = leagues?.map((l) => l.id) || [];

  // Count total players across all organization's leagues
  // Note: Using team_rosters table which tracks player assignments to teams
  const { count, error } = await supabase
    .from('team_rosters')
    .select('*', { count: 'exact', head: true })
    .in('league_id', leagueIds);

  if (error) {
    console.error('[FeatureGate] Error counting players:', error);
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: 'Error checking player count',
    };
  }

  const currentCount = count || 0;

  // Check tier limits
  const limits = getTierLimits(org.subscription_tier);

  if (limits.maxPlayersTotal === 'unlimited') {
    return {
      allowed: true,
      current: currentCount,
      limit: 'unlimited',
    };
  }

  if (currentCount >= limits.maxPlayersTotal) {
    return {
      allowed: false,
      current: currentCount,
      limit: limits.maxPlayersTotal,
      message: `You've reached the maximum of ${limits.maxPlayersTotal} total players across all leagues for your subscription tier. Please upgrade to add more players.`,
    };
  }

  return {
    allowed: true,
    current: currentCount,
    limit: limits.maxPlayersTotal,
  };
}

/**
 * Check if organization can add more admins
 */
export async function canAddAdmin(): Promise<{
  allowed: boolean;
  current: number;
  limit: number | 'unlimited';
  message?: string;
}> {
  const org = await getUserOrganization();

  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: 'Organization not found',
    };
  }

  // Get current admin count
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org.id)
    .eq('role', 'admin');

  if (error) {
    console.error('[FeatureGate] Error counting admins:', error);
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: 'Error checking admin count',
    };
  }

  const currentCount = (count || 0) + 1; // +1 for owner

  // Check tier limits
  const limits = getTierLimits(org.subscription_tier);

  if (limits.maxAdmins === 'unlimited') {
    return {
      allowed: true,
      current: currentCount,
      limit: 'unlimited',
    };
  }

  if (currentCount >= limits.maxAdmins) {
    return {
      allowed: false,
      current: currentCount,
      limit: limits.maxAdmins,
      message: `You've reached the maximum of ${limits.maxAdmins} admin${limits.maxAdmins !== 1 ? 's' : ''} for your subscription tier. Please upgrade to add more admins.`,
    };
  }

  return {
    allowed: true,
    current: currentCount,
    limit: limits.maxAdmins,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getUserOrganization(): Promise<{
  id: string;
  subscription_tier: SubscriptionTier;
  subscription_status: string;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, subscription_tier, subscription_status')
    .eq('owner_user_id', user.id)
    .single();

  if (orgError || !org) {
    return null;
  }

  return org as {
    id: string;
    subscription_tier: SubscriptionTier;
    subscription_status: string;
  };
}

function getTierLimits(tier: SubscriptionTier): {
  maxLeagues: number | 'unlimited';
  maxPlayersTotal: number | 'unlimited';
  maxAdmins: number | 'unlimited';
  customBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
} {
  // All tiers have unlimited features in the free-forever model
  const limits: Record<SubscriptionTier, {
    maxLeagues: number | 'unlimited';
    maxPlayersTotal: number | 'unlimited';
    maxAdmins: number | 'unlimited';
    customBranding: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  }> = {
    free: {
      maxLeagues: 'unlimited' as const,
      maxPlayersTotal: 'unlimited' as const,
      maxAdmins: 'unlimited' as const,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
    },
    custom_domain: {
      maxLeagues: 'unlimited' as const,
      maxPlayersTotal: 'unlimited' as const,
      maxAdmins: 'unlimited' as const,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
    },
    enterprise: {
      maxLeagues: 'unlimited' as const,
      maxPlayersTotal: 'unlimited' as const,
      maxAdmins: 'unlimited' as const,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
    },
  };

  return limits[tier];
}

// ============================================================================
// Get Current Tier Info
// ============================================================================

/**
 * Get current subscription tier and limits for display
 */
export async function getCurrentTierInfo(): Promise<{
  tier: SubscriptionTier;
  limits: ReturnType<typeof getTierLimits>;
  features: Feature[];
} | null> {
  const org = await getUserOrganization();

  if (!org) {
    return null;
  }

  return {
    tier: org.subscription_tier,
    limits: getTierLimits(org.subscription_tier),
    features: FEATURES_BY_TIER[org.subscription_tier],
  };
}

// ============================================================================
// Subscription Status Check
// ============================================================================

/**
 * Check if organization has an active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const org = await getUserOrganization();

  if (!org) {
    return false;
  }

  return ['active', 'trialing'].includes(org.subscription_status);
}

/**
 * Require active subscription, throw error if not active
 */
export async function requireActiveSubscription(): Promise<void> {
  const isActive = await hasActiveSubscription();

  if (!isActive) {
    throw new Error(
      'Your subscription is not active. Please update your payment method or reactivate your subscription.'
    );
  }
}
