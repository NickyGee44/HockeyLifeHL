/**
 * Stripe Connect Library for League Payment Processing
 *
 * Handles Stripe Connect Express integration for leagues:
 * - League onboarding via Connect Express
 * - Payment Intent creation with platform fees
 * - Account status management
 * - Payout information retrieval
 *
 * Security:
 * - All operations require authenticated league admin
 * - Application fees are calculated server-side (never trust client)
 * - Account credentials stored only as IDs (no sensitive data)
 */

import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { generateIdempotencyKey } from '@/lib/stripe/idempotency';
import {
  calculateApplicationFeeFromConfig,
  getLeagueBillingConfig,
  saveFloorSubscription,
  TIER_MONTHLY_FLOOR_CENTS,
} from '@/lib/fees/platform-fees';
import type { PricingTier } from '@/lib/fees/platform-fees';

// ============================================================================
// Platform Fee Configuration (DB-driven)
// ============================================================================

/**
 * Calculate the application fee (platform commission) for a given amount.
 * Reads the fee percentage from the database via getPlatformFeeConfig().
 *
 * @param amountCents - The total transaction amount in cents
 * @returns The application fee in cents
 */
export async function calculateApplicationFee(amountCents: number): Promise<number> {
  const { fee } = await calculateApplicationFeeFromConfig(amountCents);
  return fee;
}

/**
 * Calculate the net amount the league receives after platform fee.
 *
 * @param amountCents - The total transaction amount in cents
 * @returns The net amount in cents that goes to the league
 */
export async function calculateNetAmount(amountCents: number): Promise<number> {
  const fee = await calculateApplicationFee(amountCents);
  return amountCents - fee;
}

// ============================================================================
// Connect Account Types
// ============================================================================

export type ConnectAccountStatus =
  | 'not_created'
  | 'pending'
  | 'restricted'
  | 'complete'
  | 'disabled';

export interface ConnectAccountInfo {
  accountId: string | null;
  status: ConnectAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  disableReason?: string | null;
  accountMissing?: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  createdAt?: Date;
}

const HARD_DISABLED_REASONS = [
  'rejected.',
  'fraud',
  'listed',
  'platform_paused',
  'other',
] as const;

function isHardDisabledReason(reason: string | null | undefined): boolean {
  if (!reason) return false;

  return HARD_DISABLED_REASONS.some((token) => reason.includes(token));
}

export function isMissingConnectAccountError(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return false;
  }

  return (
    error.type === 'StripeInvalidRequestError' &&
    (error.code === 'resource_missing' || /no such account/i.test(error.message))
  );
}

export function resolveConnectAccountStatus(
  account: Stripe.Account
): ConnectAccountInfo['status'] {
  if (account.charges_enabled && account.payouts_enabled) {
    return 'complete';
  }

  const disabledReason = account.requirements?.disabled_reason ?? null;
  const hasOutstandingRequirements =
    (account.requirements?.currently_due?.length ?? 0) > 0 ||
    (account.requirements?.past_due?.length ?? 0) > 0 ||
    (account.requirements?.pending_verification?.length ?? 0) > 0;

  if (disabledReason) {
    return isHardDisabledReason(disabledReason) ? 'disabled' : 'restricted';
  }

  if (hasOutstandingRequirements) {
    return 'restricted';
  }

  return 'pending';
}

export interface ConnectOnboardingLink {
  url: string;
  expiresAt: Date;
}

export interface PayoutInfo {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  payoutSchedule: {
    interval: string;
    delayDays: number;
  };
  recentPayouts: Array<{
    id: string;
    amount: number;
    status: string;
    arrivalDate: Date;
    method: string;
  }>;
}

// ============================================================================
// Connect Account Management
// ============================================================================

/**
 * Create a Stripe Connect Express account for a league.
 * This creates the account but doesn't complete onboarding.
 *
 * @param leagueId - The league's UUID
 * @param leagueName - Display name for the Connect account
 * @param email - Contact email for the account
 * @returns The created account ID
 */
export async function createConnectAccount(
  leagueId: string,
  leagueName: string,
  email: string
): Promise<string> {
  const idempotencyKey = generateIdempotencyKey('create_connect_account', {
    league_id: leagueId,
  });

  const account = await stripe.accounts.create(
    {
      type: 'express',
      country: 'CA',
      email,
      business_type: 'company',
      company: {
        name: leagueName,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        league_id: leagueId,
        platform: 'beerleaguehockey',
      },
    },
    {
      idempotencyKey,
    }
  );

  return account.id;
}

/**
 * Create an Account Link for Connect Express onboarding.
 * Returns a URL that redirects the league owner to Stripe's hosted onboarding.
 *
 * @param accountId - The Stripe Connect account ID
 * @param refreshUrl - URL to redirect if link expires
 * @param returnUrl - URL to redirect after onboarding completes
 * @returns The onboarding link details
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<ConnectOnboardingLink> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
    collect: 'eventually_due',
  });

  return {
    url: accountLink.url,
    expiresAt: new Date(accountLink.expires_at * 1000),
  };
}

/**
 * Create a login link for the Express dashboard.
 * Allows league owners to access their Stripe Express dashboard.
 *
 * @param accountId - The Stripe Connect account ID
 * @returns The login URL
 */
export async function createLoginLink(accountId: string): Promise<string> {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

/**
 * Get Connect account status and details.
 *
 * @param accountId - The Stripe Connect account ID (or null if not created)
 * @returns Account information and status
 */
export async function getConnectAccountInfo(
  accountId: string | null
): Promise<ConnectAccountInfo> {
  if (!accountId) {
    return {
      accountId: null,
      status: 'not_created',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requiresAction: true,
    };
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);

    const status = resolveConnectAccountStatus(account);

    return {
      accountId,
      status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted || false,
      disableReason: account.requirements?.disabled_reason ?? null,
      requiresAction:
        !account.charges_enabled ||
        !account.payouts_enabled ||
        (account.requirements?.currently_due?.length ?? 0) > 0 ||
        (account.requirements?.past_due?.length ?? 0) > 0 ||
        (account.requirements?.pending_verification?.length ?? 0) > 0,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      },
      createdAt: account.created ? new Date(account.created * 1000) : undefined,
    };
  } catch (error) {
    console.error('[Stripe Connect] Failed to retrieve account:', error);

    if (isMissingConnectAccountError(error)) {
      return {
        accountId: null,
        status: 'not_created',
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requiresAction: true,
        accountMissing: true,
      };
    }

    return {
      accountId,
      status: 'restricted',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requiresAction: true,
      disableReason:
        error instanceof Stripe.errors.StripeError ? error.code ?? error.message : null,
    };
  }
}

// ============================================================================
// Payment Intent Management
// ============================================================================

export interface CreatePaymentIntentParams {
  leagueId: string;
  connectedAccountId: string;
  amountCents: number;
  currency?: string;
  description?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  applicationFee: number;
  currency: string;
}

/**
 * Create a Payment Intent for a league transaction.
 * Funds go directly to the league's connected account with platform fee.
 *
 * @param params - Payment intent parameters
 * @returns Payment intent details including client secret
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<PaymentIntentResult> {
  const {
    leagueId,
    connectedAccountId,
    amountCents,
    currency = 'cad',
    description,
    customerEmail,
    metadata = {},
  } = params;

  // Calculate platform fee using per-league tier and effective bps.
  // Small-tier leagues pay a flat $299/season invoice instead of per-transaction fees.
  // Referral discounts are pre-baked into platform_fee_bps by assignLeaguePricingTier.
  const billing = await getLeagueBillingConfig(leagueId);
  let applicationFee: number;
  let feePercent: number;
  if (billing.pricingTier === 'small') {
    applicationFee = 0;
    feePercent = 0;
  } else {
    applicationFee = Math.round((amountCents * billing.platformFeeBps) / 10000);
    feePercent = billing.platformFeePercent;
  }

  // Calculate how much of the platform fee is added to the player's charge
  const playerShareCents = Math.round(applicationFee * billing.playerFeeSharePercent / 100);

  // Idempotency key based on unique transaction parameters
  const idempotencyKey = generateIdempotencyKey('create_payment_intent', {
    league_id: leagueId,
    amount: amountCents,
    customer_email: customerEmail,
    timestamp: Date.now().toString().slice(0, -3), // 10-second granularity
  });

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountCents + playerShareCents,
      currency,
      application_fee_amount: applicationFee,
      description,
      receipt_email: customerEmail,
      metadata: {
        ...metadata,
        league_id: leagueId,
        platform: 'beerleaguehockey',
        platform_fee_percent: feePercent.toString(),
        player_fee_share_percent: billing.playerFeeSharePercent.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
      transfer_data: {
        destination: connectedAccountId,
      },
    },
    {
      idempotencyKey,
    }
  );

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
    amount: amountCents,
    applicationFee,
    currency,
  };
}

/**
 * Retrieve a Payment Intent's current status.
 *
 * @param paymentIntentId - The Payment Intent ID
 * @param connectedAccountId - Optional connected account ID (for Connect payments)
 * @returns The Payment Intent object
 */
export async function getPaymentIntent(
  paymentIntentId: string,
  connectedAccountId?: string
): Promise<Stripe.PaymentIntent> {
  const options = connectedAccountId
    ? { stripeAccount: connectedAccountId }
    : undefined;

  return stripe.paymentIntents.retrieve(paymentIntentId, options);
}

/**
 * Cancel a Payment Intent (before payment is captured).
 *
 * @param paymentIntentId - The Payment Intent ID
 * @param reason - Optional cancellation reason
 * @returns The cancelled Payment Intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'abandoned'
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.cancel(paymentIntentId, {
    cancellation_reason: reason,
  });
}

// ============================================================================
// Refund Management
// ============================================================================

export interface RefundParams {
  paymentIntentId: string;
  amountCents?: number; // Full refund if not specified
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  refundApplicationFee?: boolean;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: string;
  applicationFeeRefunded: number;
}

/**
 * Create a refund for a Connect payment.
 *
 * @param params - Refund parameters
 * @returns Refund details
 */
export async function createRefund(params: RefundParams): Promise<RefundResult> {
  const {
    paymentIntentId,
    amountCents,
    reason,
    refundApplicationFee = false,
  } = params;

  const idempotencyKey = generateIdempotencyKey('create_refund', {
    payment_intent_id: paymentIntentId,
    amount: amountCents?.toString() || 'full',
    timestamp: Date.now().toString().slice(0, -3),
  });

  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      amount: amountCents,
      reason,
      refund_application_fee: refundApplicationFee,
    },
    {
      idempotencyKey,
    }
  );

  // Calculate refunded application fee if any
  let applicationFeeRefunded = 0;
  if (refundApplicationFee && amountCents) {
    applicationFeeRefunded = await calculateApplicationFee(amountCents);
  }

  return {
    refundId: refund.id,
    amount: refund.amount,
    status: refund.status || 'pending',
    applicationFeeRefunded,
  };
}

// ============================================================================
// Payout Information
// ============================================================================

/**
 * Get payout information for a connected account.
 *
 * @param connectedAccountId - The Stripe Connect account ID
 * @returns Payout information including balance and schedule
 */
export async function getPayoutInfo(
  connectedAccountId: string
): Promise<PayoutInfo> {
  const [balance, account, payouts] = await Promise.all([
    stripe.balance.retrieve({ stripeAccount: connectedAccountId }),
    stripe.accounts.retrieve(connectedAccountId),
    stripe.payouts.list(
      { limit: 5 },
      { stripeAccount: connectedAccountId }
    ),
  ]);

  // Find CAD balance (primary currency)
  const availableCAD = balance.available.find((b) => b.currency === 'cad');
  const pendingCAD = balance.pending.find((b) => b.currency === 'cad');

  return {
    availableBalance: availableCAD?.amount || 0,
    pendingBalance: pendingCAD?.amount || 0,
    currency: 'cad',
    payoutSchedule: {
      interval: account.settings?.payouts?.schedule?.interval || 'daily',
      delayDays: account.settings?.payouts?.schedule?.delay_days || 2,
    },
    recentPayouts: payouts.data.map((payout) => ({
      id: payout.id,
      amount: payout.amount,
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000),
      method: payout.method,
    })),
  };
}

// ============================================================================
// Monthly Floor Subscriptions
// ============================================================================

export interface FloorSubscriptionParams {
  leagueId: string;
  tier: Extract<PricingTier, 'standard' | 'large'>;
  leagueName: string;
  /** Existing Stripe billing customer ID if one was previously created. */
  existingCustomerId?: string | null;
  ownerEmail?: string;
}

export interface FloorSubscriptionResult {
  subscriptionId: string;
  customerId: string;
  productId: string;
}

/**
 * Create a Stripe Subscription on the BLH platform account to bill the league
 * the monthly floor amount (Standard: $250/mo CAD, Large: $500/mo CAD).
 *
 * The floor is credited against the season % invoice at registration close.
 * Call `saveFloorSubscription` after this to persist the IDs.
 *
 * @param params - Floor subscription parameters
 * @returns IDs of the created subscription, customer, and product
 */
export async function createFloorSubscription(
  params: FloorSubscriptionParams
): Promise<FloorSubscriptionResult> {
  const { leagueId, tier, leagueName, existingCustomerId, ownerEmail } = params;

  const floorCents = TIER_MONTHLY_FLOOR_CENTS[tier]; // 25000 or 50000
  const tierLabel = tier === 'standard' ? 'Standard' : 'Large';
  const productName = `BLH Platform Floor — ${tierLabel}`;

  // ── Get or create the Stripe billing customer (platform account, not Connect) ──
  let customerId = existingCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: leagueName,
      ...(ownerEmail ? { email: ownerEmail } : {}),
      metadata: { league_id: leagueId, platform: 'beerleaguehockey', floor_tier: tier },
    });
    customerId = customer.id;
  }

  // ── Create a product for this floor tier ──────────────────────────────────
  const product = await stripe.products.create({
    name: productName,
    metadata: { platform: 'beerleaguehockey', floor_tier: tier },
  });

  // ── Create a recurring price ──────────────────────────────────────────────
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: floorCents,
    currency: 'cad',
    recurring: { interval: 'month' },
  });

  // ── Create the subscription ───────────────────────────────────────────────
  const idempotencyKey = generateIdempotencyKey('create_floor_subscription', {
    league_id: leagueId,
    tier,
  });

  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: price.id }],
      metadata: { league_id: leagueId, platform: 'beerleaguehockey', floor_tier: tier },
    },
    { idempotencyKey }
  );

  // Persist the IDs to the DB
  await saveFloorSubscription(leagueId, {
    floorStripeSubscriptionId: subscription.id,
    floorStripeProductId: product.id,
    stripeBillingCustomerId: customerId,
  });

  return {
    subscriptionId: subscription.id,
    customerId,
    productId: product.id,
  };
}

/**
 * Cancel a league's floor subscription (e.g. on tier downgrade or churn).
 * Sets cancel_at_period_end so the league isn't charged for the next cycle.
 */
export async function cancelFloorSubscription(subscriptionId: string): Promise<void> {
  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify a Stripe Connect webhook signature.
 *
 * @param payload - Raw request body (as string or Buffer)
 * @param signature - Stripe-Signature header value
 * @param webhookSecret - The webhook signing secret
 * @returns The verified event, or null if verification fails
 */
export function verifyConnectWebhook(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('[Stripe Connect] Webhook signature verification failed:', error);
    return null;
  }
}
