/**
 * Stripe Connect Payment Server Actions
 *
 * Server actions for Stripe Connect payment operations:
 * - Connect account onboarding
 * - Payment intent creation
 * - Payment retrieval and management
 * - Refund processing
 * - Payout information
 *
 * Security:
 * - All actions verify user is league owner/admin via membership check
 * - Uses RLS policies for additional protection
 * - Never exposes Stripe secret keys to client
 * - Logs all financial operations to audit table
 */

'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  createConnectAccount,
  createAccountLink,
  createLoginLink,
  getConnectAccountInfo,
  createPaymentIntent,
  createRefund,
  getPayoutInfo,
  type ConnectAccountInfo,
  type PaymentIntentResult,
  type PayoutInfo,
  type RefundResult } from '@/lib/leagues/stripe-connect';
import { getPlatformFeeConfig } from '@/lib/fees/platform-fees';
import { getStripeErrorMessage } from '@/lib/stripe/client';

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = void> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>;

interface League {
  id: string;
  name: string;
  stripe_account_id: string | null;
  stripe_account_status: string | null;
  payment_mode: string | null;
}


interface ConnectPayment {
  id: string;
  league_id: string;
  stripe_payment_intent_id: string;
  stripe_charge_id: string | null;
  amount_cents: number;
  application_fee_cents: number;
  currency: string;
  status: string;
  description: string | null;
  customer_email: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface GetPaymentsOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

// ============================================================================
// Helper: Verify League Admin Access
// ============================================================================

async function verifyLeagueAdminAccess(
  leagueId: string
): Promise<{ league: League; userId: string } | { error: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Authentication required. Please sign in.' };
  }

  // Get league with membership check
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, stripe_account_id, stripe_account_status, payment_mode')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    return { error: 'League not found.' };
  }

  // Verify membership with owner/admin role
  const { data: membership, error: membershipError } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  if (membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active') {
    return { league: league as League, userId: user.id };
  }

  // Fallback: platform admins get owner-level access to all leagues
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.is_platform_admin === true) {
    return { league: league as League, userId: user.id };
  }

  if (membershipError || !membership) {
    return { error: 'You do not have access to this league.' };
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return { error: 'Only league owners and admins can manage payments.' };
  }

  return { error: 'Your league membership is not active.' };
}

// ============================================================================
// Helper: Log Audit Event
// ============================================================================

async function logAuditEvent(
  leagueId: string,
  eventType: string,
  payload: Record<string, any>,
  createdBy?: string,
  stripeEventId?: string
): Promise<void> {
  const serviceSupabase = createServiceRoleClient();

  const { error } = await serviceSupabase.from('stripe_connect_audit_log').insert({
    league_id: leagueId,
    event_type: eventType,
    stripe_event_id: stripeEventId || null,
    payload,
    created_by: createdBy || null });

  if (error) {
    console.error('[Stripe Connect] Failed to log audit event:', error);
  }
}

// ============================================================================
// 1. Start Connect Onboarding
// ============================================================================

export async function startConnectOnboarding(
  leagueId: string,
  returnUrl: string,
  refreshUrl: string
): ActionResult<{ url: string }> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    const { league, userId } = result;

    let accountId = league.stripe_account_id;

    // Create account if not exists
    if (!accountId) {
      // Get user email for the account
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      const email = profile?.email || '';

      accountId = await createConnectAccount(leagueId, league.name, email);

      // Update league with account ID
      const serviceSupabase = createServiceRoleClient();
      await serviceSupabase
        .from('leagues')
        .update({
          stripe_account_id: accountId,
          stripe_account_status: 'pending' })
        .eq('id', leagueId);

      await logAuditEvent(leagueId, 'connect_account_created', {
        account_id: accountId }, userId);
    }

    // Create onboarding link
    const link = await createAccountLink(accountId, refreshUrl, returnUrl);

    await logAuditEvent(leagueId, 'onboarding_link_created', {
      account_id: accountId,
      expires_at: link.expiresAt.toISOString() }, userId);

    return { success: true, data: { url: link.url } };
  } catch (error) {
    console.error('[Stripe Connect] Start onboarding error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 2. Get Connect Account Status
// ============================================================================

export async function getConnectAccountStatus(
  leagueId: string
): ActionResult<ConnectAccountInfo> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    const { league } = result;

    const accountInfo = await getConnectAccountInfo(league.stripe_account_id);

    // Update league status if changed
    if (league.stripe_account_id && league.stripe_account_status !== accountInfo.status) {
      const serviceSupabase = createServiceRoleClient();
      await serviceSupabase
        .from('leagues')
        .update({
          stripe_account_status: accountInfo.status,
          payment_mode: accountInfo.chargesEnabled ? 'stripe' : 'manual' })
        .eq('id', leagueId);
    }

    return { success: true, data: accountInfo };
  } catch (error) {
    console.error('[Stripe Connect] Get account status error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 3. Get Stripe Dashboard Link
// ============================================================================

export async function getStripeDashboardLink(
  leagueId: string
): ActionResult<{ url: string }> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    const { league } = result;

    if (!league.stripe_account_id) {
      return { success: false, error: 'No Stripe account connected. Please complete onboarding first.' };
    }

    const url = await createLoginLink(league.stripe_account_id);

    return { success: true, data: { url } };
  } catch (error) {
    console.error('[Stripe Connect] Get dashboard link error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 4. Create Payment Intent
// ============================================================================

export async function createConnectPaymentIntent(
  leagueId: string,
  amountCents: number,
  description?: string,
  customerEmail?: string,
  metadata?: Record<string, string>
): ActionResult<PaymentIntentResult> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    const { league, userId } = result;

    if (!league.stripe_account_id) {
      return { success: false, error: 'No Stripe account connected. Please complete onboarding first.' };
    }

    // Verify account can accept payments
    const accountInfo = await getConnectAccountInfo(league.stripe_account_id);
    if (!accountInfo.chargesEnabled) {
      return {
        success: false,
        error: 'Your Stripe account cannot accept payments yet. Please complete onboarding.' };
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      leagueId,
      connectedAccountId: league.stripe_account_id,
      amountCents,
      description,
      customerEmail,
      metadata });

    // Record payment in database
    const serviceSupabase = createServiceRoleClient();
    await serviceSupabase.from('stripe_connect_payments').insert({
      league_id: leagueId,
      stripe_payment_intent_id: paymentIntent.paymentIntentId,
      amount_cents: amountCents,
      application_fee_cents: paymentIntent.applicationFee,
      currency: paymentIntent.currency,
      status: 'pending',
      description,
      customer_email: customerEmail,
      metadata: metadata || {} });

    await logAuditEvent(leagueId, 'payment_intent_created', {
      payment_intent_id: paymentIntent.paymentIntentId,
      amount_cents: amountCents,
      application_fee_cents: paymentIntent.applicationFee,
      platform_fee_percent: (await getPlatformFeeConfig()).processingFeePercent }, userId);

    return { success: true, data: paymentIntent };
  } catch (error) {
    console.error('[Stripe Connect] Create payment intent error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 5. Get League Payments
// ============================================================================

export async function getLeaguePayments(
  leagueId: string,
  options: GetPaymentsOptions = {}
): ActionResult<{ payments: ConnectPayment[]; total: number }> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    const { limit = 20, offset = 0, status } = options;
    const supabase = await createClient();

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('stripe_connect_payments')
      .select('*', { count: 'exact' })
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('[Stripe Connect] Get payments error:', error);
      return { success: false, error: 'Failed to fetch payments.' };
    }

    return {
      success: true,
      data: {
        payments: (payments || []) as ConnectPayment[],
        total: count || 0 } };
  } catch (error) {
    console.error('[Stripe Connect] Get payments error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 6. Get Payment Details
// ============================================================================

export async function getPaymentDetails(
  leagueId: string,
  paymentId: string
): ActionResult<ConnectPayment> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    const supabase = await createClient();

    const { data: payment, error } = await supabase
      .from('stripe_connect_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('league_id', leagueId) // Ensure payment belongs to this league
      .single();

    if (error || !payment) {
      return { success: false, error: 'Payment not found.' };
    }

    return { success: true, data: payment as ConnectPayment };
  } catch (error) {
    console.error('[Stripe Connect] Get payment details error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 7. Refund Payment
// ============================================================================

export async function refundPayment(
  leagueId: string,
  paymentId: string,
  amountCents?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): ActionResult<RefundResult> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    const { userId } = result;

    const supabase = await createClient();

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('stripe_connect_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('league_id', leagueId)
      .single();

    if (paymentError || !payment) {
      return { success: false, error: 'Payment not found.' };
    }

    if (payment.status !== 'succeeded') {
      return { success: false, error: 'Only successful payments can be refunded.' };
    }

    // Create refund
    const refundResult = await createRefund({
      paymentIntentId: payment.stripe_payment_intent_id,
      amountCents,
      reason,
      refundApplicationFee: true, // Refund platform fee proportionally
    });

    // Update payment status
    const serviceSupabase = createServiceRoleClient();
    const newStatus = amountCents && amountCents < payment.amount_cents
      ? 'partially_refunded'
      : 'refunded';

    await serviceSupabase
      .from('stripe_connect_payments')
      .update({ status: newStatus })
      .eq('id', paymentId);

    await logAuditEvent(leagueId, 'payment_refunded', {
      payment_id: paymentId,
      refund_id: refundResult.refundId,
      amount_refunded: refundResult.amount,
      application_fee_refunded: refundResult.applicationFeeRefunded,
      reason }, userId);

    return { success: true, data: refundResult };
  } catch (error) {
    console.error('[Stripe Connect] Refund payment error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 8. Get League Payout Info
// ============================================================================

export async function getLeaguePayoutInfo(
  leagueId: string
): ActionResult<PayoutInfo> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    const { league } = result;

    if (!league.stripe_account_id) {
      return { success: false, error: 'No Stripe account connected.' };
    }

    const payoutInfo = await getPayoutInfo(league.stripe_account_id);

    return { success: true, data: payoutInfo };
  } catch (error) {
    console.error('[Stripe Connect] Get payout info error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 9. Initialize Connect Account (creates account without onboarding link)
// ============================================================================

export async function initializeConnectAccount(
  leagueId: string
): ActionResult<{ accountId: string }> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    const { league, userId } = result;

    // If account already exists, return it
    if (league.stripe_account_id) {
      return { success: true, data: { accountId: league.stripe_account_id } };
    }

    // Get user email for the account
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const email = profile?.email || '';

    const accountId = await createConnectAccount(leagueId, league.name, email);

    // Update league with account ID
    const serviceSupabase = createServiceRoleClient();
    await serviceSupabase
      .from('leagues')
      .update({
        stripe_account_id: accountId,
        stripe_account_status: 'pending' })
      .eq('id', leagueId);

    await logAuditEvent(leagueId, 'connect_account_created', {
      account_id: accountId }, userId);

    return { success: true, data: { accountId } };
  } catch (error) {
    console.error('[Stripe Connect] Initialize account error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 10. Create Account Session (for Embedded Components)
// ============================================================================

interface AccountSessionResult {
  clientSecret: string;
  expiresAt: number;
}

export async function createConnectAccountSession(
  leagueId: string
): ActionResult<AccountSessionResult> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    const { league } = result;

    if (!league.stripe_account_id) {
      return { success: false, error: 'No Stripe account connected. Please complete onboarding first.' };
    }

    // Import stripe directly here to avoid circular deps
    const { stripe } = await import('@/lib/stripe/client');

    // Create account session with all components enabled
    const accountSession = await stripe.accountSessions.create({
      account: league.stripe_account_id,
      components: {
        // Embedded onboarding
        account_onboarding: { enabled: true },
        // Account management dashboard
        account_management: { enabled: true },
        // Payments received
        payments: { enabled: true, features: { refund_management: true } },
        // Payouts
        payouts: { enabled: true },
        // Payment details
        payment_details: { enabled: true, features: { refund_management: true } },
        // Balances
        balances: { enabled: true },
        // Notification banner
        notification_banner: { enabled: true } } });

    return {
      success: true,
      data: {
        clientSecret: accountSession.client_secret,
        expiresAt: accountSession.expires_at } };
  } catch (error) {
    console.error('[Stripe Connect] Create account session error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}

// ============================================================================
// 11. Get Payment Statistics
// ============================================================================

interface PaymentStats {
  totalRevenue: number;
  totalFeesPaid: number;
  netRevenue: number;
  paymentCount: number;
  successRate: number;
  averagePayment: number;
}

export async function getPaymentStatistics(
  leagueId: string,
  startDate?: Date,
  endDate?: Date
): ActionResult<PaymentStats> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    const supabase = await createClient();

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('stripe_connect_payments')
      .select('amount_cents, application_fee_cents, status')
      .eq('league_id', leagueId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: payments, error } = await query;

    if (error) {
      return { success: false, error: 'Failed to fetch payment statistics.' };
    }

    const allPayments = payments || [];
    const successfulPayments = allPayments.filter((p: any) => p.status === 'succeeded');

    const totalRevenue = successfulPayments.reduce((sum: number, p: any) => sum + p.amount_cents, 0);
    const totalFeesPaid = successfulPayments.reduce((sum: number, p: any) => sum + p.application_fee_cents, 0);

    const stats: PaymentStats = {
      totalRevenue,
      totalFeesPaid,
      netRevenue: totalRevenue - totalFeesPaid,
      paymentCount: successfulPayments.length,
      successRate: allPayments.length > 0
        ? (successfulPayments.length / allPayments.length) * 100
        : 0,
      averagePayment: successfulPayments.length > 0
        ? totalRevenue / successfulPayments.length
        : 0 };

    return { success: true, data: stats };
  } catch (error) {
    console.error('[Stripe Connect] Get payment stats error:', error);
    return { success: false, error: getStripeErrorMessage(error) };
  }
}
