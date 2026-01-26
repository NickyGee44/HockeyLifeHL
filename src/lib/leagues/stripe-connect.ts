"use server";

import { createClient } from "@/lib/supabase/server";
import { requireLeagueRole } from "@/lib/auth/league-context";
import Stripe from "stripe";

/**
 * Stripe Connect Integration for Multi-Tenant League Payments
 *
 * This module allows league owners to connect their own Stripe accounts
 * to collect payments from players. Uses Stripe Connect Express accounts.
 *
 * Prerequisites:
 * - Stripe account must be set up as a Platform
 * - STRIPE_SECRET_KEY must be set in environment variables
 * - Webhook endpoint must be configured for Connect events
 */

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

export type StripeConnectResult = {
  error?: string;
  success?: boolean;
  accountId?: string;
  onboardingUrl?: string;
  status?: string;
};

/**
 * Create a Stripe Connect Express account for a league
 * Only league owners can connect Stripe
 */
export async function createStripeConnectAccount(leagueId: string): Promise<StripeConnectResult> {
  try {
    // Require owner role
    const { userId } = await requireLeagueRole(['owner']);

    if (!stripe) {
      return { error: 'Stripe is not configured. Please contact support.' };
    }

    const supabase = await createClient();

    // Check if league already has a Stripe account
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('stripe_account_id, stripe_account_status, name')
      .eq('id', leagueId)
      .single();

    if (leagueError) {
      return { error: 'Failed to fetch league information' };
    }

    if (league.stripe_account_id) {
      // Account already exists, return existing account
      return {
        success: true,
        accountId: league.stripe_account_id,
        status: league.stripe_account_status || 'unknown',
      };
    }

    // Create a new Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // TODO: Make this configurable based on league location
      email: (await supabase.auth.getUser()).data.user?.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // Can be 'company' or 'individual'
      metadata: {
        league_id: leagueId,
        league_name: league.name,
        platform: 'hockeylifehl',
      },
    });

    // Save the Stripe account ID to the league
    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: 'incomplete',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (updateError) {
      console.error('Error saving Stripe account ID:', updateError);
      // Try to delete the Stripe account since we couldn't save it
      await stripe.accounts.del(account.id);
      return { error: 'Failed to save Stripe account information' };
    }

    return {
      success: true,
      accountId: account.id,
      status: 'incomplete',
    };
  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error);
    return { error: error.message || 'Failed to create Stripe account' };
  }
}

/**
 * Get the Stripe Connect onboarding URL for a league
 * Returns a URL where the league owner can complete Stripe onboarding
 */
export async function getStripeConnectOnboardingUrl(leagueId: string): Promise<StripeConnectResult> {
  try {
    // Require owner role
    await requireLeagueRole(['owner']);

    if (!stripe) {
      return { error: 'Stripe is not configured. Please contact support.' };
    }

    const supabase = await createClient();

    // Get the league's Stripe account ID
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('stripe_account_id, slug')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return { error: 'Failed to fetch league information' };
    }

    if (!league.stripe_account_id) {
      // No account yet, create one first
      const createResult = await createStripeConnectAccount(leagueId);
      if (createResult.error) {
        return createResult;
      }
    }

    // Get the Stripe account ID (either existing or just created)
    const accountId = league.stripe_account_id;

    // Create an account link for onboarding
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: `${siteUrl}/${league.slug}/settings/payments?refresh=true`,
      return_url: `${siteUrl}/${league.slug}/settings/payments?success=true`,
      type: 'account_onboarding',
    });

    return {
      success: true,
      onboardingUrl: accountLink.url,
      accountId: accountId!,
    };
  } catch (error: any) {
    console.error('Error getting onboarding URL:', error);
    return { error: error.message || 'Failed to generate onboarding URL' };
  }
}

/**
 * Get the status of a league's Stripe Connect account
 */
export async function getStripeAccountStatus(leagueId: string): Promise<StripeConnectResult> {
  try {
    // Require owner or admin role
    await requireLeagueRole(['owner', 'admin']);

    if (!stripe) {
      return { error: 'Stripe is not configured', status: 'not_configured' };
    }

    const supabase = await createClient();

    // Get the league's Stripe account ID
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('stripe_account_id')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league || !league.stripe_account_id) {
      return { success: true, status: 'not_connected' };
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(league.stripe_account_id);

    // Determine account status
    let status = 'incomplete';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active';
    } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
      status = 'pending_verification';
    } else if (account.requirements?.disabled_reason) {
      status = 'disabled';
    }

    // Update status in database
    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        stripe_account_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (updateError) {
      console.error('Error updating Stripe status:', updateError);
    }

    return {
      success: true,
      status,
      accountId: league.stripe_account_id,
    };
  } catch (error: any) {
    console.error('Error getting Stripe account status:', error);
    return { error: error.message || 'Failed to fetch account status' };
  }
}

/**
 * Disconnect (remove) Stripe Connect account from a league
 * Only league owners can disconnect
 */
export async function disconnectStripeAccount(leagueId: string): Promise<StripeConnectResult> {
  try {
    // Require owner role
    await requireLeagueRole(['owner']);

    const supabase = await createClient();

    // Remove the Stripe account ID from the league
    // Note: We don't delete the Stripe account itself, just disconnect it
    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        stripe_account_id: null,
        stripe_account_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);

    if (updateError) {
      console.error('Error disconnecting Stripe account:', updateError);
      return { error: 'Failed to disconnect Stripe account' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error disconnecting Stripe account:', error);
    return { error: error.message || 'Failed to disconnect account' };
  }
}

/**
 * Create a payment intent for a league (using their connected account)
 * This is used when a player pays registration fees, team fees, etc.
 */
export async function createPaymentIntent(
  leagueId: string,
  amount: number, // in cents
  description: string,
  metadata?: Record<string, string>
): Promise<{ clientSecret?: string; error?: string }> {
  try {
    if (!stripe) {
      return { error: 'Stripe is not configured' };
    }

    const supabase = await createClient();

    // Get the league's Stripe account
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('stripe_account_id, stripe_account_status')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league || !league.stripe_account_id) {
      return { error: 'This league has not connected Stripe payments' };
    }

    if (league.stripe_account_status !== 'active') {
      return { error: 'Stripe account is not active. Please complete onboarding.' };
    }

    // Create a payment intent on the connected account
    // Platform fee: 2% of transaction (configurable)
    const platformFeeAmount = Math.floor(amount * 0.02); // 2% platform fee

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: 'usd',
        description,
        metadata: {
          league_id: leagueId,
          ...metadata,
        },
        application_fee_amount: platformFeeAmount,
      },
      {
        stripeAccount: league.stripe_account_id,
      }
    );

    return { clientSecret: paymentIntent.client_secret! };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return { error: error.message || 'Failed to create payment' };
  }
}

/**
 * Webhook handler for Stripe Connect events
 * This should be called from /api/webhooks/stripe/connect route
 */
export async function handleStripeConnectWebhook(event: Stripe.Event): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const leagueId = account.metadata?.league_id;

        if (!leagueId) break;

        // Determine status
        let status = 'incomplete';
        if (account.charges_enabled && account.payouts_enabled) {
          status = 'active';
        } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
          status = 'pending_verification';
        } else if (account.requirements?.disabled_reason) {
          status = 'disabled';
        }

        // Update league status
        await supabase
          .from('leagues')
          .update({
            stripe_account_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', leagueId);

        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const leagueId = paymentIntent.metadata?.league_id;

        if (!leagueId) break;

        // Record the payment in the database
        // This will be handled by the payment actions module

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Log failed payment
        console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error);
        break;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error handling Stripe webhook:', error);
    return { success: false, error: error.message };
  }
}
