/**
 * Subscription Types for Platform (Organization-level billing)
 *
 * Beer League Hockey pricing model:
 * - Platform Monthly: $0/mo — hosting, maintenance, all core features
 * - 3.5% processing fee on all player payments (configurable per league)
 * - Optional add-ons: Advanced Stats ($14.99/mo), AI News ($14.99/mo)
 * - Premium services: Custom domain, data import (contact for quote)
 *
 * NOTE: The tier types below are retained for backward compatibility with
 * existing database records and Stripe subscription IDs.
 */

// ============================================================================
// Subscription Tiers
// ============================================================================

// Platform subscription with optional add-ons
export type SubscriptionTier = 'free' | 'custom_domain' | 'enterprise';

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, {
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    maxPlayersTotal: number | 'unlimited';
    maxLeagues: number | 'unlimited';
    maxAdmins: number | 'unlimited';
    customBranding: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    dedicatedDeployment: boolean;
    isolatedDeployment: boolean;
    whiteLabel: boolean;
    sla: boolean;
    customDomain: boolean;
  };
}> = {
  free: {
    name: 'Platform Monthly',
    price: 0,
    interval: 'month',
    features: [
      'Unlimited leagues',
      'Unlimited teams & players',
      'Schedule generation',
      'Standings & statistics',
      'Player registration system',
      'Game scorekeeping',
      'Custom branding & colors',
      'Public league website',
      'Email notifications',
      'Analytics dashboard',
    ],
    limits: {
      maxPlayersTotal: 'unlimited',
      maxLeagues: 'unlimited',
      maxAdmins: 'unlimited',
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
      dedicatedDeployment: false,
      isolatedDeployment: false,
      whiteLabel: false,
      sla: false,
      customDomain: false,
    },
  },
  custom_domain: {
    name: 'Custom Domain',
    price: 0, // Custom pricing - contact sales
    interval: 'month',
    features: [
      'Everything in Free',
      'Use your own domain',
      'SSL certificate included',
      'DNS setup assistance',
    ],
    limits: {
      maxPlayersTotal: 'unlimited',
      maxLeagues: 'unlimited',
      maxAdmins: 'unlimited',
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
      dedicatedDeployment: false,
      isolatedDeployment: false,
      whiteLabel: false,
      sla: false,
      customDomain: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 0, // Custom pricing - contact sales
    interval: 'month',
    features: [
      'Everything in Free',
      'Custom domain',
      'Historic data import',
      'API access',
      'Priority support',
      'Custom integrations',
      'Dedicated account manager',
    ],
    limits: {
      maxPlayersTotal: 'unlimited',
      maxLeagues: 'unlimited',
      maxAdmins: 'unlimited',
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      dedicatedDeployment: true,
      isolatedDeployment: true,
      whiteLabel: true,
      sla: true,
      customDomain: true,
    },
  },
};

// Platform transaction fee is now DB-driven via platform_fee_config table.
// Use getPlatformFeeConfig() from '@/lib/fees/platform-fees' instead.

// ============================================================================
// Subscription Status
// ============================================================================

export type SubscriptionStatus =
  | 'trialing'       // Currently in trial period
  | 'active'         // Active paid subscription
  | 'past_due'       // Payment failed, in grace period
  | 'canceled'       // Cancelled by user
  | 'unpaid'         // Payment failed multiple times
  | 'incomplete'     // Checkout session not completed
  | 'incomplete_expired'; // Checkout session expired

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: 'Trial',
  active: 'Active',
  past_due: 'Past Due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
};

// ============================================================================
// Subscription Data Structures
// ============================================================================

export interface OrganizationSubscription {
  // Tier & Status
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Stripe IDs
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;

  // Billing Cycle
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  billingCycleAnchor: number | null;

  // Trial
  trialEndsAt: Date | null;

  // Payment Method
  defaultPaymentMethodId: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;

  // Lifecycle
  subscriptionCreatedAt: Date | null;
  subscriptionStartedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  cancelAtPeriodEnd: boolean;

  // Discounts
  couponId: string | null;
  discountEndAt: Date | null;

  // Metadata
  subscriptionMetadata: Record<string, unknown>;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
}

// ============================================================================
// Billing History
// ============================================================================

export interface Invoice {
  id: string;
  amount: number; // in cents
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  paidAt: Date | null;
  dueDate: Date | null;
  invoicePdf: string | null;
  invoiceUrl: string | null;
  description: string | null;
  currency: string;
}

// ============================================================================
// Subscription Events
// ============================================================================

export type SubscriptionEventType =
  | 'created'
  | 'upgraded'
  | 'downgraded'
  | 'cancelled'
  | 'reactivated'
  | 'payment_failed'
  | 'payment_succeeded'
  | 'trial_ending'
  | 'trial_ended';

export interface SubscriptionEvent {
  id: string;
  organizationId: string;
  eventType: SubscriptionEventType;
  fromTier: SubscriptionTier | null;
  toTier: SubscriptionTier | null;
  fromStatus: SubscriptionStatus | null;
  toStatus: SubscriptionStatus | null;
  stripeEventId: string | null;
  amountCents: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  createdBy: string | null;
}

// ============================================================================
// Action Results
// ============================================================================

export interface SubscriptionCheckoutResult {
  subscriptionId: string;
  clientSecret?: string; // For 3D Secure or setup intent
  requiresAction: boolean;
}

export interface BillingPortalResult {
  url: string;
}

export interface ProrationPreview {
  amountDue: number; // in cents
  currentPeriodEnd: Date;
  nextInvoiceDate: Date;
  prorationDate: Date;
}

// ============================================================================
// Webhook Event Payloads
// ============================================================================

export interface StripeSubscriptionWebhookData {
  id: string;
  object: 'subscription';
  customer: string;
  status: SubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  trial_start: number | null;
  trial_end: number | null;
  metadata: {
    organization_id?: string;
    entity_type?: 'organization' | 'league';
  };
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        product: string;
        unit_amount: number;
        currency: string;
      };
    }>;
  };
}

export interface StripeInvoiceWebhookData {
  id: string;
  object: 'invoice';
  customer: string;
  subscription: string | null;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amount_due: number;
  amount_paid: number;
  currency: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  paid: boolean;
  metadata: {
    organization_id?: string;
  };
}

// ============================================================================
// Feature Flags
// ============================================================================

export type Feature =
  | 'basic_leagues'
  | 'basic_stats'
  | 'advanced_stats'
  | 'custom_branding'
  | 'api_access'
  | 'priority_support'
  | 'unlimited_leagues'
  | 'unlimited_players'
  | 'white_label'
  | 'custom_integrations';

// Features by tier
export const FEATURES_BY_TIER: Record<SubscriptionTier, Feature[]> = {
  free: [
    'basic_leagues',
    'basic_stats',
    'advanced_stats',
    'custom_branding',
    'unlimited_leagues',
    'unlimited_players',
  ],
  custom_domain: [
    'basic_leagues',
    'basic_stats',
    'advanced_stats',
    'custom_branding',
    'unlimited_leagues',
    'unlimited_players',
  ],
  enterprise: [
    'basic_leagues',
    'basic_stats',
    'advanced_stats',
    'custom_branding',
    'api_access',
    'priority_support',
    'unlimited_leagues',
    'unlimited_players',
    'white_label',
    'custom_integrations',
  ],
};

// ============================================================================
// Utility Types
// ============================================================================

export interface CancellationFeedback {
  reason: 'too_expensive' | 'missing_features' | 'switching_service' | 'not_using' | 'other';
  feedback?: string;
}

export const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'switching_service', label: 'Switching to another service' },
  { value: 'not_using', label: 'Not using the product anymore' },
  { value: 'other', label: 'Other' },
] as const;
