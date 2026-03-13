/**
 * Registration Payment Server Actions
 *
 * Server actions for processing registration fee payments in League Sites.
 * Handles Stripe Checkout session creation and payment tracking for
 * registration_submissions table.
 *
 * Security:
 * - Players can only pay for their own registrations
 * - All Stripe operations use idempotency keys
 * - Webhook processing is atomic via database functions
 * - Full audit logging to player_payment_audit_log
 */

'use server';

import { createAuthClient as createClient, createServiceRoleClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import crypto from 'crypto';
import {
  getRegistrationPaymentMode,
  getPlayerRegistrationFeeAmount,
  getSeasonPaymentSettings,
  usesTeamBilling,
} from '@/lib/registration/fee-collection-model';

// ============================================================================
// Types
// ============================================================================

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

interface RegistrationPaymentHistory {
  id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description: string;
  created_at: string;
  payment_method?: string;
}

interface RegistrationPaymentRegistration {
  id: string;
  season_id: string;
  team_id: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'waitlisted' | 'pending';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded' | 'failed' | 'completed' | 'not_required';
  fee_amount_cents: number;
  currency: string;
  amount_paid_cents: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
  season?: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  team?: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
  registration_type?: {
    id: string;
    name: string;
    fee_amount_cents: number;
  };
}

// ============================================================================
// Stripe Client (Lazy Initialization)
// ============================================================================

let _stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (_stripe) return _stripe;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  _stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  });

  return _stripe;
}

function resolveStripeAccountStatus(account: Stripe.Account):
  | 'not_created'
  | 'pending'
  | 'restricted'
  | 'complete'
  | 'disabled' {
  if (account.charges_enabled && account.payouts_enabled) {
    return 'complete';
  }

  const disabledReason = account.requirements?.disabled_reason ?? null;
  const hasOutstandingRequirements =
    (account.requirements?.currently_due?.length ?? 0) > 0 ||
    (account.requirements?.past_due?.length ?? 0) > 0 ||
    (account.requirements?.pending_verification?.length ?? 0) > 0;

  if (disabledReason) {
    return /rejected|fraud|listed|platform_paused|other/i.test(disabledReason)
      ? 'disabled'
      : 'restricted';
  }

  if (hasOutstandingRequirements) {
    return 'restricted';
  }

  return 'pending';
}

async function syncLeagueStripeCollectionStatus(
  leagueId: string,
  stripeAccountId: string | null,
  currentStatus?: string | null
) {
  if (!stripeAccountId) {
    return {
      canAcceptPayments: false,
      canPayout: false,
      status: 'not_created' as const,
    };
  }

  const stripe = getStripeClient();
  const serviceSupabase = createServiceRoleClient();

  const account = await stripe.accounts.retrieve(stripeAccountId);
  const status = resolveStripeAccountStatus(account);

  if (currentStatus !== status) {
    await serviceSupabase
      .from('leagues')
      .update({
        stripe_account_status: status,
        payment_mode: account.charges_enabled ? 'stripe' : 'manual',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leagueId);
  }

  return {
    canAcceptPayments: account.charges_enabled,
    canPayout: account.payouts_enabled,
    status,
  };
}

// ============================================================================
// Helper: Generate Idempotency Key
// ============================================================================

function generateIdempotencyKey(
  operation: string,
  data: Record<string, unknown>
): string {
  // Sort keys for deterministic stringification
  const sortedData = Object.keys(data)
    .sort()
    .reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {} as Record<string, unknown>);

  // Create hash
  const hash = crypto
    .createHash('sha256')
    .update(operation + JSON.stringify(sortedData))
    .digest('hex')
    .substring(0, 16);

  return `${operation}-${hash}`;
}

// ============================================================================
// Helper: Calculate Application Fee (3.5%)
// ============================================================================

function calculateApplicationFee(amountCents: number): number {
  const feePercent = 3.5;
  const fee = Math.round((amountCents * feePercent) / 100);

  // Minimum fee: $0.50
  return Math.max(fee, 50);
}

// ============================================================================
// Helper: Get Current Player ID
// ============================================================================

async function getCurrentPlayerId(accessToken?: string): Promise<string | null> {
  if (accessToken) {
    const serviceSupabase = createServiceRoleClient();
    const { data, error } = await serviceSupabase.auth.getUser(accessToken);
    if (error) {
      console.error('[Registration Payments] Token auth error:', error);
      return null;
    }
    return data.user?.id || null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

async function getLeagueIdForSlug(leagueSlug: string): Promise<string | null> {
  const serviceSupabase = createServiceRoleClient();
  const { data: league } = await serviceSupabase
    .from('leagues')
    .select('id')
    .eq('slug', leagueSlug)
    .single();

  return league?.id || null;
}

async function getPlayerRegistrationRowsForLeague(leagueSlug: string, accessToken?: string) {
  const playerId = await getCurrentPlayerId(accessToken);
  if (!playerId) {
    return { playerId: null, leagueId: null, rows: [] as any[] };
  }

  const leagueId = await getLeagueIdForSlug(leagueSlug);
  if (!leagueId) {
    return { playerId, leagueId: null, rows: [] as any[] };
  }

  const serviceSupabase = createServiceRoleClient();
  const { data: rows, error } = await serviceSupabase
    .from('registration_submissions')
    .select(`
      id,
      season_id,
      team_id,
      status,
      submitted_at,
      payment_status,
      amount_paid_cents,
      fee_amount_cents,
      currency,
      stripe_payment_intent_id,
      created_at,
      registration_type
    `)
    .eq('player_id', playerId)
    .eq('league_id', leagueId)
    .not('submitted_at', 'is', null)
    .or('payment_status.neq.not_required,fee_amount_cents.gt.0')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Registration Payments] Registration rows fetch error:', error);
    return { playerId, leagueId, rows: [] as any[] };
  }

  const seasonIds = [...new Set((rows || []).map((row: any) => row.season_id).filter(Boolean))];
  const teamIds = [...new Set((rows || []).map((row: any) => row.team_id).filter(Boolean))];

  const [seasonsResult, teamsResult] = await Promise.all([
    seasonIds.length > 0
      ? serviceSupabase
          .from('seasons')
          .select('id, name, start_date, end_date')
          .in('id', seasonIds)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length > 0
      ? serviceSupabase
          .from('teams')
          .select('id, name, logo_url')
          .in('id', teamIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (seasonsResult.error) {
    console.error('[Registration Payments] Seasons fetch error:', seasonsResult.error);
  }

  if (teamsResult.error) {
    console.error('[Registration Payments] Teams fetch error:', teamsResult.error);
  }

  const seasonsById = new Map((seasonsResult.data || []).map((season: any) => [season.id, season]));
  const teamsById = new Map((teamsResult.data || []).map((team: any) => [team.id, team]));

  const hydratedRows = (rows || []).map((row: any) => ({
    ...row,
    season: seasonsById.get(row.season_id) || null,
    team: teamsById.get(row.team_id) || null,
  }));

  return {
    playerId,
    leagueId,
    rows: hydratedRows,
  };
}

// ============================================================================
// Action: Create Registration Payment Checkout Session
// ============================================================================

export async function createRegistrationCheckout(
  registrationId: string,
  successUrl: string,
  cancelUrl: string
): Promise<ActionResult<CheckoutSessionResult>> {
  try {
    const playerId = await getCurrentPlayerId();
    if (!playerId) {
      return { success: false, error: 'Authentication required. Please sign in.' };
    }

    const supabase = await createClient();

    // Fetch registration with league details
    const { data: registration, error: fetchError } = await supabase
      .from('registration_submissions')
      .select(`
        id,
        player_id,
        league_id,
        season_id,
        team_id,
        registration_type,
        payment_status,
        amount_paid_cents,
        fee_amount_cents,
        currency,
        stripe_checkout_session_id,
        leagues!inner (
          id,
          name,
          stripe_account_id,
          stripe_account_status
        )
      `)
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      console.error('[Registration Payments] Fetch error:', fetchError);
      return { success: false, error: 'Registration not found.' };
    }

    // Verify player owns this registration
    if (registration.player_id !== playerId) {
      return { success: false, error: 'You can only pay for your own registrations.' };
    }

    // Check payment status
    if (registration.payment_status === 'completed') {
      return { success: false, error: 'This registration has already been paid in full.' };
    }
    const paymentSettings = await getSeasonPaymentSettings(
      createServiceRoleClient() as any,
      registration.league_id,
      registration.season_id
    );
    const playerFeeAmountCents = getPlayerRegistrationFeeAmount(
      paymentSettings.feeBasis,
      paymentSettings.feeAmountCents
    );
    const paymentMode = getRegistrationPaymentMode(
      paymentSettings.feeCollectionModel,
      paymentSettings.feeAmountCents,
      paymentSettings.feeBasis
    );

    if (paymentMode === 'hidden') {
      return {
        success: false,
        error: usesTeamBilling(paymentSettings.feeCollectionModel, paymentSettings.feeBasis)
          ? 'This season uses team billing. Individual player payment is not required.'
          : 'This season does not currently have an individual player fee configured.',
      };
    }

    if (registration.payment_status === 'not_required' && paymentMode !== 'optional') {
      return { success: false, error: 'This registration does not require payment.' };
    }

    const league = registration.leagues as any;

    const stripeAvailability = await syncLeagueStripeCollectionStatus(
      registration.league_id,
      league?.stripe_account_id || null,
      league?.stripe_account_status || null
    );

    if (!league?.stripe_account_id || !stripeAvailability.canAcceptPayments) {
      return {
        success: false,
        error: 'This league has not set up payment processing yet. Please contact the league administrator.',
      };
    }

    // Calculate amount owed
    const feeAmount =
      registration.fee_amount_cents || playerFeeAmountCents || 0;
    const amountPaid = registration.amount_paid_cents || 0;
    const amountOwed = feeAmount - amountPaid;

    if (amountOwed <= 0) {
      return { success: false, error: 'No payment is due for this registration.' };
    }

    // Calculate platform application fee (3.5%)
    const applicationFee = calculateApplicationFee(amountOwed);

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', playerId)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId && profile?.email) {
      // Create Stripe customer with idempotency key
      const stripe = getStripeClient();
      const customerIdempotencyKey = generateIdempotencyKey('create_customer', {
        player_id: playerId,
        email: profile.email,
      });

      const customer = await stripe.customers.create(
        {
          email: profile.email,
          name: profile.full_name || undefined,
          metadata: {
            player_id: playerId,
            platform: 'beerleaguehockey',
          },
        },
        { idempotencyKey: customerIdempotencyKey }
      );

      stripeCustomerId = customer.id;

      // Save customer ID to profile (use service role to bypass RLS on profile updates)
      const serviceClient = createServiceRoleClient();
      await serviceClient
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', playerId);
    }

    // Create Stripe Checkout Session with idempotency key
    const stripe = getStripeClient();
    const idempotencyKey = generateIdempotencyKey('create_checkout', {
      registration_id: registrationId,
      amount: amountOwed,
    });

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: stripeCustomerId || undefined,
        customer_email: stripeCustomerId ? undefined : (profile?.email || undefined),
        line_items: [
          {
            price_data: {
              currency: registration.currency || paymentSettings.currency || 'cad',
              product_data: {
                name: `${registration.registration_type} Registration`,
                description: `${league.name} - Registration Fee`,
              },
              unit_amount: amountOwed,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: league.stripe_account_id,
          },
          metadata: {
            registration_id: registrationId,
            player_id: playerId,
            league_id: registration.league_id,
            season_id: registration.season_id,
            platform: 'beerleaguehockey',
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          registration_id: registrationId,
          type: 'registration_fee', // Used by webhook handler
        },
      },
      {
        idempotencyKey,
      }
    );

    // Store checkout session ID for tracking
    await supabase
      .from('registration_submissions')
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: 'pending', // Mark as pending payment
      })
      .eq('id', registrationId);

    return {
      success: true,
      data: {
        checkoutUrl: session.url!,
        sessionId: session.id,
      },
    };
  } catch (error) {
    console.error('[Registration Payments] Create checkout error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Failed to create payment session. Please try again.' };
  }
}

// ============================================================================
// Action: Create Embedded Checkout Session
// ============================================================================

interface EmbeddedCheckoutResult {
  clientSecret: string;
  sessionId: string;
}

export async function createEmbeddedCheckout(
  registrationId: string,
  returnUrl: string
): Promise<ActionResult<EmbeddedCheckoutResult>> {
  try {
    const playerId = await getCurrentPlayerId();
    if (!playerId) {
      return { success: false, error: 'Authentication required. Please sign in.' };
    }

    const supabase = await createClient();

    // Fetch registration with league details
    const { data: registration, error: fetchError } = await supabase
      .from('registration_submissions')
      .select(`
        id,
        player_id,
        league_id,
        season_id,
        team_id,
        registration_type,
        payment_status,
        amount_paid_cents,
        fee_amount_cents,
        currency,
        stripe_checkout_session_id,
        leagues!inner (
          id,
          name,
          stripe_account_id,
          stripe_account_status
        )
      `)
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      console.error('[Registration Payments] Fetch error:', fetchError);
      return { success: false, error: 'Registration not found.' };
    }

    // Verify player owns this registration
    if (registration.player_id !== playerId) {
      return { success: false, error: 'You can only pay for your own registrations.' };
    }

    // Check payment status
    if (registration.payment_status === 'completed') {
      return { success: false, error: 'This registration has already been paid in full.' };
    }
    const paymentSettings = await getSeasonPaymentSettings(
      createServiceRoleClient() as any,
      registration.league_id,
      registration.season_id
    );
    const playerFeeAmountCents = getPlayerRegistrationFeeAmount(
      paymentSettings.feeBasis,
      paymentSettings.feeAmountCents
    );
    const paymentMode = getRegistrationPaymentMode(
      paymentSettings.feeCollectionModel,
      paymentSettings.feeAmountCents,
      paymentSettings.feeBasis
    );

    if (paymentMode === 'hidden') {
      return {
        success: false,
        error: usesTeamBilling(paymentSettings.feeCollectionModel, paymentSettings.feeBasis)
          ? 'This season uses team billing. Individual player payment is not required.'
          : 'This season does not currently have an individual player fee configured.',
      };
    }

    if (registration.payment_status === 'not_required' && paymentMode !== 'optional') {
      return { success: false, error: 'This registration does not require payment.' };
    }

    const league = registration.leagues as any;

    const stripeAvailability = await syncLeagueStripeCollectionStatus(
      registration.league_id,
      league?.stripe_account_id || null,
      league?.stripe_account_status || null
    );

    if (!league?.stripe_account_id || !stripeAvailability.canAcceptPayments) {
      return {
        success: false,
        error: 'This league has not set up payment processing yet. Please contact the league administrator.',
      };
    }

    // Calculate amount owed
    const feeAmount =
      registration.fee_amount_cents || playerFeeAmountCents || 0;
    const amountPaid = registration.amount_paid_cents || 0;
    const amountOwed = feeAmount - amountPaid;

    if (amountOwed <= 0) {
      return { success: false, error: 'No payment is due for this registration.' };
    }

    // Calculate platform application fee (3.5%)
    const applicationFee = calculateApplicationFee(amountOwed);

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', playerId)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId && profile?.email) {
      const stripe = getStripeClient();
      const customerIdempotencyKey = generateIdempotencyKey('create_customer', {
        player_id: playerId,
        email: profile.email,
      });

      const customer = await stripe.customers.create(
        {
          email: profile.email,
          name: profile.full_name || undefined,
          metadata: {
            player_id: playerId,
            platform: 'beerleaguehockey',
          },
        },
        { idempotencyKey: customerIdempotencyKey }
      );

      stripeCustomerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', playerId);
    }

    // Create Embedded Checkout Session
    const stripe = getStripeClient();
    const idempotencyKey = generateIdempotencyKey('create_embedded_checkout', {
      registration_id: registrationId,
      amount: amountOwed,
      timestamp: Math.floor(Date.now() / 60000).toString(), // 1-minute granularity
    });

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        ui_mode: 'embedded', // Key difference for embedded checkout
        customer: stripeCustomerId || undefined,
        customer_email: stripeCustomerId ? undefined : (profile?.email || undefined),
        line_items: [
          {
            price_data: {
              currency: registration.currency || paymentSettings.currency || 'cad',
              product_data: {
                name: `${registration.registration_type} Registration`,
                description: `${league.name} - Registration Fee`,
              },
              unit_amount: amountOwed,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: league.stripe_account_id,
          },
          metadata: {
            registration_id: registrationId,
            player_id: playerId,
            league_id: registration.league_id,
            season_id: registration.season_id,
            platform: 'hockeylifehl',
          },
        },
        return_url: returnUrl,
        metadata: {
          registration_id: registrationId,
          type: 'registration_fee',
        },
      },
      {
        idempotencyKey,
      }
    );

    // Store checkout session ID for tracking
    await supabase
      .from('registration_submissions')
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: 'pending',
      })
      .eq('id', registrationId);

    return {
      success: true,
      data: {
        clientSecret: session.client_secret!,
        sessionId: session.id,
      },
    };
  } catch (error) {
    console.error('[Registration Payments] Create embedded checkout error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Failed to create payment session. Please try again.' };
  }
}

// ============================================================================
// Action: Get Payment Intent ID from a completed Checkout Session
// ============================================================================

/**
 * After the embedded checkout completes, retrieve the payment_intent ID
 * so it can be stored in formData for server-side verification on submit.
 */
export async function getSessionPaymentIntentId(
  registrationId: string
): Promise<ActionResult<{ paymentIntentId: string }>> {
  try {
    const playerId = await getCurrentPlayerId();
    if (!playerId) {
      return { success: false, error: 'Authentication required.' };
    }

    const supabase = await createClient();

    const { data: registration, error: fetchError } = await supabase
      .from('registration_submissions')
      .select('id, player_id, stripe_checkout_session_id')
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      return { success: false, error: 'Registration not found.' };
    }

    if (registration.player_id !== playerId) {
      return { success: false, error: 'Unauthorized.' };
    }

    if (!registration.stripe_checkout_session_id) {
      return { success: false, error: 'No checkout session found for this registration.' };
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(
      registration.stripe_checkout_session_id
    );

    if (!session.payment_intent || typeof session.payment_intent !== 'string') {
      return { success: false, error: 'Payment intent not found in session.' };
    }

    return { success: true, data: { paymentIntentId: session.payment_intent } };
  } catch (error) {
    console.error('[Registration Payments] getSessionPaymentIntentId error:', error);
    return { success: false, error: 'Failed to retrieve payment confirmation.' };
  }
}

// ============================================================================
// Action: Get Outstanding Balance for League
// ============================================================================

interface OutstandingBalance {
  hasBalance: boolean;
  amountCents: number;
  registrationId: string | null;
}

export async function getOutstandingBalance(
  leagueSlug: string,
  accessToken?: string
): Promise<OutstandingBalance> {
  try {
    const { playerId, rows } = await getPlayerRegistrationRowsForLeague(leagueSlug, accessToken);
    if (!playerId) {
      return { hasBalance: false, amountCents: 0, registrationId: null };
    }

    if (!rows || rows.length === 0) {
      return { hasBalance: false, amountCents: 0, registrationId: null };
    }

    const reg =
      rows.find(
        (row: {
          payment_status: RegistrationPaymentRegistration['payment_status'];
        }) => ['pending', 'draft'].includes(row.payment_status)
      ) || rows[0];
    const amountOwed = (reg.fee_amount_cents || 0) - (reg.amount_paid_cents || 0);

    if (amountOwed <= 0) {
      return { hasBalance: false, amountCents: 0, registrationId: null };
    }

    return {
      hasBalance: true,
      amountCents: amountOwed,
      registrationId: reg.id,
    };
  } catch (error) {
    console.error('[Registration Payments] Get outstanding balance error:', error);
    return { hasBalance: false, amountCents: 0, registrationId: null };
  }
}

// ============================================================================
// Action: Get Payment History for League
// ============================================================================

export async function getRegistrationPaymentHistory(
  leagueSlug: string,
  accessToken?: string
): Promise<ActionResult<RegistrationPaymentHistory[]>> {
  try {
    const { playerId, rows } = await getPlayerRegistrationRowsForLeague(leagueSlug, accessToken);
    if (!playerId) {
      return { success: false, error: 'Authentication required.' };
    }

    // Transform to payment history format
    const history: RegistrationPaymentHistory[] = (rows || []).map((reg: any) => ({
      id: reg.id,
      amount: reg.amount_paid_cents || 0,
      status: reg.payment_status === 'completed' ? 'succeeded' :
              reg.payment_status === 'failed' ? 'failed' :
              reg.payment_status === 'refunded' ? 'refunded' : 'pending',
      description: `${reg.registration_type} Registration`,
      created_at: reg.created_at,
      payment_method: reg.stripe_payment_intent_id ? 'Card' : undefined,
    }));

    return { success: true, data: history };
  } catch (error) {
    console.error('[Registration Payments] Get history error:', error);
    return { success: false, error: 'Failed to fetch payment history.' };
  }
}

export async function getRegistrationPaymentRegistrations(
  leagueSlug: string,
  accessToken?: string
): Promise<ActionResult<RegistrationPaymentRegistration[]>> {
  try {
    const { playerId, rows } = await getPlayerRegistrationRowsForLeague(leagueSlug, accessToken);
    if (!playerId) {
      return { success: false, error: 'Authentication required.' };
    }

    const registrations: RegistrationPaymentRegistration[] = (rows || []).map((reg: any) => {
      const rawTeam = Array.isArray(reg.team) ? reg.team[0] : reg.team;

      return {
        id: reg.id,
        season_id: reg.season_id,
        team_id: reg.team_id,
        status: reg.status,
        payment_status: reg.payment_status,
        fee_amount_cents: reg.fee_amount_cents || 0,
        currency: reg.currency || 'cad',
        amount_paid_cents: reg.amount_paid_cents || 0,
        stripe_payment_intent_id: reg.stripe_payment_intent_id,
        created_at: reg.created_at,
        season: Array.isArray(reg.season) ? reg.season[0] : reg.season,
        team: rawTeam
          ? {
              ...rawTeam,
              logo: rawTeam.logo_url || null,
            }
          : null,
        registration_type: {
          id: reg.id,
          name: `${reg.registration_type} Registration`,
          fee_amount_cents: reg.fee_amount_cents || 0,
        },
      };
    });

    return { success: true, data: registrations };
  } catch (error) {
    console.error('[Registration Payments] Get registrations error:', error);
    return { success: false, error: 'Failed to load registrations.' };
  }
}
