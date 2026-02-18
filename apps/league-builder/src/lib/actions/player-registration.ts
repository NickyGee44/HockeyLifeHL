/**
 * Player Registration Server Actions
 *
 * Server actions for the player registration flow:
 * - Draft management (save, get, delete)
 * - Photo upload/delete
 * - Waiver signing
 * - Payment processing
 * - Registration submission
 * - Admin approval workflow
 *
 * Security:
 * - All actions verify user authentication
 * - Players can only manage their own registrations
 * - Admins can manage registrations for their leagues
 * - Uses RLS policies for additional protection
 */

'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  RegistrationFormData,
  RegistrationDraftData,
} from '@/lib/schemas/player-registration';
import type { Database } from '@hockey-life/database';
import {
  sendRegistrationSubmittedEmail,
  sendRegistrationApprovedEmail,
  sendRegistrationRejectedEmail,
  notifyLeagueAdminsOfNewRegistration,
} from '@/lib/email/registration-emails';
import { createPaymentIntent } from '@/lib/leagues/stripe-connect';

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = void> = Promise<
  | { success: true; data?: T }
  | { success: false; error: string }
>;

interface RegistrationSubmissionResult {
  registrationId: string;
  status: string;
  requiresPayment: boolean;
}

interface LeagueWaiver {
  id: string;
  content: string;
  version: string;
  content_hash: string;
  title: string;
}

interface PendingRegistration {
  id: string;
  player_id: string;
  league_id: string;
  season_id: string;
  team_id: string | null;
  registration_type: string;
  status: string;
  preferred_position: string | null;
  secondary_position: string | null;
  preferred_jersey_number: number | null;
  self_assessed_skill: string | null;
  years_experience: number | null;
  previous_leagues: string | null;
  photo_url: string | null;
  payment_status: string;
  amount_paid_cents: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  submitted_at: string | null;
  player: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  team: {
    id: string;
    name: string;
  } | null;
  waiver: {
    id: string;
    signed_name: string;
    agreed_at: string;
  } | null;
}

// ============================================================================
// Helper: Get Current User
// ============================================================================

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// ============================================================================
// Helper: Verify League Admin Access
// ============================================================================

async function verifyLeagueAdminAccess(leagueId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Authentication required. Please sign in.' };
  }

  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  if (membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active') {
    return { userId: user.id };
  }

  // Fallback: platform admins get owner-level access to all leagues
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.is_platform_admin === true) {
    return { userId: user.id };
  }

  if (membershipError || !membership) {
    return { error: 'You do not have access to this league.' };
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return { error: 'Only league owners and admins can manage registrations.' };
  }

  return { error: 'Your league membership is not active.' };
}

// ============================================================================
// 1. Draft Management
// ============================================================================

/**
 * Save registration draft for later completion
 */
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

    // Upsert the draft (update if exists, insert if not)
    // Note: registration_submissions table is defined in migrations but not in generated types yet
    const { data: registration, error } = await (supabase
      .from as any)('registration_submissions')
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
        {
          onConflict: 'player_id,league_id,season_id',
        }
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

/**
 * Get existing registration draft
 */
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

    // Note: registration_submissions table is defined in migrations but not in generated types yet
    const { data: registration, error } = await (supabase
      .from as any)('registration_submissions')
      .select('draft_data, draft_step, status, submitted_at')
      .eq('player_id', user.id)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .single() as { data: { draft_data: any; draft_step: number; status: string; submitted_at: string | null } | null; error: any };

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - no draft exists
        return { success: true, data: null };
      }
      console.error('Get draft error:', error);
      return { success: false, error: 'Failed to load progress.' };
    }

    // If registration is already submitted, don't return draft
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

/**
 * Delete registration draft
 */
export async function deleteRegistrationDraft(
  leagueId: string,
  seasonId: string
): ActionResult {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('registration_submissions')
      .delete()
      .eq('player_id', user.id)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'pending')
      .is('submitted_at', null);

    if (error) {
      console.error('Delete draft error:', error);
      return { success: false, error: 'Failed to delete draft.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete draft error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 2. Photo Upload
// ============================================================================

/**
 * Upload player profile photo
 */
export async function uploadPlayerPhoto(
  file: File
): ActionResult<{ url: string; path: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 5MB.' };
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Please upload a valid image (PNG, JPG, or WebP).',
      };
    }

    const supabase = await createClient();

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${user.id}/${Date.now()}.${ext}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(filename, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload photo.' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('player-photos')
      .getPublicUrl(uploadData.path);

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        path: uploadData.path,
      },
    };
  } catch (error) {
    console.error('Upload photo error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Delete player profile photo
 */
export async function deletePlayerPhoto(path: string): ActionResult {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    // Verify the path belongs to the user
    if (!path.startsWith(`${user.id}/`)) {
      return { success: false, error: 'You can only delete your own photos.' };
    }

    const supabase = await createClient();

    const { error } = await supabase.storage
      .from('player-photos')
      .remove([path]);

    if (error) {
      console.error('Delete photo error:', error);
      return { success: false, error: 'Failed to delete photo.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete photo error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 3. Waiver Management
// ============================================================================

/**
 * Get active waiver template for a league
 */
export async function getLeagueWaiver(
  leagueId: string
): ActionResult<LeagueWaiver | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    const supabase = await createClient();

    const { data: waiver, error } = await supabase
      .from('league_waiver_templates')
      .select('id, content, version, content_hash, title')
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No waiver template exists - use default
        return { success: true, data: null };
      }
      console.error('Get waiver error:', error);
      return { success: false, error: 'Failed to load waiver.' };
    }

    return { success: true, data: waiver };
  } catch (error) {
    console.error('Get waiver error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Submit signed waiver
 */
export async function submitSignedWaiver(
  leagueId: string,
  seasonId: string,
  signatureData: string,
  signatureType: 'drawn' | 'typed' | 'checkbox',
  signedName: string,
  waiverContentHash: string
): ActionResult<{ waiverId: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    const supabase = await createClient();

    // Get waiver version
    const { data: template } = await supabase
      .from('league_waiver_templates')
      .select('version')
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .single();

    const { data: waiver, error } = await supabase
      .from('player_waivers')
      .insert({
        player_id: user.id,
        league_id: leagueId,
        season_id: seasonId,
        signature_data: signatureData,
        signature_type: signatureType as any, // 'checkbox' added via migration, types not yet regenerated
        signed_name: signedName,
        waiver_version: template?.version || 'v1',
        waiver_content_hash: waiverContentHash,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Submit waiver error:', error);
      return { success: false, error: 'Failed to save waiver signature.' };
    }

    return { success: true, data: { waiverId: waiver.id } };
  } catch (error) {
    console.error('Submit waiver error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 4. Payment
// ============================================================================

/**
 * Create payment intent for registration fee
 */
export async function createRegistrationPaymentIntent(
  leagueId: string,
  seasonId: string,
  amountCents: number
): ActionResult<{ paymentIntentId: string; clientSecret: string; amount: number }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    const supabase = await createClient();

    // 1. Get league's Stripe Connect account
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, stripe_account_id, stripe_account_status')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return { success: false, error: 'League not found.' };
    }

    if (!league.stripe_account_id) {
      return {
        success: false,
        error: 'This league has not set up payment processing yet. Please contact the league administrator.',
      };
    }

    if (league.stripe_account_status !== 'complete') {
      return {
        success: false,
        error: 'The league payment account is not fully set up. Please contact the league administrator.',
      };
    }

    // 2. Get user email for receipt
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // 3. Get season name for description
    const { data: season } = await supabase
      .from('seasons')
      .select('name')
      .eq('id', seasonId)
      .single();

    // 4. Create PaymentIntent with Stripe Connect
    const paymentResult = await createPaymentIntent({
      leagueId,
      connectedAccountId: league.stripe_account_id,
      amountCents,
      currency: 'usd',
      description: `Registration fee for ${season?.name || 'season'} - ${league.name}`,
      customerEmail: profile?.email || user.email,
      metadata: {
        type: 'registration',
        league_id: leagueId,
        season_id: seasonId,
        player_id: user.id,
        player_name: profile?.full_name || 'Unknown',
      },
    });

    return {
      success: true,
      data: {
        paymentIntentId: paymentResult.paymentIntentId,
        clientSecret: paymentResult.clientSecret,
        amount: paymentResult.amount,
      },
    };
  } catch (error) {
    console.error('Create payment intent error:', error);
    return { success: false, error: 'Failed to initialize payment. Please try again.' };
  }
}

/**
 * Confirm registration payment after Stripe Elements completion
 * This is called after the payment is successfully processed on the client
 */
export async function confirmRegistrationPayment(
  registrationId: string,
  paymentIntentId: string,
  amountPaidCents?: number
): ActionResult {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    const supabase = await createClient();

    // Get the registration to verify ownership and get league_id
    const { data: registration, error: regError } = await supabase
      .from('registration_submissions')
      .select('id, player_id, league_id')
      .eq('id', registrationId)
      .eq('player_id', user.id)
      .single();

    if (regError || !registration) {
      return { success: false, error: 'Registration not found.' };
    }

    // Update registration with payment status
    const { error } = await supabase
      .from('registration_submissions')
      .update({
        payment_status: 'completed',
        stripe_payment_intent_id: paymentIntentId,
        amount_paid_cents: amountPaidCents || 0,
      })
      .eq('id', registrationId)
      .eq('player_id', user.id);

    if (error) {
      console.error('Confirm payment error:', error);
      return { success: false, error: 'Failed to confirm payment.' };
    }

    // Log to stripe_connect_payments table for league's payment tracking
    const serviceClient = createServiceRoleClient();
    await serviceClient.from('stripe_connect_payments').insert({
      league_id: registration.league_id,
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: amountPaidCents || 0,
      application_fee_cents: 0,
      currency: 'usd',
      status: 'succeeded',
      description: `Registration payment`,
      customer_email: user.email,
      metadata: {
        type: 'registration',
        registration_id: registrationId,
        player_id: user.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Confirm payment error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// ============================================================================
// 5. Registration Submission
// ============================================================================

/**
 * Submit final registration
 */
export async function submitPlayerRegistration(
  data: RegistrationFormData
): ActionResult<RegistrationSubmissionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in to register.' };
    }

    const serviceSupabase = createServiceRoleClient();

    // Server-side payment enforcement: resolve expected fee from season_fees
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
      // Payment is required - reject if not completed
      if (data.payment_status !== 'completed') {
        return {
          success: false,
          error: 'Payment is required for this registration. Please complete payment before submitting.',
        };
      }
      if (!data.payment_intent_id) {
        return {
          success: false,
          error: 'Missing payment confirmation. Please complete the payment step.',
        };
      }
      // Enforce the correct fee amount from the database (don't trust client)
      data.amount_cents = expectedFeeCents;
    } else {
      // No fee expected - normalize as free registration
      data.payment_status = 'not_required';
      data.amount_cents = 0;
      data.payment_intent_id = undefined;
    }

    // 1. First, save the waiver if not already saved
    let waiverId = null;
    if (data.waiver_agreed) {
      const { data: existingWaiver } = await serviceSupabase
        .from('player_waivers')
        .select('id')
        .eq('player_id', user.id)
        .eq('league_id', data.league_id)
        .eq('season_id', data.season_id)
        .single();

      if (existingWaiver) {
        waiverId = existingWaiver.id;
      } else {
        // Get waiver template hash and player name for checkbox flow
        const { data: template } = await serviceSupabase
          .from('league_waiver_templates')
          .select('version, content_hash')
          .eq('league_id', data.league_id)
          .eq('is_active', true)
          .single();

        // For checkbox flow, use player's full name as signed_name
        const signedName = data.signed_name || data.full_name;
        const signatureData = data.signature_data || 'checkbox_agreed';
        const signatureType = data.signature_type || 'checkbox';

        const { data: newWaiver, error: waiverError } = await serviceSupabase
          .from('player_waivers')
          .insert({
            player_id: user.id,
            league_id: data.league_id,
            season_id: data.season_id,
            signature_data: signatureData,
            signature_type: signatureType as any,
            signed_name: signedName,
            waiver_version: template?.version || 'v1',
            waiver_content_hash: template?.content_hash || '',
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

    // 2. Update profile with emergency contact info
    const { error: profileError } = await serviceSupabase
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

    if (profileError) {
      console.error('Profile update error:', profileError);
      return { success: false, error: 'Failed to update profile.' };
    }

    // 3. Upsert registration submission
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
          draft_data: null, // Clear draft data on submission
          draft_step: null,
        },
        {
          onConflict: 'player_id,league_id,season_id',
        }
      )
      .select('id, status, payment_status')
      .single();

    if (regError) {
      console.error('Registration error:', regError);
      return { success: false, error: 'Failed to submit registration.' };
    }

    // 4. Store user consents
    const consents = [
      { user_id: user.id, consent_type: 'registration_terms_v1', granted: true },
      { user_id: user.id, consent_type: 'registration_privacy_v1', granted: true },
      {
        user_id: user.id,
        consent_type: 'registration_data_processing_v1',
        granted: true,
      },
    ];

    if (data.consent_marketing) {
      consents.push({
        user_id: user.id,
        consent_type: 'registration_marketing',
        granted: true,
      });
    }

    await serviceSupabase.from('user_consents').insert(consents);

    // 5. Send notification emails (async, don't block response)
    try {
      // Get league and season info for emails
      const { data: leagueData } = await serviceSupabase
        .from('leagues')
        .select('name')
        .eq('id', data.league_id)
        .single();

      const { data: seasonData } = await serviceSupabase
        .from('seasons')
        .select('name')
        .eq('id', data.season_id)
        .single();

      const { data: playerData } = await serviceSupabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      const { data: teamData } = data.team_id
        ? await serviceSupabase
            .from('teams')
            .select('name')
            .eq('id', data.team_id)
            .single()
        : { data: null };

      // Send confirmation to player
      if (playerData?.email) {
        sendRegistrationSubmittedEmail({
          to: playerData.email,
          playerName: data.full_name,
          leagueName: leagueData?.name || 'League',
          seasonName: seasonData?.name || 'Season',
          registrationType: data.registration_type as 'team_registration' | 'free_agent' | 'individual',
          teamName: teamData?.name,
          position: data.primary_position,
          skillLevel: data.skill_level,
          submittedAt: new Date(),
          registrationId: registration.id,
        }).catch(console.error);
      }

      // Notify league admins
      const { data: admins } = await serviceSupabase
        .from('league_memberships')
        .select('user_id, profiles!inner(email, full_name)')
        .eq('league_id', data.league_id)
        .in('role', ['owner', 'admin'])
        .eq('status', 'active');

      // Get pending count
      const { count: pendingCount } = await serviceSupabase
        .from('registration_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', data.league_id)
        .eq('status', 'pending')
        .not('submitted_at', 'is', null);

      if (admins && admins.length > 0) {
        const adminEmails = admins.map((a: any) => ({
          email: a.profiles.email,
          name: a.profiles.full_name || 'Admin',
        }));

        notifyLeagueAdminsOfNewRegistration({
          adminEmails,
          leagueName: leagueData?.name || 'League',
          seasonName: seasonData?.name || 'Season',
          playerName: data.full_name,
          playerEmail: playerData?.email || '',
          registrationType: data.registration_type as 'team_registration' | 'free_agent' | 'individual',
          teamName: teamData?.name,
          position: data.primary_position,
          skillLevel: data.skill_level,
          submittedAt: new Date(),
          pendingCount: pendingCount || 1,
          registrationId: registration.id,
          leagueId: data.league_id,
        }).catch(console.error);
      }
    } catch (emailError) {
      // Log but don't fail the registration
      console.error('Email notification error:', emailError);
    }

    revalidatePath('/dashboard');

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

/**
 * Cancel player's own registration
 */
export async function cancelRegistration(
  registrationId: string
): ActionResult {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('registration_submissions')
      .update({ status: 'cancelled' })
      .eq('id', registrationId)
      .eq('player_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Cancel registration error:', error);
      return { success: false, error: 'Failed to cancel registration.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Cancel registration error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get player's registration status for a season
 */
export async function getMyRegistrationStatus(
  leagueId: string,
  seasonId: string
): ActionResult<{ status: string; registrationId: string } | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
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
// 6. Admin Actions
// ============================================================================

/**
 * Get pending registrations for a league
 */
export async function getPendingRegistrations(
  leagueId: string,
  options: {
    status?: string;
    type?: string;
    seasonId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): ActionResult<{ registrations: PendingRegistration[]; total: number }> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error as string };
    }

    const supabase = await createClient();
    const { status, type, seasonId, search, limit = 20, offset = 0 } = options;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('registration_submissions')
      .select(
        `
        *,
        player:profiles!player_id (id, full_name, email, phone),
        team:teams!team_id (id, name),
        waiver:player_waivers!waiver_id (id, signed_name, agreed_at)
      `,
        { count: 'exact' }
      )
      .eq('league_id', leagueId)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status as Database['public']['Enums']['registration_status_enum']);
    }
    if (type) {
      query = query.eq('registration_type', type as Database['public']['Enums']['registration_type_enum']);
    }
    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }
    if (search) {
      query = query.or(`player.full_name.ilike.%${search}%,player.email.ilike.%${search}%`);
    }

    const { data: registrations, error, count } = await query;

    if (error) {
      console.error('Get registrations error:', error);
      return { success: false, error: 'Failed to fetch registrations.' };
    }

    return {
      success: true,
      data: {
        registrations: (registrations || []) as unknown as PendingRegistration[],
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('Get registrations error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get detailed registration info
 */
export async function getRegistrationDetails(
  registrationId: string
): ActionResult<PendingRegistration> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Please sign in.' };
    }

    const supabase = await createClient();

    const { data: registration, error } = await supabase
      .from('registration_submissions')
      .select(
        `
        *,
        player:profiles!player_id (id, full_name, email, phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, medical_notes),
        team:teams!team_id (id, name),
        waiver:player_waivers!waiver_id (id, signed_name, agreed_at, signature_data)
      `
      )
      .eq('id', registrationId)
      .single();

    if (error) {
      return { success: false, error: 'Registration not found.' };
    }

    // Verify access (player viewing own, or admin viewing league's)
    if (registration.player_id !== user.id) {
      const accessResult = await verifyLeagueAdminAccess(registration.league_id);
      if ('error' in accessResult) {
        return { success: false, error: accessResult.error || 'Access denied' };
      }
    }

    return {
      success: true,
      data: registration as unknown as PendingRegistration,
    };
  } catch (error) {
    console.error('Get registration details error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Approve a registration
 */
export async function approveRegistration(
  registrationId: string,
  options: {
    teamId?: string;
    jerseyNumber?: number;
    notes?: string;
  } = {}
): ActionResult {
  try {
    // Get registration to find league ID
    const supabase = await createClient();

    const { data: registration } = await supabase
      .from('registration_submissions')
      .select('league_id, player_id, season_id')
      .eq('id', registrationId)
      .single();

    if (!registration) {
      return { success: false, error: 'Registration not found.' };
    }

    const result = await verifyLeagueAdminAccess(registration.league_id);
    if ('error' in result) {
      return { success: false, error: result.error || 'Access denied' };
    }

    const { teamId, jerseyNumber, notes } = options;

    // Update registration status
    const { error } = await supabase
      .from('registration_submissions')
      .update({
        status: 'approved',
        reviewed_by: result.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
        assigned_team_id: teamId || null,
        assigned_jersey_number: jerseyNumber || null,
      })
      .eq('id', registrationId);

    if (error) {
      console.error('Approve registration error:', error);
      return { success: false, error: 'Failed to approve registration.' };
    }

    // If team assigned, add player to roster
    const serviceSupabase = createServiceRoleClient();
    if (teamId) {
      await serviceSupabase.from('team_rosters').insert({
        team_id: teamId,
        player_id: registration.player_id,
        league_id: registration.league_id,
        season_id: registration.season_id,
        jersey_number: jerseyNumber || null,
        status: 'active',
      });
    }

    // Send approval notification email
    try {
      // Get full registration details
      const { data: fullReg } = await serviceSupabase
        .from('registration_submissions')
        .select(`
          *,
          player:profiles!player_id (email, full_name),
          team:teams!team_id (name),
          league:leagues!league_id (name),
          season:seasons!season_id (name, start_date)
        `)
        .eq('id', registrationId)
        .single();

      if (fullReg?.player?.email) {
        const assignedTeam = teamId
          ? await serviceSupabase
              .from('teams')
              .select('name')
              .eq('id', teamId)
              .single()
          : null;

        sendRegistrationApprovedEmail({
          to: fullReg.player.email,
          playerName: fullReg.player.full_name || 'Player',
          leagueName: fullReg.league?.name || 'League',
          seasonName: fullReg.season?.name || 'Season',
          registrationType: fullReg.registration_type as 'team_registration' | 'free_agent' | 'individual',
          teamName: assignedTeam?.data?.name || fullReg.team?.name,
          jerseyNumber: jerseyNumber,
          position: fullReg.preferred_position ?? undefined,
          seasonStartDate: fullReg.season?.start_date
            ? new Date(fullReg.season.start_date)
            : undefined,
          adminNotes: notes,
        }).catch(console.error);
      }
    } catch (emailError) {
      console.error('Approval email error:', emailError);
    }

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Approve registration error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Reject a registration
 */
export async function rejectRegistration(
  registrationId: string,
  reason: string
): ActionResult {
  try {
    const supabase = await createClient();

    const { data: registration } = await supabase
      .from('registration_submissions')
      .select('league_id')
      .eq('id', registrationId)
      .single();

    if (!registration) {
      return { success: false, error: 'Registration not found.' };
    }

    const result = await verifyLeagueAdminAccess(registration.league_id);
    if ('error' in result) {
      return { success: false, error: result.error || 'Access denied' };
    }

    const { error } = await supabase
      .from('registration_submissions')
      .update({
        status: 'rejected',
        reviewed_by: result.userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', registrationId);

    if (error) {
      console.error('Reject registration error:', error);
      return { success: false, error: 'Failed to reject registration.' };
    }

    // Send rejection notification email
    try {
      const serviceSupabase = createServiceRoleClient();

      const { data: fullReg } = await serviceSupabase
        .from('registration_submissions')
        .select(`
          *,
          player:profiles!player_id (email, full_name),
          league:leagues!league_id (name),
          season:seasons!season_id (name)
        `)
        .eq('id', registrationId)
        .single();

      if (fullReg?.player?.email) {
        sendRegistrationRejectedEmail({
          to: fullReg.player.email,
          playerName: fullReg.player.full_name || 'Player',
          leagueName: fullReg.league?.name || 'League',
          seasonName: fullReg.season?.name || 'Season',
          registrationType: fullReg.registration_type as 'team_registration' | 'free_agent' | 'individual',
          rejectionReason: reason,
          canReapply: true,
        }).catch(console.error);
      }
    } catch (emailError) {
      console.error('Rejection email error:', emailError);
    }

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Reject registration error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Move a registration to the waitlist
 */
export async function waitlistRegistration(
  registrationId: string
): ActionResult {
  try {
    const supabase = await createClient();

    const { data: registration } = await supabase
      .from('registration_submissions')
      .select('league_id')
      .eq('id', registrationId)
      .single();

    if (!registration) {
      return { success: false, error: 'Registration not found.' };
    }

    const result = await verifyLeagueAdminAccess(registration.league_id);
    if ('error' in result) {
      return { success: false, error: result.error || 'Access denied' };
    }

    const { error } = await supabase
      .from('registration_submissions')
      .update({
        status: 'waitlisted',
        reviewed_by: result.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', registrationId);

    if (error) {
      console.error('Waitlist registration error:', error);
      return { success: false, error: 'Failed to waitlist registration.' };
    }

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Waitlist registration error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Bulk update registrations
 */
export async function bulkUpdateRegistrations(
  registrationIds: string[],
  action: 'approve' | 'reject' | 'waitlist',
  options: {
    reason?: string;
    teamId?: string;
  } = {}
): ActionResult<{ updated: number }> {
  try {
    if (registrationIds.length === 0) {
      return { success: false, error: 'No registrations selected.' };
    }

    const supabase = await createClient();

    // Get first registration to verify league access
    const { data: firstReg } = await supabase
      .from('registration_submissions')
      .select('league_id')
      .eq('id', registrationIds[0])
      .single();

    if (!firstReg) {
      return { success: false, error: 'Registration not found.' };
    }

    const result = await verifyLeagueAdminAccess(firstReg.league_id);
    if ('error' in result) {
      return { success: false, error: result.error || 'Access denied' };
    }

    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      waitlist: 'waitlisted',
    };

    const updateData: Record<string, any> = {
      status: statusMap[action],
      reviewed_by: result.userId,
      reviewed_at: new Date().toISOString(),
    };

    if (action === 'reject' && options.reason) {
      updateData.rejection_reason = options.reason;
    }

    if (action === 'approve' && options.teamId) {
      updateData.assigned_team_id = options.teamId;
    }

    const { data, error } = await supabase
      .from('registration_submissions')
      .update(updateData)
      .in('id', registrationIds)
      .eq('league_id', firstReg.league_id)
      .select('id');

    if (error) {
      console.error('Bulk update error:', error);
      return { success: false, error: 'Failed to update registrations.' };
    }

    revalidatePath('/dashboard');

    return { success: true, data: { updated: data?.length || 0 } };
  } catch (error) {
    console.error('Bulk update error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get registration summary for admin dashboard
 */
export async function getRegistrationSummary(
  leagueId: string
): ActionResult<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  waitlisted: number;
  byType: {
    team_registration: number;
    free_agent: number;
    individual: number;
  };
}> {
  try {
    const result = await verifyLeagueAdminAccess(leagueId);
    if ('error' in result) {
      return { success: false, error: result.error as string };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_registration_summary', {
      check_league_id: leagueId,
    });

    if (error) {
      console.error('Get summary error:', error);
      return { success: false, error: 'Failed to fetch summary.' };
    }

    const summary = data?.[0] || {
      total_submissions: 0,
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
      waitlisted_count: 0,
      team_registrations: 0,
      free_agents: 0,
      individual_registrations: 0,
    };

    return {
      success: true,
      data: {
        total: summary.total_submissions,
        pending: summary.pending_count,
        approved: summary.approved_count,
        rejected: summary.rejected_count,
        waitlisted: summary.waitlisted_count,
        byType: {
          team_registration: summary.team_registrations,
          free_agent: summary.free_agents,
          individual: summary.individual_registrations,
        },
      },
    };
  } catch (error) {
    console.error('Get summary error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
