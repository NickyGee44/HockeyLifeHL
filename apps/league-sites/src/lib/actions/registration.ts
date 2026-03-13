'use server';

import { createAuthClient as createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import {
  getRegistrationPaymentMode,
  getPlayerRegistrationFeeAmount,
  getSeasonPaymentSettings,
} from '@/lib/registration/fee-collection-model';
import {
  getRegistrationTypeForIntent,
  getRequestedTeamId,
  getResolvedTeamReturnStatus,
  type RegistrationIntent,
  type RegistrationJourneyData,
  type PreviousTeamOption,
  type TeamReturnStatus,
} from '@/lib/registration/intents';

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
  registration_intent?: RegistrationIntent;
  team_id?: string | null;
  requested_team_id?: string | null;
  requested_team_name?: string;
  previous_team_id?: string | null;
  previous_team_name?: string;
  previous_season_id?: string | null;
  previous_season_name?: string | null;
  team_return_status?: TeamReturnStatus;
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
  document_url: string | null;
  document_name: string | null;
  document_mime_type: string | null;
}

function normalizeWaiverSignature(input: {
  signatureType?: 'drawn' | 'typed' | 'checkbox';
  signatureData?: string;
  signedName?: string;
  fallbackName?: string;
}) {
  const signedName = (input.signedName || input.fallbackName || '').trim();

  if (input.signatureType === 'drawn') {
    return {
      signatureType: 'drawn' as const,
      signatureData: input.signatureData || signedName || 'signed',
      signedName,
    };
  }

  // Checkbox acceptance is stored as a typed acknowledgement so older/live
  // environments that do not yet have the checkbox enum value still accept it.
  return {
    signatureType: 'typed' as const,
    signatureData: signedName || input.signatureData || 'Waiver accepted',
    signedName,
  };
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

function getNormalizedIntent(
  data: Partial<RegistrationDraftData>
): RegistrationIntent {
  if (data.registration_intent) {
    return data.registration_intent;
  }

  if (data.previous_team_id) {
    return 'return_to_previous_team';
  }

  return data.registration_type === 'team_registration' ? 'join_team' : 'free_agent';
}

function buildRegistrationContext(
  data: Partial<RegistrationDraftData>,
  teamReturnStatuses: Record<string, TeamReturnStatus>
) {
  const intent = getNormalizedIntent(data);
  const requestedTeamId = getRequestedTeamId({
    registration_intent: intent,
    requested_team_id: data.requested_team_id || data.team_id || null,
    previous_team_id: data.previous_team_id || null,
  });
  const teamReturnStatus = getResolvedTeamReturnStatus({
    intent,
    requestedTeamId,
    teamReturnStatuses,
  });
  const storedTeamId = teamReturnStatus === 'confirmed' ? requestedTeamId : null;

  return {
    intent,
    requestedTeamId,
    teamReturnStatus,
    registrationType: getRegistrationTypeForIntent(intent),
    storedTeamId,
    context: {
      registration_intent: intent,
      requested_team_id:
        intent === 'join_team' ? requestedTeamId : data.requested_team_id || null,
      requested_team_name: data.requested_team_name || null,
      previous_team_id:
        intent === 'return_to_previous_team' ? requestedTeamId : data.previous_team_id || null,
      previous_team_name: data.previous_team_name || null,
      previous_season_id: data.previous_season_id || null,
      previous_season_name: data.previous_season_name || null,
      team_return_status: teamReturnStatus,
    } satisfies Record<string, unknown>,
  };
}

async function getSeasonTeamReturnStatuses(
  leagueId: string,
  seasonId: string
): Promise<Record<string, TeamReturnStatus>> {
  const serviceSupabase = createServiceRoleClient();
  const [preferenceResult, rosterResult, gamesResult, returnRowsResult] = await Promise.all([
    serviceSupabase
      .from('team_schedule_preferences')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    serviceSupabase
      .from('team_rosters')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'active'),
    serviceSupabase
      .from('games')
      .select('home_team_id, away_team_id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    ((serviceSupabase.from as any)('season_team_returns'))
      .select('team_id, status')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
  ]);

  const statusMap: Record<string, TeamReturnStatus> = {};

  for (const row of (returnRowsResult.data ?? []) as Array<{ team_id: string | null; status: string | null }>) {
    if (!row.team_id) continue;
    statusMap[row.team_id] =
      row.status === 'confirmed'
        ? 'confirmed'
        : row.status === 'declined'
          ? 'team_not_returning'
          : 'pending_team_return';
  }

  const confirmedTeamIds = [
    ...(preferenceResult.data ?? []).map((row: { team_id: string | null }) => row.team_id),
    ...(rosterResult.data ?? []).map((row: { team_id: string | null }) => row.team_id),
    ...(gamesResult.data ?? []).flatMap(
      (row: { home_team_id: string | null; away_team_id: string | null }) => [
        row.home_team_id,
        row.away_team_id,
      ]
    ),
  ].filter((teamId, index, array): teamId is string => Boolean(teamId) && array.indexOf(teamId) === index);

  for (const teamId of confirmedTeamIds) {
    statusMap[teamId] = 'confirmed';
  }

  return statusMap;
}

export async function getRegistrationJourneyData(
  leagueId: string,
  seasonId: string
): ActionResult<RegistrationJourneyData> {
  try {
    const user = await getCurrentUser();
    const teamReturnStatuses = await getSeasonTeamReturnStatuses(leagueId, seasonId);
    const confirmedTeamIds = Object.entries(teamReturnStatuses)
      .filter(([, status]) => status === 'confirmed')
      .map(([teamId]) => teamId);

    if (!user) {
      return {
        success: true,
        data: {
          previousTeams: [],
          confirmedTeamIds,
          teamReturnStatuses,
        },
      };
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: rosterRows, error } = await serviceSupabase
      .from('team_rosters')
      .select(`
        team_id,
        season_id,
        leadership_role,
        teams!inner (
          id,
          name,
          status
        ),
        seasons!inner (
          id,
          name,
          start_date
        )
      `)
      .eq('league_id', leagueId)
      .eq('player_id', user.id)
      .eq('status', 'active')
      .neq('season_id', seasonId);

    if (error) {
      console.error('Get registration journey data error:', error);
      return { success: false, error: 'Failed to load returning player options.' };
    }

    const latestByTeam = new Map<string, PreviousTeamOption & { seasonStart: string | null }>();

    for (const row of rosterRows ?? []) {
      const team = Array.isArray((row as any).teams) ? (row as any).teams[0] : (row as any).teams;
      const season = Array.isArray((row as any).seasons) ? (row as any).seasons[0] : (row as any).seasons;

      if (!team?.id || team.status === 'inactive' || !season?.id) {
        continue;
      }

      const existing = latestByTeam.get(team.id);
      const seasonStart = season.start_date || null;

      if (!existing || (seasonStart && (!existing.seasonStart || seasonStart > existing.seasonStart))) {
        latestByTeam.set(team.id, {
          teamId: team.id,
          teamName: team.name,
          seasonId: season.id,
          seasonName: season.name,
          wasCaptain:
            row.leadership_role === 'captain' ||
            row.leadership_role === 'alternate_captain',
          isConfirmedForSeason: confirmedTeamIds.includes(team.id),
          returnStatus: teamReturnStatuses[team.id] || 'pending_team_return',
          seasonStart,
        });
      }
    }

    const previousTeams = Array.from(latestByTeam.values())
      .sort((a, b) => {
        if (a.isConfirmedForSeason !== b.isConfirmedForSeason) {
          return a.isConfirmedForSeason ? -1 : 1;
        }
        if (a.seasonStart && b.seasonStart) {
          return b.seasonStart.localeCompare(a.seasonStart);
        }
        return a.teamName.localeCompare(b.teamName);
      })
      .map(({ seasonStart: _seasonStart, ...team }) => team);

    return {
      success: true,
      data: {
        previousTeams,
        confirmedTeamIds,
        teamReturnStatuses,
      },
    };
  } catch (error) {
    console.error('Get registration journey data error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
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
  const supabase = createServiceRoleClient();
  const settings = await getSeasonPaymentSettings(supabase as any, leagueId, seasonId);
  return getPlayerRegistrationFeeAmount(settings.feeBasis, settings.feeAmountCents);
}

export async function getSeasonRegistrationPaymentConfig(
  leagueId: string,
  seasonId: string
) {
  const supabase = createServiceRoleClient();
  const settings = await getSeasonPaymentSettings(supabase as any, leagueId, seasonId);

  return {
    registrationFee: getPlayerRegistrationFeeAmount(settings.feeBasis, settings.feeAmountCents),
    feeCollectionModel: settings.feeCollectionModel,
    paymentMode: getRegistrationPaymentMode(
      settings.feeCollectionModel,
      settings.feeAmountCents,
      settings.feeBasis
    ),
  };
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
    const serviceSupabase = createServiceRoleClient();
    const paymentSettings = await getSeasonPaymentSettings(
      serviceSupabase as any,
      leagueId,
      seasonId
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
    const teamReturnStatuses = await getSeasonTeamReturnStatuses(leagueId, seasonId);
    const registrationContext = buildRegistrationContext(data, teamReturnStatuses);
    const normalizedPaymentStatus =
      data.payment_status === 'completed'
        ? 'completed'
        : paymentMode === 'required'
          ? 'pending'
          : 'not_required';
    const amountPaidCents =
      normalizedPaymentStatus === 'completed' ? playerFeeAmountCents : 0;
    const normalizedDraftData = {
      ...data,
      ...registrationContext.context,
      registration_intent: registrationContext.intent,
      registration_type: registrationContext.registrationType,
      team_id: registrationContext.storedTeamId,
      payment_status: normalizedPaymentStatus,
      amount_cents: amountPaidCents,
    };

    const { data: registration, error } = await (supabase.from as any)(
      'registration_submissions'
    )
      .upsert(
        {
          player_id: user.id,
          league_id: leagueId,
          season_id: seasonId,
          registration_type: registrationContext.registrationType,
          team_id: registrationContext.storedTeamId,
          draft_data: normalizedDraftData,
          draft_step: data.current_step || 1,
          status: 'pending',
          payment_status: normalizedPaymentStatus,
          fee_amount_cents: playerFeeAmountCents,
          amount_paid_cents: amountPaidCents,
          currency: paymentSettings.currency,
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
): ActionResult<{
  status: string;
  registrationId: string;
  draftData?: RegistrationDraftData | null;
} | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: true, data: null };
    }

    const supabase = await createClient();

    const { data: registration, error } = await supabase
      .from('registration_submissions')
      .select('id, status, draft_data')
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
        draftData: (registration.draft_data as RegistrationDraftData | null) ?? null,
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
      .select('id, content, version, content_hash, title, document_url, document_name, document_mime_type')
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

    const paymentSettings = await getSeasonPaymentSettings(
      serviceSupabase as any,
      data.league_id,
      data.season_id
    );
    const teamReturnStatuses = await getSeasonTeamReturnStatuses(
      data.league_id,
      data.season_id
    );
    const registrationContext = buildRegistrationContext(data, teamReturnStatuses);
    const expectedFeeCents = getPlayerRegistrationFeeAmount(
      paymentSettings.feeBasis,
      paymentSettings.feeAmountCents
    );
    const paymentMode = getRegistrationPaymentMode(
      paymentSettings.feeCollectionModel,
      paymentSettings.feeAmountCents,
      paymentSettings.feeBasis
    );
    let amountPaidCents = 0;

    if (paymentMode === 'required' && data.payment_status !== 'completed') {
      return {
        success: false,
        error: 'Payment is required for this registration. Please complete payment before submitting.',
      };
    }

    const shouldVerifyIndividualPayment =
      expectedFeeCents > 0 &&
      (paymentMode === 'required' ||
        (paymentMode === 'optional' &&
          data.payment_status === 'completed' &&
          Boolean(data.payment_intent_id)));

    if (shouldVerifyIndividualPayment) {
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
      amountPaidCents = expectedFeeCents;
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
        .maybeSingle();

      if (existingWaiver) {
        const normalizedSignature = normalizeWaiverSignature({
          signatureType: data.signature_type,
          signatureData: data.signature_data,
          signedName: data.signed_name,
          fallbackName: data.full_name,
        });

        // Update waiver_accepted flag on existing record
        await serviceSupabase
          .from('player_waivers')
          .update({
            waiver_accepted: true,
            waiver_accepted_at: new Date().toISOString(),
            agreed_at: new Date().toISOString(),
            signature_type: normalizedSignature.signatureType,
            signature_data: normalizedSignature.signatureData,
            signed_name: normalizedSignature.signedName,
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

        const normalizedSignature = normalizeWaiverSignature({
          signatureType: data.signature_type,
          signatureData: data.signature_data,
          signedName: data.signed_name,
          fallbackName: data.full_name,
        });

        const { data: newWaiver, error: waiverError } = await serviceSupabase
          .from('player_waivers')
          .insert({
            player_id: user.id,
            league_id: data.league_id,
            season_id: data.season_id,
            signature_data: normalizedSignature.signatureData,
            signature_type: normalizedSignature.signatureType,
            signed_name: normalizedSignature.signedName,
            waiver_version: template?.version || 'v1',
            waiver_content_hash: template?.content_hash || data.waiver_content_hash || '',
            waiver_accepted: true,
            waiver_accepted_at: new Date().toISOString(),
            agreed_at: new Date().toISOString(),
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
          team_id: registrationContext.storedTeamId,
          waiver_id: waiverId,
          registration_type: registrationContext.registrationType,
          status: 'pending',
          preferred_position: data.primary_position,
          secondary_position: data.secondary_position || null,
          preferred_jersey_number: data.preferred_jersey_number || null,
          self_assessed_skill: data.skill_level,
          years_experience: data.years_experience || null,
          previous_leagues: data.previous_leagues || null,
          photo_url: data.photo_url || null,
          payment_status: data.payment_status || 'not_required',
          fee_amount_cents: expectedFeeCents,
          stripe_payment_intent_id: data.payment_intent_id || null,
          amount_paid_cents: amountPaidCents,
          currency: paymentSettings.currency,
          submitted_at: new Date().toISOString(),
          draft_data: {
            ...registrationContext.context,
            registration_intent: registrationContext.intent,
            requested_team_name: data.requested_team_name || registrationContext.context.requested_team_name,
          },
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

function generateTeamShortName(teamName: string): string {
  const words = teamName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'TEAM';

  const initials = words
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  if (initials.length >= 2) {
    return initials;
  }

  return teamName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'TEAM';
}

function buildTeamRequestNotes(data: TeamRegistrationData): {
  message: string | null;
  preferredDivisionNotes: string | null;
} {
  const structuredNotes = [
    data.level ? `Requested level: ${data.level}` : null,
    typeof data.played_last_season === 'boolean'
      ? `Played last season: ${data.played_last_season ? 'Yes' : 'No'}`
      : null,
    data.team_last_season ? `Previous team: ${data.team_last_season}` : null,
    data.location_preference ? `Location preference: ${data.location_preference}` : null,
    data.preferred_day ? `Preferred day: ${data.preferred_day}` : null,
    data.alternate_day ? `Alternate day: ${data.alternate_day}` : null,
    data.backup_rep_name ? `Backup rep: ${data.backup_rep_name}` : null,
    data.backup_rep_email ? `Backup rep email: ${data.backup_rep_email}` : null,
    data.waiver_version ? `Waiver version accepted: ${data.waiver_version}` : null,
  ].filter(Boolean);

  return {
    message: data.comments?.trim() || null,
    preferredDivisionNotes: structuredNotes.length > 0 ? structuredNotes.join('\n') : null,
  };
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

    const [{ data: existingLegacy }, { data: existingRequest }, { data: existingTeam }, { data: profile }] =
      await Promise.all([
        serviceSupabase
          .from('team_registrations')
          .select('id')
          .eq('league_id', data.league_id)
          .eq('submitted_by', user.id)
          .eq('team_name', data.team_name.trim())
          .eq('status', 'pending')
          .maybeSingle(),
        serviceSupabase
          .from('team_registration_requests')
          .select('id')
          .eq('league_id', data.league_id)
          .eq('requester_id', user.id)
          .eq('team_name', data.team_name.trim())
          .eq('status', 'pending')
          .maybeSingle(),
        serviceSupabase
          .from('teams')
          .select('id')
          .eq('league_id', data.league_id)
          .eq('name', data.team_name.trim())
          .maybeSingle(),
        serviceSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

    if (existingLegacy || existingRequest) {
      return {
        success: false,
        error: 'You already have a pending team registration request for this league.',
      };
    }

    if (existingTeam) {
      return {
        success: false,
        error: 'A team with this name already exists in the league.',
      };
    }

    const requestNotes = buildTeamRequestNotes(data);

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

    const { error: requestError } = await serviceSupabase
      .from('team_registration_requests')
      .insert({
        league_id: data.league_id,
        requester_id: user.id,
        team_name: data.team_name.trim(),
        team_short_name: generateTeamShortName(data.team_name),
        team_primary_color: '#22D3EE',
        team_secondary_color: '#070A0F',
        team_contact_email: data.backup_rep_email || profile?.email || user.email || null,
        team_contact_phone: null,
        message: requestNotes.message,
        preferred_division_notes: requestNotes.preferredDivisionNotes,
        status: 'pending',
      });

    if (requestError) {
      console.error('Team registration queue error:', requestError);
      await serviceSupabase
        .from('team_registrations')
        .delete()
        .eq('id', registration.id);
      return {
        success: false,
        error: 'Failed to submit team registration for admin review.',
      };
    }

    revalidatePath('/');

    return { success: true, data: { registrationId: registration.id } };
  } catch (error) {
    console.error('Team registration error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
