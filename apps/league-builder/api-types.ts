/**
 * Platform 1 (League Builder) API Types
 *
 * TypeScript type definitions for all Server Actions and REST API endpoints.
 * This file provides type safety for client-side code consuming the API.
 *
 * @version 1.0.0
 * @lastUpdated 2026-01-31
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Standard response format for Server Actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Subscription tiers
 */
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid';

/**
 * User role
 */
export type UserRole = 'owner' | 'admin' | 'member';

/**
 * Player position
 */
export type PlayerPosition = 'forward' | 'defense' | 'goalie';

/**
 * Roster status
 */
export type RosterStatus = 'active' | 'inactive' | 'injured' | 'suspended' | 'traded';

/**
 * Leadership role
 */
export type LeadershipRole = 'captain' | 'alternate' | null;

/**
 * Staff role
 */
export type StaffRole =
  | 'head_coach'
  | 'assistant_coach'
  | 'goalie_coach'
  | 'manager'
  | 'trainer'
  | 'equipment_manager';

/**
 * Registration type
 */
export type RegistrationType = 'open' | 'approval_required' | 'invite_only';

/**
 * League status
 */
export type LeagueStatus = 'draft' | 'active' | 'archived';

/**
 * Season status
 */
export type SeasonStatus = 'upcoming' | 'active' | 'completed';

// ============================================================================
// Database Models
// ============================================================================

/**
 * User profile
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Organization
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  subscription_created_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  default_payment_method_id: string | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  subscription_version: number;
  last_stripe_event_timestamp: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Organization member
 */
export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  status: 'pending' | 'active';
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

/**
 * League
 */
export interface League {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state_province: string;
  country: string;
  timezone: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  status: LeagueStatus;
  created_by: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Season
 */
export interface Season {
  id: string;
  league_id: string;
  name: string;
  start_date: string;
  end_date: string;
  registration_opens: string | null;
  registration_closes: string | null;
  registration_type: RegistrationType;
  status: SeasonStatus;
  game_duration_minutes: number;
  period_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Team
 */
export interface Team {
  id: string;
  league_id: string;
  season_id: string;
  division_id: string | null;
  name: string;
  short_name: string | null;
  color: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Team roster entry
 */
export interface TeamRoster {
  id: string;
  team_id: string;
  player_id: string;
  season_id: string;
  division_id: string | null;
  jersey_number: number;
  position: PlayerPosition;
  status: RosterStatus;
  leadership_role: LeadershipRole;
  start_date: string;
  end_date: string | null;
}

/**
 * Team roster with player details
 */
export interface TeamRosterPlayer extends TeamRoster {
  full_name: string;
  email: string;
}

/**
 * Team staff entry
 */
export interface TeamStaff {
  id: string;
  team_id: string;
  person_id: string;
  season_id: string;
  role: StaffRole;
  start_date: string;
  end_date: string | null;
}

/**
 * Team staff with person details
 */
export interface TeamStaffMember extends TeamStaff {
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

/**
 * User consent
 */
export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
}

// ============================================================================
// Authentication Action Types
// ============================================================================

/**
 * Sign up parameters (FormData keys)
 */
export interface SignUpFormData {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  acceptTerms: 'on' | 'off';
  acceptPrivacy: 'on' | 'off';
  marketingEmails?: 'on' | 'off';
  analyticsTracking?: 'on' | 'off';
}

/**
 * Sign in parameters (FormData keys)
 */
export interface SignInFormData {
  email: string;
  password: string;
}

/**
 * Current user response
 */
export interface CurrentUser {
  user: {
    id: string;
    email: string;
    [key: string]: unknown; // Supabase User object
  };
  profile: Profile;
}

// ============================================================================
// Organization Action Types
// ============================================================================

/**
 * Update organization profile parameters
 */
export interface UpdateOrganizationProfileFormData {
  organizationId: string;
  name: string;
  slug: string;
}

/**
 * Invite organization member parameters
 */
export interface InviteOrganizationMemberFormData {
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
}

/**
 * Update member role parameters
 */
export interface UpdateMemberRoleFormData {
  organizationId: string;
  memberId: string;
  role: 'admin' | 'member';
}

/**
 * Remove organization member parameters
 */
export interface RemoveOrganizationMemberFormData {
  organizationId: string;
  memberId: string;
}

// ============================================================================
// League Wizard Types
// ============================================================================

/**
 * Team data for wizard
 */
export interface WizardTeam {
  name: string;
  short_name?: string;
  color?: string;
}

/**
 * Complete wizard form data
 */
export interface WizardFormData {
  // Step 1: League Information
  name: string;
  description?: string;
  city: string;
  state_province: string;
  country: string;
  timezone: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;

  // Step 2: Season Settings
  season_name: string;
  season_start_date: string;
  season_end_date: string;
  registration_type: RegistrationType;
  registration_opens?: string;
  registration_closes?: string;
  game_duration_minutes: number;
  period_count: number;

  // Step 3: Teams
  teams?: WizardTeam[];
}

/**
 * Save draft response
 */
export interface SaveDraftResponse {
  draftId: string;
}

/**
 * Create league response
 */
export interface CreateLeagueResponse {
  leagueId: string;
  slug: string;
  seasonId: string;
}

// ============================================================================
// Roster Action Types
// ============================================================================

/**
 * Add player to roster parameters
 */
export interface AddPlayerToRosterParams {
  teamId: string;
  playerId: string;
  seasonId: string;
  jerseyNumber: number;
  position: PlayerPosition;
  leadershipRole?: LeadershipRole;
}

/**
 * Update jersey number parameters
 */
export interface UpdateJerseyNumberParams {
  rosterId: string;
  newJerseyNumber: number;
}

/**
 * Assign captain parameters
 */
export interface AssignCaptainParams {
  teamId: string;
  playerId: string;
  seasonId: string;
  role: LeadershipRole;
}

/**
 * Update player status parameters
 */
export interface UpdatePlayerStatusParams {
  rosterId: string;
  status: RosterStatus;
}

/**
 * Add staff member parameters
 */
export interface AddStaffMemberParams {
  teamId: string;
  personId: string;
  seasonId: string;
  role: StaffRole;
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * Organization subscription details
 */
export interface OrganizationSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  billingCycleAnchor: Date | null;
  trialEndsAt: Date | null;
  defaultPaymentMethodId: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  subscriptionCreatedAt: Date | null;
  subscriptionStartedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  cancelAtPeriodEnd: boolean;
  couponId: string | null;
  discountEndAt: Date | null;
  subscriptionMetadata: Record<string, unknown>;
}

/**
 * Subscription checkout result
 */
export interface SubscriptionCheckoutResult {
  subscriptionId: string;
  clientSecret?: string;
  requiresAction: boolean;
}

/**
 * Billing portal result
 */
export interface BillingPortalResult {
  url: string;
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  amount: number;
  status: string;
  paidAt: Date | null;
  dueDate: Date | null;
  invoicePdf: string | null;
  invoiceUrl: string | null;
  description: string | null;
  currency: string;
}

/**
 * Proration preview
 */
export interface ProrationPreview {
  amountDue: number;
  currentPeriodEnd: Date;
  nextInvoiceDate: Date;
  prorationDate: Date;
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Dashboard league data
 */
export interface DashboardLeague {
  id: string;
  name: string;
  slug: string;
  status: LeagueStatus;
  created_at: string;
  team_count: number;
  player_count: number;
}

/**
 * Dashboard organization data
 */
export interface DashboardOrganization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  created_at: string;
  league_count: number;
  leagues: DashboardLeague[];
}

/**
 * Dashboard totals
 */
export interface DashboardTotals {
  total_organizations: number;
  total_leagues: number;
  total_teams: number;
  total_players: number;
}

/**
 * Complete dashboard data
 */
export interface DashboardData {
  organizations: DashboardOrganization[];
  totals: DashboardTotals;
}

// ============================================================================
// REST API Request/Response Types
// ============================================================================

/**
 * GET /api/teams/:teamId/roster - Query parameters
 */
export interface GetTeamRosterQuery {
  seasonId: string;
}

/**
 * POST /api/teams/:teamId/roster - Request body
 */
export interface AddPlayerToRosterRequest {
  playerId: string;
  seasonId: string;
  jerseyNumber: number;
  position: PlayerPosition;
  leadershipRole?: LeadershipRole;
}

/**
 * PATCH /api/teams/:teamId/roster/:rosterId - Request body
 */
export type UpdateRosterRequest =
  | { jerseyNumber: number }
  | { status: RosterStatus }
  | {
      leadershipRole: LeadershipRole;
      playerId: string;
      seasonId: string;
    };

/**
 * GET /api/teams/:teamId/staff - Query parameters
 */
export interface GetTeamStaffQuery {
  seasonId: string;
}

/**
 * POST /api/teams/:teamId/staff - Request body
 */
export interface AddStaffMemberRequest {
  personId: string;
  seasonId: string;
  role: StaffRole;
}

/**
 * Stripe webhook event
 */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
  created: number;
}

// ============================================================================
// API Error Types
// ============================================================================

/**
 * REST API error response
 */
export interface ApiErrorResponse {
  error: string;
}

/**
 * Server Action error
 */
export interface ServerActionError {
  success: false;
  error: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract data type from ActionResult
 */
export type ExtractData<T> = T extends ActionResult<infer U> ? U : never;

/**
 * Make all properties optional except specified keys
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make all properties required except specified keys
 */
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if ActionResult is successful
 */
export function isSuccess<T>(result: ActionResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Check if ActionResult is an error
 */
export function isError<T>(result: ActionResult<T>): result is { success: false; error: string } {
  return result.success === false;
}

/**
 * Check if subscription is trialing
 */
export function isTrialing(subscription: OrganizationSubscription): boolean {
  return subscription.status === 'trialing';
}

/**
 * Check if subscription is active
 */
export function isActive(subscription: OrganizationSubscription): boolean {
  return subscription.status === 'active' || subscription.status === 'trialing';
}

/**
 * Check if subscription is past due
 */
export function isPastDue(subscription: OrganizationSubscription): boolean {
  return subscription.status === 'past_due';
}

/**
 * Check if subscription is canceled
 */
export function isCanceled(subscription: OrganizationSubscription): boolean {
  return subscription.status === 'canceled' || subscription.cancelAtPeriodEnd;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid subscription tiers
 */
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  'starter',
  'professional',
  'enterprise',
];

/**
 * Valid player positions
 */
export const PLAYER_POSITIONS: PlayerPosition[] = ['forward', 'defense', 'goalie'];

/**
 * Valid roster statuses
 */
export const ROSTER_STATUSES: RosterStatus[] = [
  'active',
  'inactive',
  'injured',
  'suspended',
  'traded',
];

/**
 * Valid staff roles
 */
export const STAFF_ROLES: StaffRole[] = [
  'head_coach',
  'assistant_coach',
  'goalie_coach',
  'manager',
  'trainer',
  'equipment_manager',
];

/**
 * Valid registration types
 */
export const REGISTRATION_TYPES: RegistrationType[] = [
  'open',
  'approval_required',
  'invite_only',
];
