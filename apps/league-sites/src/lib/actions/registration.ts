'use server';

import { createAuthClient as createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
  primary_position?: string;
  secondary_position?: string;
  preferred_jersey_number?: number | null;
  skill_level?: string;
  years_experience?: number | null;
  previous_leagues?: string;
  photo_url?: string;
  signature_data?: string;
  signature_type?: 'drawn' | 'typed';
  signed_name?: string;
  waiver_content_hash?: string;
  payment_status?: string;
  payment_intent_id?: string;
  amount_cents?: number;
  consent_marketing?: boolean;
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
      data.amount_cents = expectedFeeCents;
    } else {
      data.payment_status = 'not_required';
      data.amount_cents = 0;
      data.payment_intent_id = undefined;
    }

    // Save waiver if provided
    let waiverId = null;
    if (data.signature_data && data.signed_name) {
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
            signature_data: data.signature_data,
            signature_type: data.signature_type || 'drawn',
            signed_name: data.signed_name,
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
    const consents = [
      { user_id: user.id, consent_type: 'registration_terms_v1', granted: true },
      { user_id: user.id, consent_type: 'registration_privacy_v1', granted: true },
      { user_id: user.id, consent_type: 'registration_data_processing_v1', granted: true },
    ];
    if (data.consent_marketing) {
      consents.push({ user_id: user.id, consent_type: 'registration_marketing', granted: true });
    }
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
