/**
 * Player Fee Collection Types
 *
 * Type definitions for the player payment system.
 */

// ============================================================================
// Enums (matching database)
// ============================================================================

export type PaymentPlanType = 'full' | 'two_pay' | 'three_pay';
export type FeeBasis = 'player' | 'team';

export type PlayerPaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled'
  | 'failed'
  | 'disputed';

export type PaymentTransactionType =
  | 'payment'
  | 'refund'
  | 'installment'
  | 'late_fee'
  | 'adjustment';

// ============================================================================
// Season Fees
// ============================================================================

export interface SeasonFee {
  id: string;
  league_id: string;
  season_id: string;
  name: string;
  description: string | null;
  amount_cents: number;
  fee_basis: FeeBasis;
  default_player_contribution_cents: number;
  currency: string;
  allow_full_payment: boolean;
  allow_two_pay: boolean;
  allow_three_pay: boolean;
  payment_deadline: string | null;
  early_bird_deadline: string | null;
  early_bird_discount_cents: number;
  late_fee_cents: number;
  installment_fee_cents: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SeasonFeeWithSeason extends SeasonFee {
  seasons: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
}

export interface CreateSeasonFeeParams {
  leagueId: string;
  seasonId: string;
  name: string;
  description?: string;
  amountCents: number;
  feeBasis?: FeeBasis;
  defaultPlayerContributionCents?: number;
  currency?: string;
  allowFullPayment?: boolean;
  allowTwoPay?: boolean;
  allowThreePay?: boolean;
  paymentDeadline?: string;
  earlyBirdDeadline?: string;
  earlyBirdDiscountCents?: number;
  lateFeeCents?: number;
  installmentFeeCents?: number;
}

export interface UpdateSeasonFeeParams extends Partial<CreateSeasonFeeParams> {
  feeId: string;
  isActive?: boolean;
}

// ============================================================================
// Player Payments
// ============================================================================

export interface PlayerPayment {
  id: string;
  player_id: string;
  season_fee_id: string;
  team_id: string | null;
  league_id: string;
  season_id: string;
  payment_plan: PaymentPlanType;
  base_amount_cents: number;
  discount_cents: number;
  late_fee_cents: number;
  installment_fee_cents: number;
  total_amount_cents: number;
  amount_paid_cents: number;
  currency: string;
  status: PlayerPaymentStatus;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  total_installments: number;
  current_installment: number;
  next_payment_date: string | null;
  reminder_sent_count: number;
  last_reminder_sent_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface PlayerPaymentWithDetails extends PlayerPayment {
  player: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  season_fee: {
    id: string;
    name: string;
    amount_cents: number;
  };
  team: {
    id: string;
    name: string;
    short_name: string;
  } | null;
}

export interface CreatePlayerPaymentParams {
  playerId: string;
  seasonFeeId: string;
  teamId?: string;
  paymentPlan: PaymentPlanType;
}

// ============================================================================
// Payment Transactions
// ============================================================================

export interface PaymentTransaction {
  id: string;
  player_payment_id: string;
  transaction_type: PaymentTransactionType;
  amount_cents: number;
  application_fee_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  installment_number: number | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
  idempotency_key: string | null;
}

// ============================================================================
// Checkout
// ============================================================================

export interface CreateCheckoutParams {
  playerPaymentId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  checkoutSessionId: string;
  checkoutUrl: string;
}

// ============================================================================
// Refunds
// ============================================================================

export interface RefundPlayerPaymentParams {
  playerPaymentId: string;
  amountCents?: number; // Full refund if not specified
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  notes?: string;
}

export interface RefundResult {
  refundId: string;
  amountRefunded: number;
  applicationFeeRefunded: number;
  status: string;
}

// ============================================================================
// Reports & Statistics
// ============================================================================

export interface PaymentSummary {
  totalExpectedCents: number;
  totalCollectedCents: number;
  totalOutstandingCents: number;
  playersPaidFull: number;
  playersPartial: number;
  playersPending: number;
  playersOverdue: number;
}

export interface PaymentReportRow {
  playerId: string;
  playerName: string;
  playerEmail: string;
  teamName: string | null;
  feeName: string;
  paymentPlan: PaymentPlanType;
  totalAmount: number;
  amountPaid: number;
  amountOutstanding: number;
  status: PlayerPaymentStatus;
  currentInstallment: number;
  totalInstallments: number;
  nextPaymentDate: string | null;
  createdAt: string;
  paidAt: string | null;
}

// ============================================================================
// Action Results
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
