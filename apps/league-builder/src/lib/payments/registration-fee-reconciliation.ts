import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getPlayerRegistrationFeeAmount,
  getSeasonPaymentSettings,
} from '@/lib/payments/fee-collection-model';
import type { Json } from '@hockey-life/database';
import type { Database } from '@hockey-life/database/types';

type RegistrationPaymentStatus =
  | 'pending'
  | 'completed'
  | 'partial'
  | 'refunded'
  | 'failed'
  | 'not_required'
  | null;

type ReconciledRegistrationRow = {
  id: string;
  player_id: string;
  league_id: string;
  season_id: string;
  team_id: string | null;
  assigned_team_id: string | null;
  payment_status: RegistrationPaymentStatus;
  fee_amount_cents: number | null;
  amount_paid_cents: number | null;
  currency: string | null;
  status: string;
  submitted_at: string | null;
  draft_data: Json | null;
};

function mapRegistrationPaymentStatus(
  currentStatus: RegistrationPaymentStatus,
  expectedFeeCents: number,
  amountPaidCents: number
): Exclude<RegistrationPaymentStatus, null> {
  if (currentStatus === 'refunded') return 'refunded';
  if (currentStatus === 'failed') return 'failed';
  if (expectedFeeCents <= 0) return 'not_required';
  if (amountPaidCents >= expectedFeeCents) return 'completed';
  if (amountPaidCents > 0) return 'partial';
  return 'pending';
}

function mapPlayerPaymentStatus(
  registrationPaymentStatus: Exclude<RegistrationPaymentStatus, null>
):
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'refunded'
  | 'failed' {
  switch (registrationPaymentStatus) {
    case 'completed':
      return 'paid';
    case 'partial':
      return 'partially_paid';
    case 'refunded':
      return 'refunded';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

export interface ReconcileSeasonRegistrationFeesResult {
  updatedRegistrations: number;
  syncedPlayerPayments: number;
}

type PlayerPaymentInsert = Database['public']['Tables']['player_payments']['Insert'];

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

export async function reconcileSeasonRegistrationFees(
  leagueId: string,
  seasonId: string,
  options?: { registrationId?: string | null }
): Promise<ReconcileSeasonRegistrationFeesResult> {
  const supabase = createServiceRoleClient();
  const paymentSettings = await getSeasonPaymentSettings(supabase as any, leagueId, seasonId);
  const expectedFeeCents = getPlayerRegistrationFeeAmount(
    paymentSettings.feeBasis,
    paymentSettings.feeAmountCents
  );

  const seasonFeeQuery = await supabase
    .from('season_fees')
    .select('id, amount_cents, currency')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const seasonFee = seasonFeeQuery.data;

  let registrationQuery = supabase
    .from('registration_submissions')
    .select(
      'id, player_id, league_id, season_id, team_id, assigned_team_id, payment_status, fee_amount_cents, amount_paid_cents, currency, status, submitted_at, draft_data'
    )
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .not('submitted_at', 'is', null)
    .in('status', ['pending', 'approved', 'waitlisted']);

  if (options?.registrationId) {
    registrationQuery = registrationQuery.eq('id', options.registrationId);
  }

  const { data: registrations, error: registrationError } = await registrationQuery;
  if (registrationError) {
    throw registrationError;
  }

  const rows = (registrations || []) as ReconciledRegistrationRow[];
  if (rows.length === 0) {
    return { updatedRegistrations: 0, syncedPlayerPayments: 0 };
  }

  const paymentPlayerIds = [...new Set(rows.map((row) => row.player_id))];
  const existingPaymentsByPlayer = new Map<string, any>();

  if (seasonFee?.id && paymentPlayerIds.length > 0) {
    const { data: existingPayments } = await supabase
      .from('player_payments')
      .select(
        'id, player_id, notes, metadata, total_installments, current_installment, amount_paid_cents'
      )
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('season_fee_id', seasonFee.id)
      .in('player_id', paymentPlayerIds);

    for (const payment of existingPayments || []) {
      if (!existingPaymentsByPlayer.has(payment.player_id)) {
        existingPaymentsByPlayer.set(payment.player_id, payment);
      }
    }
  }

  let updatedRegistrations = 0;
  let syncedPlayerPayments = 0;

  for (const registration of rows) {
    const amountPaidCents = registration.amount_paid_cents || 0;
    const nextPaymentStatus = mapRegistrationPaymentStatus(
      registration.payment_status,
      expectedFeeCents,
      amountPaidCents
    );
    const nextCurrency = paymentSettings.currency || registration.currency || 'cad';
    const needsRegistrationUpdate =
      (registration.fee_amount_cents || 0) !== expectedFeeCents ||
      (registration.currency || '').toLowerCase() !== nextCurrency.toLowerCase() ||
      registration.payment_status !== nextPaymentStatus;

    if (needsRegistrationUpdate) {
      const existingDraftData =
        registration.draft_data && typeof registration.draft_data === 'object'
          ? (registration.draft_data as Record<string, unknown>)
          : {};
      const auditLog = Array.isArray(existingDraftData.admin_payment_events)
        ? [...existingDraftData.admin_payment_events]
        : [];

      auditLog.push({
        type: 'season_fee_reconciled',
        at: new Date().toISOString(),
        expected_fee_cents: expectedFeeCents,
        previous_fee_cents: registration.fee_amount_cents || 0,
        previous_payment_status: registration.payment_status,
        next_payment_status: nextPaymentStatus,
      });

      const { error: updateError } = await supabase
        .from('registration_submissions')
        .update({
          fee_amount_cents: expectedFeeCents,
          currency: nextCurrency,
          payment_status: nextPaymentStatus,
          draft_data: {
            ...existingDraftData,
            admin_payment_events: auditLog,
          } as Json,
        })
        .eq('id', registration.id);

      if (updateError) {
        throw updateError;
      }

      updatedRegistrations += 1;
    }

    if (!seasonFee || expectedFeeCents <= 0) {
      continue;
    }

    const existingPayment = existingPaymentsByPlayer.get(registration.player_id);
    const playerPaymentStatus = mapPlayerPaymentStatus(nextPaymentStatus);
    const teamId = registration.assigned_team_id || registration.team_id || null;

    if (existingPayment) {
      const updatePayload = {
        team_id: teamId,
        base_amount_cents: expectedFeeCents,
        total_amount_cents: expectedFeeCents,
        amount_paid_cents: amountPaidCents,
        currency: nextCurrency,
        status: playerPaymentStatus,
        current_installment: playerPaymentStatus === 'paid' ? 1 : 0,
        paid_at:
          playerPaymentStatus === 'paid' ? new Date().toISOString() : null,
        metadata: {
          ...(existingPayment.metadata &&
          typeof existingPayment.metadata === 'object'
            ? existingPayment.metadata
            : {}),
          registration_id: registration.id,
          synced_from_registration: true,
        } as Json,
      };

      let paymentUpdateError = (
        await supabase
          .from('player_payments')
          .update(updatePayload)
          .eq('id', existingPayment.id)
      ).error;

      if (shouldFallbackPlayerPaymentTotalAmount(paymentUpdateError)) {
        const fallbackPayload = { ...updatePayload };
        delete (fallbackPayload as Record<string, unknown>).total_amount_cents;

        paymentUpdateError = (
          await supabase
            .from('player_payments')
            .update(fallbackPayload)
            .eq('id', existingPayment.id)
        ).error;
      }

      if (paymentUpdateError) {
        throw paymentUpdateError;
      }
    } else {
      const insertPayload: PlayerPaymentInsert = {
        player_id: registration.player_id,
        season_fee_id: seasonFee.id,
        team_id: teamId,
        league_id: leagueId,
        season_id: seasonId,
        payment_plan: 'full',
        base_amount_cents: expectedFeeCents,
        total_amount_cents: expectedFeeCents,
        discount_cents: 0,
        late_fee_cents: 0,
        installment_fee_cents: 0,
        amount_paid_cents: amountPaidCents,
        currency: nextCurrency,
        status: playerPaymentStatus,
        total_installments: 1,
        current_installment: playerPaymentStatus === 'paid' ? 1 : 0,
        paid_at:
          playerPaymentStatus === 'paid' ? new Date().toISOString() : null,
        metadata: {
          registration_id: registration.id,
          synced_from_registration: true,
        } as Json,
      };

      let paymentInsertError = (
        await supabase.from('player_payments').insert(insertPayload)
      ).error;

      if (shouldFallbackPlayerPaymentTotalAmount(paymentInsertError)) {
        const fallbackPayload = { ...insertPayload };
        delete (fallbackPayload as Record<string, unknown>).total_amount_cents;
        paymentInsertError = (
          await supabase.from('player_payments').insert(fallbackPayload)
        ).error;
      }

      if (paymentInsertError) {
        throw paymentInsertError;
      }
    }

    syncedPlayerPayments += 1;
  }

  return {
    updatedRegistrations,
    syncedPlayerPayments,
  };
}
