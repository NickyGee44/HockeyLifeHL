'use server';

import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getSeasonPaymentSettings } from '@/lib/registration/fee-collection-model';
import { resolvePlayerPhotoUrl } from '@/lib/player-photo';
import { verifyTeamCaptainAccess, type TeamCaptainAccessResult } from './team-captain-access';

// ============================================================================
// Types
// ============================================================================

export interface CaptainPaymentPlayer {
  id: string;
  playerName: string;
  email: string | null;
  avatarUrl: string | null;
  amountOwedCents: number;
  amountPaidCents: number;
  status: string; // 'no_fee' when player has no payment record
  paymentPlan: string | null;
  lastReminderSentAt: string | null;
  reminderSentCount: number;
  paymentId: string | null; // null for players with no payment record
  nextPaymentDate: string | null;
}

export interface CaptainPaymentSummary {
  totalPlayers: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  totalExpectedCents: number;
  totalCollectedCents: number;
}

export type CaptainOfflinePaymentMethod =
  | 'e_transfer'
  | 'cash'
  | 'check'
  | 'other';

export interface CaptainManualPaymentInput {
  amountCents: number;
  paymentMethod: CaptainOfflinePaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface CaptainPlayerManualPaymentInput extends CaptainManualPaymentInput {
  seasonId: string;
  playerId: string;
  paymentId?: string | null;
}

export interface CaptainTeamInvoiceSummary {
  paymentStatus: string;
  amountPaidCents: number;
  amountOutstandingCents: number;
}

// ============================================================================
// Helper: Verify Captain Access
// ============================================================================

async function verifyCaptainRole(teamId: string): Promise<TeamCaptainAccessResult> {
  const directCaptainAccess = await verifyTeamCaptainAccess(teamId);
  if (directCaptainAccess.authorized) {
    return directCaptainAccess;
  }

  const authSupabase = await createAuthClient();
  const serviceSupabase = createServiceRoleClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return directCaptainAccess;
  }

  const { data: rosterLeadership } = await serviceSupabase
    .from('team_rosters')
    .select('team_id, league_id')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .eq('status', 'active')
    .in('leadership_role', ['captain', 'alternate_captain'])
    .maybeSingle();

  if (rosterLeadership?.team_id) {
    return {
      authorized: true,
      userId: user.id,
      teamId: rosterLeadership.team_id,
      leagueId: rosterLeadership.league_id,
    };
  }

  return directCaptainAccess;
}

function buildRegistrationPaymentStatus(
  feeAmountCents: number,
  amountPaidCents: number,
  currentStatus: string | null
) {
  if (currentStatus === 'refunded') {
    return 'refunded';
  }

  if (currentStatus === 'failed') {
    return 'failed';
  }

  if (currentStatus === 'not_required' || feeAmountCents <= 0) {
    return 'not_required';
  }

  if (amountPaidCents >= feeAmountCents) {
    return 'completed';
  }

  if (amountPaidCents > 0) {
    return 'partial';
  }

  return currentStatus || 'pending';
}

function getRegistrationTeamId(registration: {
  assigned_team_id?: string | null;
  team_id?: string | null;
}) {
  return registration.assigned_team_id || registration.team_id || null;
}

function shouldFallbackPlayerPaymentTotalAmount(error: {
  code?: string;
  message?: string | null;
} | null): boolean {
  if (!error) return false;

  return (
    error.code === '42703' ||
    Boolean(error.message?.includes('total_amount_cents')) ||
    Boolean(error.message?.includes('generated column'))
  );
}

async function getActiveSeasonFeeWithContribution(
  supabase: ReturnType<typeof createServiceRoleClient>,
  leagueId: string,
  seasonId: string
) {
  const feeQuery = await supabase
    .from('season_fees')
    .select('id, amount_cents, currency, fee_basis, default_player_contribution_cents')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    feeQuery.error &&
    (feeQuery.error.code === '42703' ||
      feeQuery.error.message?.includes('fee_basis') ||
      feeQuery.error.message?.includes('default_player_contribution_cents'))
  ) {
    const fallbackQuery = await supabase
      .from('season_fees')
      .select('id, amount_cents, currency')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return fallbackQuery.data
      ? {
          id: fallbackQuery.data.id,
          amount_cents: fallbackQuery.data.amount_cents,
          currency: fallbackQuery.data.currency ?? 'cad',
          fee_basis: 'player' as const,
          default_player_contribution_cents: 0,
        }
      : null;
  }

  return feeQuery.data
    ? {
        ...feeQuery.data,
        fee_basis: feeQuery.data.fee_basis === 'team' ? 'team' : 'player',
        default_player_contribution_cents:
          feeQuery.data.default_player_contribution_cents ?? 0,
      }
    : null;
}

async function recalculateCaptainTeamInvoice(
  supabase: ReturnType<typeof createServiceRoleClient>,
  params: {
    leagueId: string;
    seasonId: string;
    teamId: string;
    updatedBy?: string | null;
  }
) {
  const seasonFee = await getActiveSeasonFeeWithContribution(
    supabase,
    params.leagueId,
    params.seasonId
  );

  if (!seasonFee) {
    return null;
  }

  const { data: invoice } = await (supabase as any)
    .from('team_invoices')
    .select('id, payment_deadline, notes, paid_by, paid_at')
    .eq('league_id', params.leagueId)
    .eq('season_id', params.seasonId)
    .eq('team_id', params.teamId)
    .maybeSingle();

  const { data: registrations, error: registrationError } = await supabase
    .from('registration_submissions')
    .select(
      'id, team_id, assigned_team_id, fee_amount_cents, amount_paid_cents, status, submitted_at'
    )
    .eq('league_id', params.leagueId)
    .eq('season_id', params.seasonId)
    .or(`assigned_team_id.eq.${params.teamId},team_id.eq.${params.teamId}`)
    .not('submitted_at', 'is', null)
    .in('status', ['pending', 'approved', 'waitlisted']);

  if (registrationError) {
    throw registrationError;
  }

  const teamRegistrations = (registrations || []).filter(
    (registration: any) => getRegistrationTeamId(registration) === params.teamId
  );

  const playerTargetTotalCents = teamRegistrations.reduce(
    (sum: number, registration: any) =>
      sum + Math.max(0, registration.fee_amount_cents || 0),
    0
  );
  const playerPaidCents = teamRegistrations.reduce(
    (sum: number, registration: any) =>
      sum + Math.max(0, registration.amount_paid_cents || 0),
    0
  );

  let teamPaymentTotalCents = 0;
  if (invoice?.id) {
    const { data: payments } = await (supabase as any)
      .from('team_invoice_payments')
      .select('amount_cents')
      .eq('team_invoice_id', invoice.id);

    teamPaymentTotalCents = (payments || []).reduce(
      (sum: number, payment: { amount_cents: number | null }) =>
        sum + Math.max(0, payment.amount_cents || 0),
      0
    );
  }

  const totalAmountCents =
    seasonFee.fee_basis === 'team'
      ? seasonFee.amount_cents
      : playerTargetTotalCents;
  const totalPaidCents = playerPaidCents + teamPaymentTotalCents;
  const status =
    totalAmountCents === 0
      ? 'waived'
      : totalPaidCents >= totalAmountCents
        ? 'paid'
        : totalPaidCents > 0
          ? 'partial'
          : 'pending';

  const invoicePayload = {
    team_id: params.teamId,
    season_id: params.seasonId,
    league_id: params.leagueId,
    total_players: teamRegistrations.length,
    fee_basis: seasonFee.fee_basis,
    fee_per_player_cents: seasonFee.fee_basis === 'team' ? 0 : seasonFee.amount_cents,
    total_amount_cents: totalAmountCents,
    amount_paid_cents: totalPaidCents,
    currency: seasonFee.currency,
    status,
    payment_deadline: invoice?.payment_deadline ?? null,
    notes: invoice?.notes ?? null,
    paid_by:
      status === 'paid'
        ? invoice?.paid_by ?? params.updatedBy ?? null
        : null,
    paid_at:
      status === 'paid'
        ? invoice?.paid_at ?? new Date().toISOString()
        : null,
    updated_at: new Date().toISOString(),
  };

  let writeError = invoice?.id
    ? (
        await (supabase as any)
          .from('team_invoices')
          .update(invoicePayload)
          .eq('id', invoice.id)
      ).error
    : (
        await (supabase as any)
          .from('team_invoices')
          .insert(invoicePayload)
      ).error;

  if (
    writeError &&
    (writeError.code === '42703' ||
      writeError.message?.includes('fee_basis') ||
      writeError.message?.includes('generated column') ||
      writeError.message?.includes('cannot insert a non-DEFAULT value into column "total_amount_cents"') ||
      writeError.message?.includes('cannot update generated column'))
  ) {
    const fallbackPayload = { ...invoicePayload };
    delete (fallbackPayload as Record<string, unknown>).fee_basis;
    delete (fallbackPayload as Record<string, unknown>).total_amount_cents;

    writeError = invoice?.id
      ? (
          await (supabase as any)
            .from('team_invoices')
            .update(fallbackPayload)
            .eq('id', invoice.id)
        ).error
      : (
          await (supabase as any)
            .from('team_invoices')
            .insert(fallbackPayload)
        ).error;
  }

  if (writeError) {
    throw writeError;
  }

  return {
    amountPaidCents: totalPaidCents,
    amountOutstandingCents: Math.max(0, totalAmountCents - totalPaidCents),
    paymentStatus: status,
    playerTargetTotalCents,
    unallocatedTargetCents: Math.max(
      0,
      totalAmountCents - teamPaymentTotalCents - playerTargetTotalCents
    ),
  };
}

function normalizeCaptainPaymentStatus(
  status: string | null | undefined,
  amountOwedCents: number,
  amountPaidCents: number
) {
  if (status === 'paid' || status === 'completed') {
    return 'paid';
  }

  if (status === 'partially_paid') {
    return 'partially_paid';
  }

  if (status === 'overdue') {
    return 'overdue';
  }

  if (status === 'not_required' || amountOwedCents <= 0) {
    return 'no_fee';
  }

  if (amountPaidCents > 0) {
    return 'partially_paid';
  }

  return status || 'pending';
}

function getPlayerPaymentPortalUrl(paymentId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/payments/${paymentId}`;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

// ============================================================================
// 1. Get Captain Team Payments
// ============================================================================

export async function getCaptainTeamPayments(
  teamId: string,
  seasonId: string
): Promise<{ success: boolean; data?: CaptainPaymentPlayer[]; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  // Use service role so RLS doesn't block reading teammates' team_rosters
  // entries or their profiles (auth client restricts both to auth.uid() only).
  const supabase = createServiceRoleClient();

  // Step 1: Fetch active roster members for the current season.
  const { data: rosterData, error: rosterError } = await supabase
    .from('team_rosters')
    .select(
      `
      player_id,
      jersey_number,
      position,
      profile:profiles!team_rosters_player_id_fkey(id, full_name, email, avatar_url, photo_url)
    `
    )
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .eq('status', 'active')
    .is('end_date', null);

  if (rosterError) {
    console.error('[CaptainPayments] roster fetch error:', rosterError.message);
    return { success: false, error: 'Failed to fetch team roster.' };
  }

  const playerIds = (rosterData || []).map((r: any) => r.player_id as string);
  const paymentsMap = new Map<string, any>();
  const registrationsMap = new Map<string, any>();

  const [seasonSettings, paymentsResult, registrationsResult] = await Promise.all([
    getSeasonPaymentSettings(supabase as any, auth.leagueId || '', seasonId),
    playerIds.length > 0
      ? supabase
          .from('player_payments')
          .select(
            `
            id,
            player_id,
            status,
            payment_plan,
            total_amount_cents,
            amount_paid_cents,
            last_reminder_sent_at,
            reminder_sent_count,
            next_payment_date
          `
          )
          .eq('team_id', teamId)
          .eq('season_id', seasonId)
          .in('player_id', playerIds)
      : Promise.resolve({ data: [], error: null }),
    playerIds.length > 0
      ? supabase
          .from('registration_submissions')
          .select(
            `
            id,
            player_id,
            fee_amount_cents,
            amount_paid_cents,
            payment_status,
            created_at
          `
          )
          .eq('season_id', seasonId)
          .in('player_id', playerIds)
          .or(`team_id.eq.${teamId},assigned_team_id.eq.${teamId}`)
          .not('submitted_at', 'is', null)
          .in('status', ['pending', 'approved', 'waitlisted'])
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const payment of paymentsResult.data || []) {
    if (!paymentsMap.has(payment.player_id)) {
      paymentsMap.set(payment.player_id, payment);
    }
  }

  for (const registration of registrationsResult.data || []) {
    if (!registrationsMap.has(registration.player_id)) {
      registrationsMap.set(registration.player_id, registration);
    }
  }

  const defaultFeeAmountCents =
    seasonSettings.feeBasis === 'player' ? seasonSettings.feeAmountCents : 0;

  // Step 3: Merge — every roster player appears, even if payment rows do not exist yet.
  const result: CaptainPaymentPlayer[] = (rosterData || []).map((r: any) => {
    const profile = Array.isArray(r.profile) ? r.profile[0] : (r.profile as any);
    const payment = paymentsMap.get(r.player_id);
    const registration = registrationsMap.get(r.player_id);
    const amountOwedCents =
      payment?.total_amount_cents ??
      registration?.fee_amount_cents ??
      defaultFeeAmountCents;
    const amountPaidCents =
      payment?.amount_paid_cents ??
      registration?.amount_paid_cents ??
      0;

    return {
      id: profile?.id || r.player_id,
      playerName: profile?.full_name || 'Unknown',
      email: profile?.email || null,
      avatarUrl: resolvePlayerPhotoUrl(profile),
      amountOwedCents,
      amountPaidCents,
      status: normalizeCaptainPaymentStatus(
        payment?.status ?? registration?.payment_status,
        amountOwedCents,
        amountPaidCents
      ),
      paymentPlan: payment?.payment_plan ?? null,
      lastReminderSentAt: payment?.last_reminder_sent_at ?? null,
      reminderSentCount: payment?.reminder_sent_count ?? 0,
      paymentId: payment?.id ?? null,
      nextPaymentDate: payment?.next_payment_date ?? null,
    };
  });

  return { success: true, data: result };
}

// ============================================================================
// 2. Send Captain Payment Reminder
// ============================================================================

export async function sendCaptainPaymentReminder(
  teamId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const supabase = createServiceRoleClient();

  // Fetch the payment and verify it belongs to this team
  const { data: payment, error: fetchError } = await supabase
    .from('player_payments')
    .select(
      `
      id,
      team_id,
      league_id,
      status,
      total_amount_cents,
      amount_paid_cents,
      reminder_sent_count,
      next_payment_date,
      player:player_id (
        id,
        full_name,
        email
      ),
      season_fee:season_fee_id (
        name
      ),
      leagues:league_id (
        name
      )
    `
    )
    .eq('id', paymentId)
    .single();

  if (fetchError || !payment) {
    return { success: false, error: 'Payment not found.' };
  }

  if (payment.team_id !== teamId) {
    return { success: false, error: 'Payment does not belong to this team.' };
  }

  // Don't send reminders for completed payments
  if (['paid', 'cancelled', 'refunded'].includes(payment.status)) {
    return { success: false, error: 'This payment does not need a reminder.' };
  }

  const player = payment.player as any;
  const seasonFee = payment.season_fee as any;
  const league = payment.leagues as any;

  if (!player?.email) {
    return { success: false, error: 'Player email not found.' };
  }

  // Send the reminder email using Resend (same pattern as league-builder)
  const { Resend } = await import('resend');
  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@beerleaguehockey.ca';
  const amountDue = (payment.total_amount_cents ?? 0) - (payment.amount_paid_cents ?? 0);
  const reminderNumber = (payment.reminder_sent_count || 0) + 1;
  const isUrgent = reminderNumber >= 3;
  const paymentUrl = getPlayerPaymentPortalUrl(paymentId);

  const subject = `${isUrgent ? '[Urgent] ' : ''}Payment Reminder - ${seasonFee?.name || 'Season Fee'}`;
  const html = buildReminderEmailHtml({
    playerName: player.full_name || 'Player',
    leagueName: league?.name || 'Your League',
    feeName: seasonFee?.name || 'Season Fee',
    amountDue,
    dueDate: payment.next_payment_date,
    paymentUrl,
    reminderNumber,
    isUrgent,
  });

  if (resend) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: player.email,
        subject,
        html,
      });
    } catch (emailError) {
      console.error('[CaptainPayments] Email send error:', emailError);
      return { success: false, error: 'Failed to send reminder email.' };
    }
  } else {
    console.info('[CaptainPayments] Would send reminder email:', {
      to: player.email,
      subject,
    });
  }

  // Update reminder count using service role to bypass RLS
  const serviceSupabase = createServiceRoleClient();
  await serviceSupabase
    .from('player_payments')
    .update({
      reminder_sent_count: reminderNumber,
      last_reminder_sent_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  return { success: true };
}

// ============================================================================
// 3. Get Captain Payment Summary
// ============================================================================

export async function getCaptainPaymentSummary(
  teamId: string,
  seasonId: string
): Promise<{ success: boolean; data?: CaptainPaymentSummary; error?: string }> {
  const paymentsResult = await getCaptainTeamPayments(teamId, seasonId);
  if (!paymentsResult.success || !paymentsResult.data) {
    return { success: false, error: paymentsResult.error || 'Failed to get payment summary.' };
  }

  const summary: CaptainPaymentSummary = {
    totalPlayers: paymentsResult.data.length,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    totalExpectedCents: 0,
    totalCollectedCents: 0,
  };

  for (const payment of paymentsResult.data) {
    summary.totalExpectedCents += payment.amountOwedCents;
    summary.totalCollectedCents += payment.amountPaidCents;

    switch (payment.status) {
      case 'paid':
        summary.paidCount++;
        break;
      case 'overdue':
        summary.overdueCount++;
        break;
      case 'pending':
      case 'processing':
      case 'partially_paid':
        summary.pendingCount++;
        break;
    }
  }

  return { success: true, data: summary };
}

export async function recordCaptainPlayerPayment(
  teamId: string,
  payment: CaptainPlayerManualPaymentInput
): Promise<{ success: boolean; data?: CaptainTeamInvoiceSummary; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized || !auth.userId) {
    return { success: false, error: auth.error || 'Not authorized.' };
  }

  if (payment.amountCents <= 0) {
    return { success: false, error: 'Enter a valid payment amount.' };
  }

  const supabase = createServiceRoleClient();

  let playerPayment: any = null;

  if (payment.paymentId) {
    const { data, error: paymentError } = await supabase
      .from('player_payments')
      .select(`
        id,
        team_id,
        league_id,
        season_id,
        player_id,
        season_fee_id,
        status,
        total_amount_cents,
        amount_paid_cents,
        total_installments,
        current_installment,
        notes,
        currency,
        metadata
      `)
      .eq('id', payment.paymentId)
      .single();

    if (paymentError || !data) {
      return { success: false, error: 'Player payment not found.' };
    }

    playerPayment = data;
  } else {
    const { data: existingPayment } = await supabase
      .from('player_payments')
      .select(`
        id,
        team_id,
        league_id,
        season_id,
        player_id,
        season_fee_id,
        status,
        total_amount_cents,
        amount_paid_cents,
        total_installments,
        current_installment,
        notes,
        currency,
        metadata
      `)
      .eq('team_id', teamId)
      .eq('season_id', payment.seasonId)
      .eq('player_id', payment.playerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    playerPayment = existingPayment;
  }

  if (!playerPayment) {
    const [seasonSettings, registrationResult, seasonFeeResult] = await Promise.all([
      getSeasonPaymentSettings(supabase as any, auth.leagueId || '', payment.seasonId),
      supabase
        .from('registration_submissions')
        .select(`
          id,
          league_id,
          season_id,
          player_id,
          team_id,
          assigned_team_id,
          fee_amount_cents,
          amount_paid_cents,
          payment_status,
          currency
        `)
        .eq('season_id', payment.seasonId)
        .eq('player_id', payment.playerId)
        .or(`team_id.eq.${teamId},assigned_team_id.eq.${teamId}`)
        .not('submitted_at', 'is', null)
        .in('status', ['pending', 'approved', 'waitlisted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('season_fees')
        .select('id')
        .eq('league_id', auth.leagueId || '')
        .eq('season_id', payment.seasonId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const totalAmountCents =
      registrationResult.data?.fee_amount_cents ?? seasonSettings.feeAmountCents ?? 0;

    if (totalAmountCents <= 0 || !seasonFeeResult.data?.id) {
      return {
        success: false,
        error: 'There is no player fee configured for this season yet.',
      };
    }

      const { data: insertedPayment, error: insertError } = await supabase
        .from('player_payments')
        .insert({
        player_id: payment.playerId,
        season_fee_id: seasonFeeResult.data.id,
        team_id: teamId,
        league_id: auth.leagueId || registrationResult.data?.league_id,
        season_id: payment.seasonId,
        payment_plan: 'full',
        base_amount_cents: totalAmountCents,
          discount_cents: 0,
          late_fee_cents: 0,
          installment_fee_cents: 0,
          total_amount_cents: totalAmountCents,
          amount_paid_cents: registrationResult.data?.amount_paid_cents || 0,
          currency: registrationResult.data?.currency || seasonSettings.currency || 'CAD',
        status: normalizeCaptainPaymentStatus(
          registrationResult.data?.payment_status,
          totalAmountCents,
          registrationResult.data?.amount_paid_cents || 0
        ) as any,
        total_installments: 1,
        current_installment:
          (registrationResult.data?.amount_paid_cents || 0) > 0 ? 1 : 0,
        metadata: registrationResult.data?.id
          ? { registration_id: registrationResult.data.id }
          : null,
      })
      .select(`
        id,
        team_id,
        league_id,
        season_id,
        player_id,
        season_fee_id,
        status,
        total_amount_cents,
        amount_paid_cents,
        total_installments,
        current_installment,
        notes,
        currency,
        metadata
      `)
        .single();

    if (
      insertError &&
      !shouldFallbackPlayerPaymentTotalAmount(insertError)
    ) {
      console.error('[CaptainPayments] create player payment error:', insertError);
      return { success: false, error: 'Failed to create a player payment record.' };
    }

    let insertedPaymentRecord = insertedPayment;

    if (insertError && shouldFallbackPlayerPaymentTotalAmount(insertError)) {
      const { data: fallbackInsertedPayment, error: fallbackInsertError } = await supabase
        .from('player_payments')
        .insert({
          player_id: payment.playerId,
          season_fee_id: seasonFeeResult.data.id,
          team_id: teamId,
          league_id: auth.leagueId || registrationResult.data?.league_id,
          season_id: payment.seasonId,
          payment_plan: 'full',
          base_amount_cents: totalAmountCents,
          discount_cents: 0,
          late_fee_cents: 0,
          installment_fee_cents: 0,
          amount_paid_cents: registrationResult.data?.amount_paid_cents || 0,
          currency: registrationResult.data?.currency || seasonSettings.currency || 'CAD',
          status: normalizeCaptainPaymentStatus(
            registrationResult.data?.payment_status,
            totalAmountCents,
            registrationResult.data?.amount_paid_cents || 0
          ) as any,
          total_installments: 1,
          current_installment:
            (registrationResult.data?.amount_paid_cents || 0) > 0 ? 1 : 0,
          metadata: registrationResult.data?.id
            ? { registration_id: registrationResult.data.id }
            : null,
        })
        .select(`
          id,
          team_id,
          league_id,
          season_id,
          player_id,
          season_fee_id,
          status,
          total_amount_cents,
          amount_paid_cents,
          total_installments,
          current_installment,
          notes,
          currency,
          metadata
        `)
        .single();

      if (fallbackInsertError || !fallbackInsertedPayment) {
        console.error('[CaptainPayments] create player payment fallback error:', fallbackInsertError);
        return { success: false, error: 'Failed to create a player payment record.' };
      }

      insertedPaymentRecord = fallbackInsertedPayment;
    }

    playerPayment = insertedPaymentRecord;
  }

  if (playerPayment.team_id !== teamId) {
    return { success: false, error: 'This payment does not belong to your team.' };
  }

  if (['cancelled', 'refunded'].includes(playerPayment.status)) {
    return { success: false, error: 'This payment can no longer be updated.' };
  }

  const outstandingCents = Math.max(
    0,
    (playerPayment.total_amount_cents || 0) - (playerPayment.amount_paid_cents || 0)
  );

  if (outstandingCents <= 0) {
    return { success: false, error: 'This player is already fully paid.' };
  }

  if (payment.amountCents > outstandingCents) {
    return {
      success: false,
      error: `Payment exceeds the remaining balance of $${(outstandingCents / 100).toFixed(2)}.`,
    };
  }

  const newAmountPaidCents = (playerPayment.amount_paid_cents || 0) + payment.amountCents;
  const newStatus =
    newAmountPaidCents >= (playerPayment.total_amount_cents || 0)
      ? 'paid'
      : newAmountPaidCents > 0
        ? 'partially_paid'
        : 'pending';

  const existingMetadata =
    playerPayment.metadata && typeof playerPayment.metadata === 'object'
      ? (playerPayment.metadata as Record<string, unknown>)
      : {};

  const paymentEvent = {
    amount_cents: payment.amountCents,
    method: payment.paymentMethod,
    reference_number: payment.referenceNumber || null,
    notes: payment.notes || null,
    recorded_at: new Date().toISOString(),
    recorded_by: auth.userId,
    source: 'captain_dashboard',
  };

  const existingEvents = Array.isArray(existingMetadata.captain_payment_events)
    ? existingMetadata.captain_payment_events
    : [];

  const updatedMetadata = {
    ...existingMetadata,
    captain_payment_events: [...existingEvents, paymentEvent],
    last_manual_payment: paymentEvent,
  };

  const noteParts = [
    `Captain ${payment.paymentMethod.replace('_', ' ')}`,
    payment.referenceNumber ? `ref ${payment.referenceNumber}` : null,
    payment.notes || null,
  ].filter(Boolean);

  const updatePayload = {
    amount_paid_cents: newAmountPaidCents,
    status: newStatus as any,
    paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
    current_installment:
      newStatus === 'paid'
        ? playerPayment.total_installments || 1
        : Math.max(playerPayment.current_installment || 0, newAmountPaidCents > 0 ? 1 : 0),
    notes: noteParts.length
      ? `${playerPayment.notes || ''}\n[Captain] ${noteParts.join(' - ')}`.trim()
      : playerPayment.notes,
    metadata: updatedMetadata as any,
  };

  let updatePaymentError = (
    await supabase
      .from('player_payments')
      .update(updatePayload)
      .eq('id', playerPayment.id)
  ).error;

  if (shouldFallbackPlayerPaymentTotalAmount(updatePaymentError)) {
    const fallbackPayload = { ...updatePayload };
    updatePaymentError = (
      await supabase
        .from('player_payments')
        .update(fallbackPayload)
        .eq('id', playerPayment.id)
    ).error;
  }

  if (updatePaymentError) {
    console.error('[CaptainPayments] recordCaptainPlayerPayment update error:', updatePaymentError);
    return { success: false, error: 'Failed to record player payment.' };
  }

  let registrationId =
    typeof existingMetadata.registration_id === 'string'
      ? existingMetadata.registration_id
      : null;

  if (!registrationId) {
    const { data: fallbackRegistration } = await supabase
      .from('registration_submissions')
      .select('id')
      .eq('league_id', playerPayment.league_id)
      .eq('season_id', playerPayment.season_id)
      .eq('player_id', playerPayment.player_id)
      .or(`team_id.eq.${teamId},assigned_team_id.eq.${teamId}`)
      .not('submitted_at', 'is', null)
      .in('status', ['pending', 'approved', 'waitlisted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    registrationId = fallbackRegistration?.id || null;
  }

  if (registrationId) {
    const { data: registration } = await supabase
      .from('registration_submissions')
      .select('id, fee_amount_cents, amount_paid_cents, payment_status')
      .eq('id', registrationId)
      .maybeSingle();

    if (registration) {
      const registrationTotal = registration.fee_amount_cents || playerPayment.total_amount_cents || 0;
      const registrationPaid = Math.min(registrationTotal, newAmountPaidCents);
      await supabase
        .from('registration_submissions')
        .update({
          amount_paid_cents: registrationPaid,
          payment_status: buildRegistrationPaymentStatus(
            registrationTotal,
            registrationPaid,
            registration.payment_status
          ),
        })
        .eq('id', registrationId);
    }
  }

  const invoiceSummary = await recalculateCaptainTeamInvoice(supabase, {
    leagueId: playerPayment.league_id,
    seasonId: playerPayment.season_id,
    teamId,
    updatedBy: auth.userId,
  });

  return {
    success: true,
    data: invoiceSummary
      ? {
          paymentStatus: invoiceSummary.paymentStatus,
          amountPaidCents: invoiceSummary.amountPaidCents,
          amountOutstandingCents: invoiceSummary.amountOutstandingCents,
        }
      : {
          paymentStatus: newStatus,
          amountPaidCents: newAmountPaidCents,
          amountOutstandingCents: Math.max(0, outstandingCents - payment.amountCents),
        },
  };
}

export async function updateCaptainPlayerContributionTarget(
  teamId: string,
  input: {
    seasonId: string;
    playerId: string;
    paymentId?: string | null;
    targetAmountCents: number;
  }
): Promise<{ success: boolean; data?: CaptainTeamInvoiceSummary; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized || !auth.userId) {
    return { success: false, error: auth.error || 'Not authorized.' };
  }

  if (input.targetAmountCents < 0) {
    return { success: false, error: 'Contribution target cannot be negative.' };
  }

  const supabase = createServiceRoleClient();

  const seasonFee = await getActiveSeasonFeeWithContribution(
    supabase,
    auth.leagueId || '',
    input.seasonId
  );

  if (!seasonFee || seasonFee.fee_basis !== 'team') {
    return {
      success: false,
      error: 'Player contribution targets are only available for flat team-fee seasons.',
    };
  }

  const { data: registration, error: registrationError } = await supabase
    .from('registration_submissions')
    .select(`
      id,
      league_id,
      season_id,
      player_id,
      team_id,
      assigned_team_id,
      fee_amount_cents,
      amount_paid_cents,
      payment_status,
      currency,
      draft_data
    `)
    .eq('season_id', input.seasonId)
    .eq('player_id', input.playerId)
    .or(`team_id.eq.${teamId},assigned_team_id.eq.${teamId}`)
    .not('submitted_at', 'is', null)
    .in('status', ['pending', 'approved', 'waitlisted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (registrationError || !registration) {
    return { success: false, error: 'Registration not found for this player.' };
  }

  const assignedTeamId = getRegistrationTeamId(registration);
  if (assignedTeamId !== teamId) {
    return {
      success: false,
      error: 'Assign the player to your team before setting a contribution target.',
    };
  }

  const minimumTarget = Math.max(0, registration.amount_paid_cents || 0);
  if (input.targetAmountCents < minimumTarget) {
    return {
      success: false,
      error: `Contribution target cannot be less than the amount already paid (${formatMoney(minimumTarget)}).`,
    };
  }

  const { data: invoice } = await (supabase as any)
    .from('team_invoices')
    .select('id')
    .eq('team_id', teamId)
    .eq('league_id', registration.league_id)
    .eq('season_id', input.seasonId)
    .maybeSingle();

  let teamPaymentTotalCents = 0;
  if (invoice?.id) {
    const { data: invoicePayments } = await (supabase as any)
      .from('team_invoice_payments')
      .select('amount_cents')
      .eq('team_invoice_id', invoice.id);

    teamPaymentTotalCents = (invoicePayments || []).reduce(
      (sum: number, payment: { amount_cents: number | null }) =>
        sum + Math.max(0, payment.amount_cents || 0),
      0
    );
  }

  const { data: siblingRegistrations } = await supabase
    .from('registration_submissions')
    .select('id, fee_amount_cents')
    .eq('season_id', input.seasonId)
    .or(`team_id.eq.${teamId},assigned_team_id.eq.${teamId}`)
    .not('submitted_at', 'is', null)
    .in('status', ['pending', 'approved', 'waitlisted']);

  const siblingTargetTotal = (siblingRegistrations || [])
    .filter((row: { id: string; fee_amount_cents: number | null }) => row.id !== registration.id)
    .reduce(
      (
        sum: number,
        row: { id: string; fee_amount_cents: number | null }
      ) => sum + Math.max(0, row.fee_amount_cents || 0),
      0
    );
  const maxAvailableTarget = Math.max(
    0,
    seasonFee.amount_cents - teamPaymentTotalCents - siblingTargetTotal
  );

  if (input.targetAmountCents > maxAvailableTarget) {
    return {
      success: false,
      error: `Contribution target exceeds the remaining unallocated team balance of ${formatMoney(maxAvailableTarget)}.`,
    };
  }

  const draftData =
    registration.draft_data && typeof registration.draft_data === 'object'
      ? (registration.draft_data as Record<string, unknown>)
      : {};
  const registrationPaymentStatus = buildRegistrationPaymentStatus(
    input.targetAmountCents,
    registration.amount_paid_cents || 0,
    registration.payment_status
  );

  const { error: updateRegistrationError } = await supabase
    .from('registration_submissions')
    .update({
      fee_amount_cents: input.targetAmountCents,
      payment_status: registrationPaymentStatus,
      currency: registration.currency || seasonFee.currency,
      draft_data: {
        ...draftData,
        team_contribution_target_cents: input.targetAmountCents,
        team_contribution_customized: true,
        team_contribution_last_synced_at: new Date().toISOString(),
      } as any,
    })
    .eq('id', registration.id);

  if (updateRegistrationError) {
    console.error('[CaptainPayments] update contribution registration error:', updateRegistrationError);
    return { success: false, error: 'Failed to update the player contribution target.' };
  }

  const { data: playerPayment } = input.paymentId
    ? await supabase
        .from('player_payments')
        .select(`
          id,
          team_id,
          league_id,
          season_id,
          player_id,
          season_fee_id,
          status,
          total_amount_cents,
          amount_paid_cents,
          total_installments,
          current_installment,
          notes,
          currency,
          metadata
        `)
        .eq('id', input.paymentId)
        .maybeSingle()
    : await supabase
        .from('player_payments')
        .select(`
          id,
          team_id,
          league_id,
          season_id,
          player_id,
          season_fee_id,
          status,
          total_amount_cents,
          amount_paid_cents,
          total_installments,
          current_installment,
          notes,
          currency,
          metadata
        `)
        .eq('team_id', teamId)
        .eq('season_id', input.seasonId)
        .eq('player_id', input.playerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

  const paymentStatus =
    (registration.amount_paid_cents || 0) >= input.targetAmountCents
      ? 'paid'
      : (registration.amount_paid_cents || 0) > 0
        ? 'partially_paid'
        : input.targetAmountCents > 0
          ? 'pending'
          : 'cancelled';
  const paymentMetadata =
    playerPayment?.metadata && typeof playerPayment.metadata === 'object'
      ? (playerPayment.metadata as Record<string, unknown>)
      : {};
  const paymentPayload = {
    team_id: teamId,
    base_amount_cents: input.targetAmountCents,
    total_amount_cents: input.targetAmountCents,
    amount_paid_cents: registration.amount_paid_cents || 0,
    currency: registration.currency || seasonFee.currency,
    status: paymentStatus as any,
    current_installment:
      paymentStatus === 'paid'
        ? playerPayment?.total_installments || 1
        : Math.max(playerPayment?.current_installment || 0, (registration.amount_paid_cents || 0) > 0 ? 1 : 0),
    paid_at:
      paymentStatus === 'paid' ? new Date().toISOString() : null,
    metadata: {
      ...paymentMetadata,
      registration_id: registration.id,
      team_contribution: true,
    } as any,
  };

  if (playerPayment?.id) {
    let updatePaymentError = (
      await supabase
        .from('player_payments')
        .update(paymentPayload)
        .eq('id', playerPayment.id)
    ).error;

    if (shouldFallbackPlayerPaymentTotalAmount(updatePaymentError)) {
      const fallbackPayload = { ...paymentPayload };
      delete (fallbackPayload as Record<string, unknown>).total_amount_cents;
      updatePaymentError = (
        await supabase
          .from('player_payments')
          .update(fallbackPayload)
          .eq('id', playerPayment.id)
      ).error;
    }

    if (updatePaymentError) {
      console.error('[CaptainPayments] update contribution player payment error:', updatePaymentError);
      return { success: false, error: 'Failed to sync the player contribution target.' };
    }
  } else if (input.targetAmountCents > 0 || (registration.amount_paid_cents || 0) > 0) {
    let insertError = (
      await supabase
        .from('player_payments')
        .insert({
          player_id: input.playerId,
          season_fee_id: seasonFee.id,
          team_id: teamId,
          league_id: registration.league_id,
          season_id: input.seasonId,
          payment_plan: 'full',
          base_amount_cents: input.targetAmountCents,
          discount_cents: 0,
          late_fee_cents: 0,
          installment_fee_cents: 0,
          total_amount_cents: input.targetAmountCents,
          amount_paid_cents: registration.amount_paid_cents || 0,
          currency: registration.currency || seasonFee.currency,
          status: paymentStatus as any,
          total_installments: 1,
          current_installment:
            paymentStatus === 'paid' ? 1 : (registration.amount_paid_cents || 0) > 0 ? 1 : 0,
          paid_at:
            paymentStatus === 'paid' ? new Date().toISOString() : null,
          metadata: {
            registration_id: registration.id,
            team_contribution: true,
          } as any,
        })
    ).error;

    if (shouldFallbackPlayerPaymentTotalAmount(insertError)) {
      insertError = (
        await supabase
          .from('player_payments')
          .insert({
            player_id: input.playerId,
            season_fee_id: seasonFee.id,
            team_id: teamId,
            league_id: registration.league_id,
            season_id: input.seasonId,
            payment_plan: 'full',
            base_amount_cents: input.targetAmountCents,
            discount_cents: 0,
            late_fee_cents: 0,
            installment_fee_cents: 0,
            amount_paid_cents: registration.amount_paid_cents || 0,
            currency: registration.currency || seasonFee.currency,
            status: paymentStatus as any,
            total_installments: 1,
            current_installment:
              paymentStatus === 'paid' ? 1 : (registration.amount_paid_cents || 0) > 0 ? 1 : 0,
            paid_at:
              paymentStatus === 'paid' ? new Date().toISOString() : null,
            metadata: {
              registration_id: registration.id,
              team_contribution: true,
            } as any,
          })
      ).error;
    }

    if (insertError) {
      console.error('[CaptainPayments] insert contribution player payment error:', insertError);
      return { success: false, error: 'Failed to sync the player contribution target.' };
    }
  }

  const invoiceSummary = await recalculateCaptainTeamInvoice(supabase, {
    leagueId: registration.league_id,
    seasonId: input.seasonId,
    teamId,
    updatedBy: auth.userId,
  });

  return {
    success: true,
    data: invoiceSummary
      ? {
          paymentStatus: invoiceSummary.paymentStatus,
          amountPaidCents: invoiceSummary.amountPaidCents,
          amountOutstandingCents: invoiceSummary.amountOutstandingCents,
        }
      : {
          paymentStatus: registrationPaymentStatus,
          amountPaidCents: registration.amount_paid_cents || 0,
          amountOutstandingCents: Math.max(
            0,
            input.targetAmountCents - (registration.amount_paid_cents || 0)
          ),
        },
  };
}

export async function recordCaptainTeamInvoicePayment(
  teamId: string,
  invoiceId: string,
  payment: CaptainManualPaymentInput
): Promise<{ success: boolean; data?: CaptainTeamInvoiceSummary; error?: string }> {
  const auth = await verifyCaptainRole(teamId);
  if (!auth.authorized || !auth.userId) {
    return { success: false, error: auth.error || 'Not authorized.' };
  }

  if (payment.amountCents <= 0) {
    return { success: false, error: 'Enter a valid payment amount.' };
  }

  const supabase = createServiceRoleClient();

  const { data: invoice, error: invoiceError } = await (supabase as any)
    .from('team_invoices')
    .select('id, team_id, league_id, season_id, total_amount_cents, amount_paid_cents, status, fee_basis')
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: 'Team invoice not found.' };
  }

  if (invoice.team_id !== teamId) {
    return { success: false, error: 'This invoice does not belong to your team.' };
  }

  const outstandingCents = Math.max(0, invoice.total_amount_cents - invoice.amount_paid_cents);
  if (outstandingCents <= 0) {
    return { success: false, error: 'This invoice is already fully paid.' };
  }

  if (payment.amountCents > outstandingCents) {
    return {
      success: false,
      error: `Payment exceeds the remaining balance of $${(outstandingCents / 100).toFixed(2)}.`,
    };
  }

  const { error: paymentInsertError } = await (supabase as any)
    .from('team_invoice_payments')
    .insert({
      team_invoice_id: invoiceId,
      amount_cents: payment.amountCents,
      payment_method: payment.paymentMethod,
      reference_number: payment.referenceNumber || null,
      recorded_by: auth.userId,
      notes: payment.notes || null,
    });

  if (paymentInsertError) {
    console.error('[CaptainPayments] recordCaptainTeamInvoicePayment insert error:', paymentInsertError);
    return { success: false, error: 'Failed to record team invoice payment.' };
  }

  const { data: payments, error: sumError } = await (supabase as any)
    .from('team_invoice_payments')
    .select('amount_cents')
    .eq('team_invoice_id', invoiceId);

  if (sumError) {
    console.error('[CaptainPayments] recordCaptainTeamInvoicePayment sum error:', sumError);
    return { success: false, error: 'Payment was saved, but the invoice could not be refreshed.' };
  }

  const invoicePaymentTotal = (payments || []).reduce(
    (sum: number, row: { amount_cents: number }) => sum + (row.amount_cents || 0),
    0
  );

  const invoiceSummary = await recalculateCaptainTeamInvoice(supabase, {
    leagueId: invoice.league_id,
    seasonId: invoice.season_id,
    teamId,
    updatedBy: auth.userId,
  });

  return {
    success: true,
    data: invoiceSummary
      ? {
          paymentStatus: invoiceSummary.paymentStatus,
          amountPaidCents: invoiceSummary.amountPaidCents,
          amountOutstandingCents: invoiceSummary.amountOutstandingCents,
        }
      : {
          paymentStatus: invoice.status,
          amountPaidCents: invoice.amount_paid_cents,
          amountOutstandingCents: Math.max(
            0,
            invoice.total_amount_cents - invoice.amount_paid_cents
          ),
        },
  };
}

// ============================================================================
// Email Template Helper
// ============================================================================

function buildReminderEmailHtml(params: {
  playerName: string;
  leagueName: string;
  feeName: string;
  amountDue: number;
  dueDate: string | null;
  paymentUrl: string;
  reminderNumber: number;
  isUrgent: boolean;
}): string {
  const { playerName, leagueName, feeName, amountDue, dueDate, paymentUrl, reminderNumber, isUrgent } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #a3a3a3; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #070A0F; }
    .container { background-color: #0f172a; border-radius: 8px; padding: 40px; border: 1px solid rgba(255,255,255,0.10); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1e293b; }
    .logo { font-size: 24px; font-weight: bold; color: #fafafa; }
    h1 { color: #fafafa; }
    .payment-details { background-color: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin: 20px 0; }
    .payment-details table { width: 100%; border-collapse: collapse; }
    .payment-details td { padding: 8px 0; }
    .label { color: #a3a3a3; }
    .value { text-align: right; font-weight: bold; color: #fafafa; }
    .amount-due { font-size: 24px; color: #22D3EE; }
    .highlight { background-color: rgba(34,211,238,0.1); padding: 15px; border-left: 4px solid #22D3EE; margin: 20px 0; }
    .warning { background-color: rgba(251,113,133,0.1); padding: 15px; border-left: 4px solid #FB7185; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(to right, #22D3EE, #3B82F6); color: #070A0F; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #404040; }
    .footer a { color: #22D3EE; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">Beer League Hockey</div></div>
    <div>
      <h1>Payment Reminder${isUrgent ? ' - Action Required' : ''}</h1>
      <p>Hi ${playerName},</p>
      <p>This is a friendly reminder that you have an outstanding payment for <strong>${leagueName}</strong>.</p>
      <div class="payment-details">
        <table>
          <tr><td class="label">Fee</td><td class="value">${feeName}</td></tr>
          <tr><td class="label">Amount Due</td><td class="value amount-due">$${(amountDue / 100).toFixed(2)}</td></tr>
          ${dueDate ? `<tr><td class="label">Due Date</td><td class="value">${new Date(dueDate).toLocaleDateString()}</td></tr>` : ''}
        </table>
      </div>
      ${
        isUrgent
          ? `<div class="warning"><p><strong>Important:</strong> This is reminder #${reminderNumber}. Please complete your payment as soon as possible.</p></div>`
          : `<div class="highlight"><p>Please complete your payment at your earliest convenience.</p></div>`
      }
      <a href="${paymentUrl}" class="button">Pay Now</a>
      <p>If you've already made this payment, please disregard this reminder.</p>
      <p>Best regards,<br>The ${leagueName} Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Beer League Hockey. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`.trim();
}
