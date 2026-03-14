import type { Json } from '@hockey-life/database';
import type { SupabaseClient } from '@supabase/supabase-js';

type DbClient = SupabaseClient<any>;

type RegistrationRow = {
  id: string;
  player_id: string;
  league_id: string;
  season_id: string;
  team_id: string | null;
  assigned_team_id: string | null;
  payment_status: string | null;
  fee_amount_cents: number | null;
  amount_paid_cents: number | null;
  currency: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string | null;
  draft_data: Json | null;
};

type ExistingPlayerPayment = {
  id: string;
  player_id: string;
  notes: string | null;
  metadata: Json | null;
  total_installments: number | null;
  current_installment: number | null;
  amount_paid_cents: number | null;
};

export interface TeamContributionSeasonFee {
  id: string;
  amountCents: number;
  currency: string;
  feeBasis: 'player' | 'team';
  defaultPlayerContributionCents: number;
}

export interface TeamInvoiceContributionSummary {
  invoiceId: string | null;
  teamId: string;
  totalPlayers: number;
  totalAmountCents: number;
  amountPaidCents: number;
  playerTargetTotalCents: number;
  playerPaidCents: number;
  teamPaymentTotalCents: number;
  unallocatedTargetCents: number;
  status: string;
}

function normalizeFeeBasis(value: string | null | undefined): 'player' | 'team' {
  return value === 'team' ? 'team' : 'player';
}

function normalizeJsonObject(value: Json | null): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function getRegistrationBillingTeamId(registration: {
  assigned_team_id?: string | null;
  team_id?: string | null;
}) {
  return registration.assigned_team_id || registration.team_id || null;
}

export function buildRegistrationPaymentStatus(
  feeAmountCents: number,
  amountPaidCents: number,
  currentStatus: string | null
) {
  if (currentStatus === 'refunded') return 'refunded';
  if (currentStatus === 'failed') return 'failed';
  if (feeAmountCents <= 0) return 'not_required';
  if (amountPaidCents >= feeAmountCents) return 'completed';
  if (amountPaidCents > 0) return 'partial';
  return 'pending';
}

function mapPlayerPaymentStatus(
  registrationPaymentStatus: string
): 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed' | 'cancelled' {
  switch (registrationPaymentStatus) {
    case 'completed':
      return 'paid';
    case 'partial':
      return 'partially_paid';
    case 'refunded':
      return 'refunded';
    case 'failed':
      return 'failed';
    case 'not_required':
      return 'cancelled';
    default:
      return 'pending';
  }
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

export async function getActiveSeasonFeeWithContribution(
  supabase: DbClient,
  leagueId: string,
  seasonId: string
): Promise<TeamContributionSeasonFee | null> {
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

    if (fallbackQuery.error || !fallbackQuery.data) {
      return null;
    }

    return {
      id: fallbackQuery.data.id,
      amountCents: fallbackQuery.data.amount_cents,
      currency: fallbackQuery.data.currency ?? 'cad',
      feeBasis: 'player',
      defaultPlayerContributionCents: 0,
    };
  }

  if (feeQuery.error || !feeQuery.data) {
    return null;
  }

  return {
    id: feeQuery.data.id,
    amountCents: feeQuery.data.amount_cents,
    currency: feeQuery.data.currency ?? 'cad',
    feeBasis: normalizeFeeBasis(feeQuery.data.fee_basis),
    defaultPlayerContributionCents:
      feeQuery.data.default_player_contribution_cents ?? 0,
  };
}

async function upsertPlayerPaymentFromRegistration(
  supabase: DbClient,
  seasonFee: TeamContributionSeasonFee,
  registration: RegistrationRow,
  existingPayment: ExistingPlayerPayment | null,
  teamId: string | null
) {
  const totalAmountCents = Math.max(
    registration.amount_paid_cents || 0,
    registration.fee_amount_cents || 0
  );
  const paymentStatus = mapPlayerPaymentStatus(
    buildRegistrationPaymentStatus(
      totalAmountCents,
      registration.amount_paid_cents || 0,
      registration.payment_status
    )
  );
  const metadata = {
    ...(existingPayment?.metadata && typeof existingPayment.metadata === 'object'
      ? (existingPayment.metadata as Record<string, unknown>)
      : {}),
    registration_id: registration.id,
    synced_from_registration: true,
    team_contribution: seasonFee.feeBasis === 'team',
  } as Json;

  if (existingPayment) {
    const updatePayload = {
      team_id: teamId,
      base_amount_cents: totalAmountCents,
      total_amount_cents: totalAmountCents,
      amount_paid_cents: registration.amount_paid_cents || 0,
      currency: registration.currency || seasonFee.currency,
      status: paymentStatus,
      current_installment:
        paymentStatus === 'paid'
          ? existingPayment.total_installments || 1
          : Math.max(
              existingPayment.current_installment || 0,
              (registration.amount_paid_cents || 0) > 0 ? 1 : 0
            ),
      paid_at:
        paymentStatus === 'paid' ? new Date().toISOString() : null,
      metadata,
    };

    let updateError = (
      await (supabase as any)
        .from('player_payments')
        .update(updatePayload)
        .eq('id', existingPayment.id)
    ).error;

    if (shouldFallbackPlayerPaymentTotalAmount(updateError)) {
      const fallbackPayload = { ...updatePayload };
      delete (fallbackPayload as Record<string, unknown>).total_amount_cents;
      updateError = (
        await (supabase as any)
          .from('player_payments')
          .update(fallbackPayload)
          .eq('id', existingPayment.id)
      ).error;
    }

    if (updateError) {
      throw updateError;
    }

    return;
  }

  if (totalAmountCents <= 0 && (registration.amount_paid_cents || 0) <= 0) {
    return;
  }

  const insertPayload = {
    player_id: registration.player_id,
    season_fee_id: seasonFee.id,
    team_id: teamId,
    league_id: registration.league_id,
    season_id: registration.season_id,
    payment_plan: 'full',
    base_amount_cents: totalAmountCents,
    discount_cents: 0,
    late_fee_cents: 0,
    installment_fee_cents: 0,
    total_amount_cents: totalAmountCents,
    amount_paid_cents: registration.amount_paid_cents || 0,
    currency: registration.currency || seasonFee.currency,
    status: paymentStatus,
    total_installments: 1,
    current_installment:
      paymentStatus === 'paid' ? 1 : (registration.amount_paid_cents || 0) > 0 ? 1 : 0,
    paid_at:
      paymentStatus === 'paid' ? new Date().toISOString() : null,
    metadata,
  };

  let insertError = (await (supabase as any).from('player_payments').insert(insertPayload)).error;

  if (shouldFallbackPlayerPaymentTotalAmount(insertError)) {
    const fallbackPayload = { ...insertPayload };
    delete (fallbackPayload as Record<string, unknown>).total_amount_cents;
    insertError = (await (supabase as any).from('player_payments').insert(fallbackPayload)).error;
  }

  if (insertError) {
    throw insertError;
  }
}

export async function recalculateTeamInvoiceForTeam(
  supabase: DbClient,
  params: {
    leagueId: string;
    seasonId: string;
    teamId: string;
    seasonFee?: TeamContributionSeasonFee | null;
    updatedBy?: string | null;
  }
): Promise<TeamInvoiceContributionSummary | null> {
  const seasonFee =
    params.seasonFee ||
    (await getActiveSeasonFeeWithContribution(
      supabase,
      params.leagueId,
      params.seasonId
    ));

  if (!seasonFee) {
    return null;
  }

  const { data: existingInvoice } = await (supabase as any)
    .from('team_invoices')
    .select('id, payment_deadline, notes, paid_by, paid_at')
    .eq('league_id', params.leagueId)
    .eq('season_id', params.seasonId)
    .eq('team_id', params.teamId)
    .maybeSingle();

  const { data: registrations, error: registrationError } = await supabase
    .from('registration_submissions')
    .select(
      'id, fee_amount_cents, amount_paid_cents, payment_status, assigned_team_id, team_id, submitted_at, status'
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
    (registration: any) => getRegistrationBillingTeamId(registration) === params.teamId
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
  if (existingInvoice?.id) {
    const { data: invoicePayments } = await (supabase as any)
      .from('team_invoice_payments')
      .select('amount_cents')
      .eq('team_invoice_id', existingInvoice.id);

    teamPaymentTotalCents = (invoicePayments || []).reduce(
      (sum: number, payment: { amount_cents: number | null }) =>
        sum + Math.max(0, payment.amount_cents || 0),
      0
    );
  }

  const totalAmountCents =
    seasonFee.feeBasis === 'team'
      ? seasonFee.amountCents
      : playerTargetTotalCents;
  const amountPaidCents = Math.max(0, teamPaymentTotalCents + playerPaidCents);
  const status =
    totalAmountCents === 0
      ? 'waived'
      : amountPaidCents >= totalAmountCents
        ? 'paid'
        : amountPaidCents > 0
          ? 'partial'
          : 'pending';

  const invoicePayload = {
    team_id: params.teamId,
    season_id: params.seasonId,
    league_id: params.leagueId,
    total_players: teamRegistrations.length,
    fee_basis: seasonFee.feeBasis,
    fee_per_player_cents: seasonFee.feeBasis === 'team' ? 0 : seasonFee.amountCents,
    total_amount_cents: totalAmountCents,
    amount_paid_cents: amountPaidCents,
    currency: seasonFee.currency,
    status,
    payment_deadline: existingInvoice?.payment_deadline ?? null,
    notes: existingInvoice?.notes ?? null,
    paid_by:
      status === 'paid'
        ? existingInvoice?.paid_by ?? params.updatedBy ?? null
        : null,
    paid_at:
      status === 'paid'
        ? existingInvoice?.paid_at ?? new Date().toISOString()
        : null,
    updated_at: new Date().toISOString(),
  };

  let invoiceId = existingInvoice?.id || null;
  let writeError = existingInvoice?.id
    ? (
        await (supabase as any)
          .from('team_invoices')
          .update(invoicePayload)
          .eq('id', existingInvoice.id)
      ).error
    : (
        await (supabase as any)
          .from('team_invoices')
          .insert(invoicePayload)
          .select('id')
          .single()
      ).error;

  if (
    writeError &&
    (writeError.code === '42703' ||
      writeError.message?.includes('fee_basis') ||
      writeError.message?.includes('generated column') ||
      writeError.message?.includes('cannot insert a non-DEFAULT value into column \"total_amount_cents\"') ||
      writeError.message?.includes('cannot update generated column'))
  ) {
    const fallbackPayload = { ...invoicePayload };
    delete (fallbackPayload as Record<string, unknown>).fee_basis;
    delete (fallbackPayload as Record<string, unknown>).total_amount_cents;

    const fallbackResult = existingInvoice?.id
      ? await (supabase as any)
          .from('team_invoices')
          .update(fallbackPayload)
          .eq('id', existingInvoice.id)
      : await (supabase as any)
          .from('team_invoices')
          .insert(fallbackPayload)
          .select('id')
          .single();

    writeError = fallbackResult.error;
    if (!existingInvoice?.id) {
      invoiceId = fallbackResult.data?.id || null;
    }
  }

  if (writeError) {
    throw writeError;
  }

  if (!existingInvoice?.id) {
    const { data: insertedInvoice } = await (supabase as any)
      .from('team_invoices')
      .select('id')
      .eq('league_id', params.leagueId)
      .eq('season_id', params.seasonId)
      .eq('team_id', params.teamId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    invoiceId = insertedInvoice?.id || invoiceId;
  }

  return {
    invoiceId,
    teamId: params.teamId,
    totalPlayers: teamRegistrations.length,
    totalAmountCents,
    amountPaidCents,
    playerTargetTotalCents,
    playerPaidCents,
    teamPaymentTotalCents,
    unallocatedTargetCents: Math.max(
      0,
      totalAmountCents - teamPaymentTotalCents - playerTargetTotalCents
    ),
    status,
  };
}

export async function syncFlatTeamContributionTargets(
  supabase: DbClient,
  params: {
    leagueId: string;
    seasonId: string;
    registrationId?: string | null;
    teamIds?: string[];
  }
) {
  const seasonFee = await getActiveSeasonFeeWithContribution(
    supabase,
    params.leagueId,
    params.seasonId
  );

  if (!seasonFee || seasonFee.feeBasis !== 'team') {
    return { updatedRegistrations: 0, syncedPlayerPayments: 0 };
  }

  let registrationQuery = supabase
    .from('registration_submissions')
    .select(
      'id, player_id, league_id, season_id, team_id, assigned_team_id, payment_status, fee_amount_cents, amount_paid_cents, currency, status, submitted_at, created_at, draft_data'
    )
    .eq('league_id', params.leagueId)
    .eq('season_id', params.seasonId)
    .not('submitted_at', 'is', null)
    .in('status', ['pending', 'approved', 'waitlisted']);

  if (params.registrationId) {
    registrationQuery = registrationQuery.eq('id', params.registrationId);
  }

  const { data: registrations, error: registrationError } = await registrationQuery;
  if (registrationError) {
    throw registrationError;
  }

  const rows = (registrations || []) as RegistrationRow[];
  if (rows.length === 0) {
    return { updatedRegistrations: 0, syncedPlayerPayments: 0 };
  }

  const registrationPlayerIds = [...new Set(rows.map((row) => row.player_id))];
  const existingPaymentsByPlayer = new Map<string, ExistingPlayerPayment>();

  const { data: existingPayments } = await supabase
    .from('player_payments')
    .select(
      'id, player_id, notes, metadata, total_installments, current_installment, amount_paid_cents'
    )
    .eq('league_id', params.leagueId)
    .eq('season_id', params.seasonId)
    .eq('season_fee_id', seasonFee.id)
    .in('player_id', registrationPlayerIds);

  for (const payment of existingPayments || []) {
    if (!existingPaymentsByPlayer.has(payment.player_id)) {
      existingPaymentsByPlayer.set(payment.player_id, payment as ExistingPlayerPayment);
    }
  }

  const teamIds = [
    ...new Set(
      rows
        .map((row) => getRegistrationBillingTeamId(row))
        .filter((value): value is string => Boolean(value))
        .filter((value) =>
          !params.teamIds || params.teamIds.length === 0 ? true : params.teamIds.includes(value)
        )
    ),
  ];

  const { data: existingInvoices } = teamIds.length
    ? await (supabase as any)
        .from('team_invoices')
        .select('id, team_id')
        .eq('league_id', params.leagueId)
        .eq('season_id', params.seasonId)
        .in('team_id', teamIds)
    : { data: [] as Array<{ id: string; team_id: string }> };

  const invoiceIds = (existingInvoices || []).map((invoice: any) => invoice.id);
  const invoiceByTeamId = new Map<string, string>(
    (existingInvoices || []).map((invoice: any) => [invoice.team_id, invoice.id])
  );
  const teamInvoicePayments = new Map<string, number>();

  if (invoiceIds.length > 0) {
    const { data: invoicePayments } = await (supabase as any)
      .from('team_invoice_payments')
      .select('team_invoice_id, amount_cents')
      .in('team_invoice_id', invoiceIds);

    for (const payment of invoicePayments || []) {
      const current = teamInvoicePayments.get(payment.team_invoice_id) || 0;
      teamInvoicePayments.set(
        payment.team_invoice_id,
        current + Math.max(0, payment.amount_cents || 0)
      );
    }
  }

  let updatedRegistrations = 0;
  let syncedPlayerPayments = 0;

  const processRows = (teamRows: RegistrationRow[], teamId: string | null) => {
    const invoicePaymentTotal =
      teamId && invoiceByTeamId.has(teamId)
        ? teamInvoicePayments.get(invoiceByTeamId.get(teamId)!) || 0
        : 0;
    let remainingTargetCapacity = Math.max(0, seasonFee.amountCents - invoicePaymentTotal);

    const orderedRows = [...teamRows].sort((left, right) => {
      const leftDraft = normalizeJsonObject(left.draft_data);
      const rightDraft = normalizeJsonObject(right.draft_data);
      const leftPriority =
        (left.amount_paid_cents || 0) > 0
          ? 0
          : leftDraft.team_contribution_customized === true
            ? 1
            : (left.fee_amount_cents || 0) > 0
              ? 2
              : 3;
      const rightPriority =
        (right.amount_paid_cents || 0) > 0
          ? 0
          : rightDraft.team_contribution_customized === true
            ? 1
            : (right.fee_amount_cents || 0) > 0
              ? 2
              : 3;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(left.created_at || left.submitted_at || 0).getTime() -
        new Date(right.created_at || right.submitted_at || 0).getTime();
    });

    return orderedRows.map((registration) => {
      const draftData = normalizeJsonObject(registration.draft_data);
      const currentTarget = Math.max(0, registration.fee_amount_cents || 0);
      const amountPaid = Math.max(0, registration.amount_paid_cents || 0);
      const desiredTarget =
        currentTarget > 0
          ? currentTarget
          : Math.max(0, seasonFee.defaultPlayerContributionCents);
      const nextTarget = teamId
        ? Math.max(
            amountPaid,
            Math.min(
              desiredTarget,
              Math.max(0, remainingTargetCapacity)
            )
          )
        : 0;

      if (teamId) {
        remainingTargetCapacity = Math.max(0, remainingTargetCapacity - nextTarget);
      }

      return {
        registration,
        teamId,
        draftData,
        nextTarget,
      };
    });
  };

  const groupedRows = new Map<string, RegistrationRow[]>();
  const unassignedRows: RegistrationRow[] = [];

  for (const row of rows) {
    const teamId = getRegistrationBillingTeamId(row);
    if (!teamId) {
      unassignedRows.push(row);
      continue;
    }

    if (!groupedRows.has(teamId)) {
      groupedRows.set(teamId, []);
    }
    groupedRows.get(teamId)!.push(row);
  }

  const plannedUpdates = [
    ...Array.from(groupedRows.entries()).flatMap(([teamId, teamRows]) =>
      processRows(teamRows, teamId)
    ),
    ...processRows(unassignedRows, null),
  ];

  for (const plan of plannedUpdates) {
    const amountPaid = Math.max(0, plan.registration.amount_paid_cents || 0);
    const nextPaymentStatus = buildRegistrationPaymentStatus(
      plan.nextTarget,
      amountPaid,
      plan.registration.payment_status
    );
    const nextCurrency = plan.registration.currency || seasonFee.currency;
    const needsRegistrationUpdate =
      (plan.registration.fee_amount_cents || 0) !== plan.nextTarget ||
      (plan.registration.currency || '').toLowerCase() !== nextCurrency.toLowerCase() ||
      plan.registration.payment_status !== nextPaymentStatus;

    if (needsRegistrationUpdate) {
      const { error: updateError } = await supabase
        .from('registration_submissions')
        .update({
          fee_amount_cents: plan.nextTarget,
          currency: nextCurrency,
          payment_status: nextPaymentStatus,
          draft_data: {
            ...plan.draftData,
            team_contribution_target_cents: plan.nextTarget,
            team_contribution_last_synced_at: new Date().toISOString(),
            team_contribution_customized:
              plan.draftData.team_contribution_customized === true,
          } as Json,
        })
        .eq('id', plan.registration.id);

      if (updateError) {
        throw updateError;
      }

      updatedRegistrations += 1;
      plan.registration.fee_amount_cents = plan.nextTarget;
      plan.registration.payment_status = nextPaymentStatus;
      plan.registration.currency = nextCurrency;
    }

    const existingPayment = existingPaymentsByPlayer.get(plan.registration.player_id) || null;
    await upsertPlayerPaymentFromRegistration(
      supabase,
      seasonFee,
      {
        ...plan.registration,
        fee_amount_cents: plan.nextTarget,
        payment_status: nextPaymentStatus,
        currency: nextCurrency,
        assigned_team_id: plan.teamId,
      },
      existingPayment,
      plan.teamId
    );
    syncedPlayerPayments += 1;
  }

  return { updatedRegistrations, syncedPlayerPayments };
}

export async function updateFlatTeamContributionTarget(
  supabase: DbClient,
  params: {
    registrationId: string;
    targetAmountCents: number;
  }
) {
  const { data: registration, error: registrationError } = await supabase
    .from('registration_submissions')
    .select(
      'id, player_id, league_id, season_id, team_id, assigned_team_id, payment_status, fee_amount_cents, amount_paid_cents, currency, status, submitted_at, created_at, draft_data'
    )
    .eq('id', params.registrationId)
    .single();

  if (registrationError || !registration) {
    throw registrationError || new Error('Registration not found');
  }

  const seasonFee = await getActiveSeasonFeeWithContribution(
    supabase,
    registration.league_id,
    registration.season_id
  );

  if (!seasonFee || seasonFee.feeBasis !== 'team') {
    throw new Error('This season is not using a flat team fee.');
  }

  const teamId = getRegistrationBillingTeamId(registration);
  if (!teamId) {
    throw new Error('Assign the player to a team before setting a contribution target.');
  }

  const minAllowedTarget = Math.max(0, registration.amount_paid_cents || 0);
  if (params.targetAmountCents < minAllowedTarget) {
    throw new Error(
      `Contribution target cannot be lower than the amount already paid ($${(
        minAllowedTarget / 100
      ).toFixed(2)}).`
    );
  }

  const { data: existingInvoice } = await (supabase as any)
    .from('team_invoices')
    .select('id')
    .eq('league_id', registration.league_id)
    .eq('season_id', registration.season_id)
    .eq('team_id', teamId)
    .maybeSingle();

  let teamPaymentTotalCents = 0;
  if (existingInvoice?.id) {
    const { data: invoicePayments } = await (supabase as any)
      .from('team_invoice_payments')
      .select('amount_cents')
      .eq('team_invoice_id', existingInvoice.id);

    teamPaymentTotalCents = (invoicePayments || []).reduce(
      (sum: number, payment: { amount_cents: number | null }) =>
        sum + Math.max(0, payment.amount_cents || 0),
      0
    );
  }

  const { data: siblingRegistrations, error: siblingError } = await supabase
    .from('registration_submissions')
    .select('id, fee_amount_cents')
    .eq('league_id', registration.league_id)
    .eq('season_id', registration.season_id)
    .or(`assigned_team_id.eq.${teamId},team_id.eq.${teamId}`)
    .not('submitted_at', 'is', null)
    .in('status', ['pending', 'approved', 'waitlisted']);

  if (siblingError) {
    throw siblingError;
  }

  const siblingTargetTotal = (siblingRegistrations || [])
    .filter((row: any) => row.id !== params.registrationId)
    .reduce(
      (sum: number, row: { fee_amount_cents: number | null }) =>
        sum + Math.max(0, row.fee_amount_cents || 0),
      0
    );

  const maxAllocatableTarget = Math.max(
    0,
    seasonFee.amountCents - teamPaymentTotalCents - siblingTargetTotal
  );

  if (params.targetAmountCents > maxAllocatableTarget) {
    throw new Error(
      `Contribution target exceeds the remaining unallocated team balance of $${(
        maxAllocatableTarget / 100
      ).toFixed(2)}.`
    );
  }

  const draftData = normalizeJsonObject(registration.draft_data);
  const nextPaymentStatus = buildRegistrationPaymentStatus(
    params.targetAmountCents,
    registration.amount_paid_cents || 0,
    registration.payment_status
  );
  const nextCurrency = registration.currency || seasonFee.currency;

  const { error: updateError } = await supabase
    .from('registration_submissions')
    .update({
      fee_amount_cents: params.targetAmountCents,
      currency: nextCurrency,
      payment_status: nextPaymentStatus,
      draft_data: {
        ...draftData,
        team_contribution_target_cents: params.targetAmountCents,
        team_contribution_customized: true,
        team_contribution_last_synced_at: new Date().toISOString(),
      } as Json,
    })
    .eq('id', params.registrationId);

  if (updateError) {
    throw updateError;
  }

  const { data: existingPayment } = await supabase
    .from('player_payments')
    .select(
      'id, player_id, notes, metadata, total_installments, current_installment, amount_paid_cents'
    )
    .eq('league_id', registration.league_id)
    .eq('season_id', registration.season_id)
    .eq('player_id', registration.player_id)
    .eq('season_fee_id', seasonFee.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await upsertPlayerPaymentFromRegistration(
    supabase,
    seasonFee,
    {
      ...(registration as RegistrationRow),
      fee_amount_cents: params.targetAmountCents,
      payment_status: nextPaymentStatus,
      currency: nextCurrency,
    },
    (existingPayment as ExistingPlayerPayment | null) || null,
    teamId
  );

  return {
    registration: {
      ...registration,
      fee_amount_cents: params.targetAmountCents,
      payment_status: nextPaymentStatus,
      currency: nextCurrency,
    } as RegistrationRow,
    seasonFee,
    teamId,
  };
}
