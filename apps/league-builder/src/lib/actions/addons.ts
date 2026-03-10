'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { getStripeErrorMessage } from '@/lib/stripe/client';
import { isAllowedRedirectUrl } from '@/lib/stripe/validate-redirect-url';
import { verifyOrganizationAccess } from '@/lib/organizations/access';

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
    amountCents: 0, // $0
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
// Helper: Verify Organization Management Access
// ============================================================================

async function verifyOrgManagementAccess(
  orgId: string
): Promise<{ userId: string; orgId: string; stripeCustomerId: string | null } | { error: string }> {
  const access = await verifyOrganizationAccess(orgId, { requireManagement: true });
  if (!access.authorized || !access.organization || !access.userId) {
    return { error: access.error || 'Only league owners and organization admins can manage add-ons.' };
  }

  return {
    userId: access.userId,
    orgId: access.organization.id,
    stripeCustomerId: access.organization.stripe_customer_id || null,
  };
}

// ============================================================================
// 1. Get Organization Add-Ons
// ============================================================================

export async function getOrgAddons(orgId: string): ActionResult<OrgAddon[]> {
  try {
    const result = await verifyOrgManagementAccess(orgId);
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
    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return { success: false, error: 'Invalid redirect URL.' };
    }

    const result = await verifyOrgManagementAccess(orgId);
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
    const result = await verifyOrgManagementAccess(orgId);
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
