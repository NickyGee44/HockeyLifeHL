/**
 * Subscription Types for Platform 1 (Organization-level billing)
 *
 * These types define the subscription model for organizations using the HockeyLifeHL platform.
 * Separate from league-level Stripe Connect (marketplace payments).
 */

// ============================================================================
// Subscription Tiers
// ============================================================================

export type SubscriptionTier = 'starter' | 'pro' | 'business' | 'enterprise';

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, {
  name: string;
  price: number; // in dollars
  interval: 'month' | 'year';
  features: string[];
  limits: {
    maxPlayersTotal: number | 'unlimited'; // Total players across all leagues
    maxLeagues: number | 'unlimited';
    maxAdmins: number | 'unlimited';
    customBranding: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    dedicatedDeployment: boolean;
    isolatedDeployment: boolean;
    whiteLabel: boolean;
    sla: boolean;
  };
}> = {
  starter: {
    name: 'Starter',
    price: 99,
    interval: 'month',
    features: [
      'Up to 100 players total',
      'Unlimited leagues',
      'Shared deployment',
      'Basic statistics',
      'Email support',
      '14-day free trial',
    ],
    limits: {
      maxPlayersTotal: 100,
      maxLeagues: 'unlimited',
      maxAdmins: 3,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
      dedicatedDeployment: false,
      isolatedDeployment: false,
      whiteLabel: false,
      sla: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 299,
    interval: 'month',
    features: [
      'Up to 500 players total',
      'Unlimited leagues',
      'Shared deployment',
      'Advanced statistics & analytics',
      'Priority email support',
      'API access',
    ],
    limits: {
      maxPlayersTotal: 500,
      maxLeagues: 'unlimited',
      maxAdmins: 10,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      dedicatedDeployment: false,
      isolatedDeployment: false,
      whiteLabel: false,
      sla: false,
    },
  },
  business: {
    name: 'Business',
    price: 799,
    interval: 'month',
    features: [
      'Unlimited players',
      'Unlimited leagues',
      'Dedicated deployment',
      'Advanced statistics & analytics',
      'Priority support',
      'API access',
      'Custom branding',
    ],
    limits: {
      maxPlayersTotal: 'unlimited',
      maxLeagues: 'unlimited',
      maxAdmins: 'unlimited',
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      dedicatedDeployment: true,
      isolatedDeployment: false,
      whiteLabel: false,
      sla: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 0, // Custom pricing
    interval: 'month',
    features: [
      'Everything in Business',
      'Isolated deployment',
      'White-label options',
      'SLA guarantees',
      'Phone & Slack support',
      'Custom integrations',
      'Dedicated account manager',
      'Custom contracts',
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
    },
  },
};

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

export const FEATURES_BY_TIER: Record<SubscriptionTier, Feature[]> = {
  starter: ['basic_leagues', 'basic_stats'],
  pro: [
    'basic_leagues',
    'basic_stats',
    'advanced_stats',
    'custom_branding',
    'api_access',
    'priority_support',
    'unlimited_leagues',
  ],
  business: [
    'basic_leagues',
    'basic_stats',
    'advanced_stats',
    'custom_branding',
    'api_access',
    'priority_support',
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
