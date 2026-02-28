'use server';

import { createAuthClient as createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';

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

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = void> = Promise<
  | { success: true; data?: T }
  | { success: false; error: string }
>;

export interface RegistrationDraftData {
  current_step: number;
  registration_type: 'team_registration' | 'free_agent' | 'individual';
  team_id?: string | null;
  full_name?: string;
  email?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_notes?: string;
  // League preferences (step 2)
  paid_team_rep?: boolean | null;
  played_last_season?: boolean | null;
  team_last_season?: string;
  prior_organization?: string;
  level?: string;
  location_preference?: string;
  preferred_night?: string;
  alternate_night?: string;
  referral_source?: string;
  comments?: string;
  // Skill & position
  primary_position?: string;
  secondary_position?: string;
  preferred_jersey_number?: number | null;
  skill_level?: string;
  years_experience?: number | null;
  previous_leagues?: string;
  goalie_role?: 'looking_for_team' | 'sub_only' | null;
  photo_url?: string;
  // Waiver
  waiver_accepted?: boolean;
  signature_data?: string;
  signature_type?: 'drawn' | 'typed' | 'checkbox';
  signed_name?: string;
  waiver_content_hash?: string;
  // Payment & consent
  payment_status?: string;
  payment_intent_id?: string;
  amount_cents?: number;
  tos_accepted?: boolean;
  email_marketing_opt_in?: boolean;
  consent_marketing?: boolean;
}

export interface LeagueFormConfig {
  levels?: string[];
  locations?: string[];
  nights?: string[];
  enabled_fields?: {
    played_last_season?: boolean;
    level?: boolean;
    location_preference?: boolean;
    preferred_night?: boolean;
    referral_source?: boolean;
    paid_team_rep?: boolean;
  };
}

interface LeagueWaiver {
  id: string;
  content: string;
  version: string;
  content_hash: string;
  title: string;
}

// ============================================================================
// Helper: Get Current User
// ============================================================================

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ============================================================================
// League & Season Data
// ============================================================================

export async function getLeagueRegistrationData(leagueSlug: string) {
  const supabase = await createClient();

  const { data: league, error } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      slug,
      stripe_account_id,
      stripe_account_status,
      registration_form_config,
      seasons (
        id,
        name,
        start_date,
        end_date,
        registration_opens_at,
        registration_closes_at,
        registration_type,
        status
      ),
      teams (
        id,
        name
      )
    `)
    .eq('slug', leagueSlug)
    .single();

  if (error || !league) return null;
  return league;
}

export async function getSeasonRegistrationFee(
  leagueId: string,
  seasonId: string
): Promise<number> {
  const supabase = await createClient();

  const { data: fee } = await supabase
    .from('season_fees')
    .select('amount_cents')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return fee?.amount_cents ?? 0;
}

// ============================================================================
// Draft Management
// ============================================================================

export async function saveRegistrationDraft(
  leagueId: string,
  seasonId: string,
  data: Partial<RegistrationDraftData>
): ActionResult<{ draftId: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in to save your progress.' };
    }

    const supabase = await createClient();

    const { data: registration, error } = await (supabase.from as any)(
      'registration_submissions'
    )
      .upsert(
        {
          player_id: user.id,
          league_id: leagueId,
          season_id: seasonId,
          registration_type: data.registration_type || 'free_agent',
          team_id: data.team_id || null,
          draft_data: data,
          draft_step: data.current_step || 1,
          status: 'pending',
        },
        { onConflict: 'player_id,league_id,season_id' }
      )
      .select('id')
      .single() as { data: { id: string } | null; error: any };

    if (error || !registration) {
      console.error('Save draft error:', error);
      return { success: false, error: 'Failed to save progress.' };
    }

    return { success: true, data: { draftId: registration!.id } };
  } catch (error) {
    console.error('Save draft error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function getRegistrationDraft(
  leagueId: string,
  seasonId: string
): ActionResult<RegistrationDraftData | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    const supabase = await createClient();

    const { data: registration, error } = await (supabase.from as any)(
      'registration_submissions'
    )
      .select('draft_data, draft_step, status, submitted_at')
      .eq('player_id', user.id)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .single() as {
      data: {
        draft_data: any;
        draft_step: number;
        status: string;
        submitted_at: string | null;
      } | null;
      error: any;
    };

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      return { success: false, error: 'Failed to load progress.' };
    }

    if (!registration || registration.status !== 'pending' || registration.submitted_at) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        ...registration.draft_data,
        current_step: registration.draft_step,
      } as RegistrationDraftData,
    };
  } catch (error) {
    console.error('Get draft error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// Registration Status
// ============================================================================

export async function getMyRegistrationStatus(
  leagueId: string,
  seasonId: string
): ActionResult<{ status: string; registrationId: string } | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: true, data: null };
    }

    const supabase = await createClient();

    const { data: registration, error } = await supabase
      .from('registration_submissions')
      .select('id, status')
      .eq('player_id', user.id)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      return { success: false, error: 'Failed to check registration status.' };
    }

    return {
      success: true,
      data: {
        status: registration.status,
        registrationId: registration.id,
      },
    };
  } catch (error) {
    console.error('Get registration status error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// Waiver
// ============================================================================

export async function getLeagueWaiver(
  leagueId: string
): ActionResult<LeagueWaiver | null> {
  try {
    const supabase = await createClient();

    const { data: waiver, error } = await supabase
      .from('league_waiver_templates')
      .select('id, content, version, content_hash, title')
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      return { success: false, error: 'Failed to load waiver.' };
    }

    return { success: true, data: waiver };
  } catch (error) {
    console.error('Get waiver error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// Submit Registration
// ============================================================================

export async function submitPlayerRegistration(
  data: RegistrationDraftData & {
    league_id: string;
    season_id: string;
  }
): ActionResult<{ registrationId: string; status: string; requiresPayment: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in to register.' };
    }

    const serviceSupabase = createServiceRoleClient();
    if (!data.tos_accepted) {
      return {
        success: false,
        error: 'You must accept the Terms of Service and Privacy Policy to register.',
      };
    }

    // Server-side payment enforcement
    const { data: seasonFee } = await serviceSupabase
      .from('season_fees')
      .select('amount_cents')
      .eq('league_id', data.league_id)
      .eq('season_id', data.season_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const expectedFeeCents = seasonFee?.amount_cents ?? 0;

    if (expectedFeeCents > 0) {
      if (!data.payment_intent_id) {
        return {
          success: false,
          error: 'Missing payment confirmation. Please complete the payment step.',
        };
      }

      // Verify payment with Stripe - never trust client-supplied payment_status
      try {
        const stripe = getStripeClient();
        const paymentIntent = await stripe.paymentIntents.retrieve(data.payment_intent_id);

        if (paymentIntent.status !== 'succeeded') {
          return {
            success: false,
            error: `Payment has not been completed (status: ${paymentIntent.status}). Please complete payment before submitting.`,
          };
        }

        // Verify the amount paid matches the expected fee — prevents reusing a
        // succeeded payment intent from a cheaper registration to bypass fees.
        if (paymentIntent.amount_received !== expectedFeeCents) {
          console.error('[Registration] Payment amount mismatch', {
            expected: expectedFeeCents,
            received: paymentIntent.amount_received,
            payment_intent_id: data.payment_intent_id,
          });
          return {
            success: false,
            error: 'Payment amount does not match the registration fee. Please contact support.',
          };
        }
      } catch (stripeError) {
        console.error('Stripe PaymentIntent verification failed:', stripeError);
        return {
          success: false,
          error: 'Unable to verify payment. Please try again or contact support.',
        };
      }

      data.payment_status = 'completed';
      data.amount_cents = expectedFeeCents;
    } else {
      data.payment_status = 'not_required';
      data.amount_cents = 0;
      data.payment_intent_id = undefined;
    }

    // Require waiver acceptance
    if (!data.waiver_accepted) {
      return {
        success: false,
        error: 'You must read and accept the waiver to complete registration.',
      };
    }

    // Save waiver record
    let waiverId = null;
    {
      const { data: existingWaiver } = await serviceSupabase
        .from('player_waivers')
        .select('id')
        .eq('player_id', user.id)
        .eq('league_id', data.league_id)
        .eq('season_id', data.season_id)
        .single();

      if (existingWaiver) {
        // Update waiver_accepted flag on existing record
        await serviceSupabase
          .from('player_waivers')
          .update({
            waiver_accepted: true,
            waiver_accepted_at: new Date().toISOString(),
            signature_type: data.signature_type || 'checkbox',
            signed_name: data.signed_name || data.full_name || '',
          })
          .eq('id', existingWaiver.id);
        waiverId = existingWaiver.id;
      } else {
        const { data: template } = await serviceSupabase
          .from('league_waiver_templates')
          .select('version, content_hash')
          .eq('league_id', data.league_id)
          .eq('is_active', true)
          .single();

        const { data: newWaiver, error: waiverError } = await serviceSupabase
          .from('player_waivers')
          .insert({
            player_id: user.id,
            league_id: data.league_id,
            season_id: data.season_id,
            signature_data: data.signature_data || '',
            signature_type: data.signature_type || 'checkbox',
            signed_name: data.signed_name || data.full_name || '',
            waiver_version: template?.version || 'v1',
            waiver_content_hash: template?.content_hash || data.waiver_content_hash || '',
            waiver_accepted: true,
            waiver_accepted_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (waiverError) {
          console.error('Waiver save error:', waiverError);
          return { success: false, error: 'Failed to save waiver.' };
        }
        waiverId = newWaiver.id;
      }
    }

    // Update profile
    await serviceSupabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_relationship: data.emergency_contact_relationship,
        medical_notes: data.medical_notes || null,
        photo_url: data.photo_url || null,
      })
      .eq('id', user.id);

    // Upsert registration
    const { data: registration, error: regError } = await serviceSupabase
      .from('registration_submissions')
      .upsert(
        {
          player_id: user.id,
          league_id: data.league_id,
          season_id: data.season_id,
          team_id: data.team_id || null,
          waiver_id: waiverId,
          registration_type: data.registration_type,
          status: 'pending',
          preferred_position: data.primary_position,
          secondary_position: data.secondary_position || null,
          preferred_jersey_number: data.preferred_jersey_number || null,
          self_assessed_skill: data.skill_level,
          years_experience: data.years_experience || null,
          previous_leagues: data.previous_leagues || null,
          photo_url: data.photo_url || null,
          payment_status: data.payment_status || 'not_required',
          stripe_payment_intent_id: data.payment_intent_id || null,
          amount_paid_cents: data.amount_cents || 0,
          submitted_at: new Date().toISOString(),
          draft_data: null,
          draft_step: null,
        },
        { onConflict: 'player_id,league_id,season_id' }
      )
      .select('id, status, payment_status')
      .single();

    if (regError) {
      console.error('Registration error:', regError);
      return { success: false, error: 'Failed to submit registration.' };
    }

    // Store consents
    const emailMarketingOptIn = data.email_marketing_opt_in ?? data.consent_marketing ?? false;
    const consents = [
      { user_id: user.id, consent_type: 'registration_terms_v1', granted: true },
      { user_id: user.id, consent_type: 'registration_privacy_v1', granted: true },
      { user_id: user.id, consent_type: 'registration_data_processing_v1', granted: true },
      { user_id: user.id, consent_type: 'terms_of_service_v1', granted: data.tos_accepted },
      { user_id: user.id, consent_type: 'email_marketing_v1', granted: emailMarketingOptIn },
    ];
    await serviceSupabase.from('user_consents').insert(consents);

    revalidatePath('/');

    return {
      success: true,
      data: {
        registrationId: registration.id,
        status: registration.status,
        requiresPayment: registration.payment_status === 'pending',
      },
    };
  } catch (error) {
    console.error('Submit registration error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// Team Registration
// ============================================================================

export interface TeamRegistrationData {
  league_id: string;
  season_id: string;
  team_name: string;
  level?: string;
  played_last_season?: boolean;
  team_last_season?: string;
  backup_rep_name?: string;
  backup_rep_email?: string;
  location_preference?: string;
  preferred_day?: string;
  alternate_day?: string;
  comments?: string;
  waiver_accepted: boolean;
  waiver_version?: string;
}

export async function submitTeamRegistration(
  data: TeamRegistrationData
): ActionResult<{ registrationId: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in to register your team.' };
    }

    if (!data.waiver_accepted) {
      return {
        success: false,
        error: 'You must read and accept the waiver to submit team registration.',
      };
    }

    if (!data.team_name.trim()) {
      return { success: false, error: 'Team name is required.' };
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: registration, error } = await serviceSupabase
      .from('team_registrations')
      .insert({
        league_id: data.league_id,
        season_id: data.season_id,
        submitted_by: user.id,
        team_name: data.team_name.trim(),
        level: data.level || null,
        played_last_season: data.played_last_season ?? null,
        team_last_season: data.team_last_season || null,
        backup_rep_name: data.backup_rep_name || null,
        backup_rep_email: data.backup_rep_email || null,
        location_preference: data.location_preference || null,
        preferred_day: data.preferred_day || null,
        alternate_day: data.alternate_day || null,
        comments: data.comments || null,
        waiver_accepted: true,
        waiver_accepted_at: new Date().toISOString(),
        waiver_version: data.waiver_version || 'v1',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Team registration error:', error);
      return { success: false, error: 'Failed to submit team registration.' };
    }

    revalidatePath('/');

    return { success: true, data: { registrationId: registration.id } };
  } catch (error) {
    console.error('Team registration error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
