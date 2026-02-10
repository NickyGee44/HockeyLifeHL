'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { getStripeErrorMessage } from '@/lib/stripe/client';

// ============================================================================
// Types
// ============================================================================

export type AddonType = 'platform_subscription' | 'advanced_stats' | 'ai_news';
export type AddonStatus = 'active' | 'inactive' | 'trialing' | 'past_due';

export interface OrgAddon {
  id: string;
  organization_id: string;
  addon_type: AddonType;
  status: AddonStatus;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  amount_cents: number;
  activated_at: string | null;
  cancelled_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

type ActionResult<T = void> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>;

// ============================================================================
// Add-On Price Config
// ============================================================================

const ADDON_PRICES: Record<AddonType, { envKey: string; amountCents: number; label: string }> = {
  platform_subscription: {
    envKey: 'STRIPE_PRICE_PLATFORM_MONTHLY',
    amountCents: 29999, // $299.99
    label: 'Platform Monthly',
  },
  advanced_stats: {
    envKey: 'STRIPE_PRICE_ADVANCED_STATS',
    amountCents: 1499, // $14.99
    label: 'Advanced Stats',
  },
  ai_news: {
    envKey: 'STRIPE_PRICE_AI_NEWS',
    amountCents: 1499, // $14.99
    label: 'AI News Writer',
  },
};

function getAddonPriceId(addonType: AddonType): string | null {
  const config = ADDON_PRICES[addonType];
  if (!config) return null;
  return process.env[config.envKey] || null;
}

// ============================================================================
// Helper: Verify Org Owner Access
// ============================================================================

async function verifyOrgOwnerAccess(
  orgId: string
): Promise<{ userId: string; orgId: string; stripeCustomerId: string | null } | { error: string }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Authentication required.' };
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, owner_user_id, stripe_customer_id')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    return { error: 'Organization not found.' };
  }

  if (org.owner_user_id !== user.id) {
    // Check platform admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single();

    if (!(profile as any)?.is_platform_admin) {
      return { error: 'Only organization owners can manage add-ons.' };
    }
  }

  return {
    userId: user.id,
    orgId: org.id,
    stripeCustomerId: org.stripe_customer_id || null,
  };
}

// ============================================================================
// 1. Get Organization Add-Ons
// ============================================================================

export async function getOrgAddons(orgId: string): ActionResult<OrgAddon[]> {
  try {
    const result = await verifyOrgOwnerAccess(orgId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('organization_addons')
      .select('*')
      .eq('organization_id', orgId)
      .order('addon_type');

    if (error) {
      console.error('[Addons] Failed to fetch org addons:', error);
      return { success: false, error: 'Failed to fetch add-ons.' };
    }

    return { success: true, data: (data || []) as OrgAddon[] };
  } catch {
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 2. Create Add-On Checkout Session
// ============================================================================

export async function createAddonCheckout(
  orgId: string,
  addonType: AddonType,
  successUrl: string,
  cancelUrl: string
): ActionResult<{ url: string }> {
  try {
    const result = await verifyOrgOwnerAccess(orgId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    const priceId = getAddonPriceId(addonType);
    if (!priceId) {
      return { success: false, error: `Stripe price not configured for ${addonType}. Please contact support.` };
    }

    // Get or create Stripe customer
    let customerId = result.stripeCustomerId;

    if (!customerId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        name: org?.name || undefined,
        metadata: {
          organization_id: orgId,
        },
      });

      customerId = customer.id;

      const serviceSupabase = createServiceRoleClient();
      await serviceSupabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', orgId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          organization_id: orgId,
          addon_type: addonType,
          entity_type: 'organization_addon',
        },
      },
      metadata: {
        organization_id: orgId,
        addon_type: addonType,
      },
    });

    if (!session.url) {
      return { success: false, error: 'Failed to create checkout session.' };
    }

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error('[Addons] Create checkout error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 3. Cancel Add-On (mark for cancellation at period end)
// ============================================================================

export async function cancelAddon(
  orgId: string,
  addonType: AddonType
): ActionResult<void> {
  try {
    const result = await verifyOrgOwnerAccess(orgId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    const supabase = await createClient();
    const { data: addon, error: fetchError } = await (supabase as any)
      .from('organization_addons')
      .select('*')
      .eq('organization_id', orgId)
      .eq('addon_type', addonType)
      .single();

    if (fetchError || !addon) {
      return { success: false, error: 'Add-on not found.' };
    }

    if (addon.status !== 'active' && addon.status !== 'trialing') {
      return { success: false, error: 'Add-on is not currently active.' };
    }

    // Cancel Stripe subscription at period end if it exists
    if (addon.stripe_subscription_id) {
      await stripe.subscriptions.update(addon.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // Update local record
    const serviceSupabase = createServiceRoleClient();
    await (serviceSupabase as any)
      .from('organization_addons')
      .update({
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', addon.id);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[Addons] Cancel addon error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}
