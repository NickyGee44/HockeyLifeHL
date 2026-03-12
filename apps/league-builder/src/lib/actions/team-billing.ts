'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  getRegistrationPaymentMode,
  getSeasonFeeCollectionModel,
  normalizeFeeBasis,
  type FeeBasis,
} from '@/lib/payments/fee-collection-model';
import { getSeasonParticipationTeams } from '@/lib/seasons/team-participation';
import { revalidatePath } from 'next/cache';

// ==============================================================================
// INPUT VALIDATION HELPERS
// ==============================================================================

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function sanitizeError(error: unknown, context: string): string {
  console.error(`Error in ${context}:`, error);

  if (error instanceof Error) {
    if (error.message.includes('not found') || error.message.includes('PGRST116')) {
      return 'Resource not found';
    }
    if (
      error.message.includes('team_invoices') ||
      error.message.includes('team_invoice_payments') ||
      error.message.includes('fee_collection_model')
    ) {
      return 'Team billing is not available in this environment yet.';
    }
    if (error.message.includes('permission denied') || error.message.includes('row-level security')) {
      return 'Permission denied';
    }
    if (error.message.includes('duplicate')) {
      return 'A resource with this identifier already exists';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

// ==============================================================================
// TYPES
// ==============================================================================

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TeamInvoice {
  id: string;
  team_id: string;
  season_id: string;
  league_id: string;
  total_players: number;
  fee_basis?: FeeBasis;
  fee_per_player_cents: number;
  total_amount_cents: number;
  amount_paid_cents: number;
  currency: string;
  status: string;
  payment_deadline: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_by: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  team?: { id: string; name: string };
}

export interface TeamInvoicePayment {
  id: string;
  team_invoice_id: string;
  amount_cents: number;
  payment_method: string;
  stripe_payment_intent_id: string | null;
  reference_number: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface TeamInvoiceWithPayments extends TeamInvoice {
  team_invoice_payments: TeamInvoicePayment[];
}

export interface TeamBillingSummary {
  total_invoiced_cents: number;
  total_collected_cents: number;
  outstanding_cents: number;
  team_count: number;
  paid_count: number;
  overdue_count: number;
}

interface ExistingTeamInvoiceRecord {
  id: string;
  team_id: string;
  amount_paid_cents: number;
  payment_deadline: string | null;
  notes: string | null;
  paid_by: string | null;
  paid_at: string | null;
  fee_basis?: FeeBasis;
}

interface ActiveSeasonFeeConfig {
  amount_cents: number;
  currency: string;
  fee_basis: FeeBasis;
}

// ==============================================================================
// HELPER: Verify user has admin access to league
// ==============================================================================

async function verifyLeagueAdmin(leagueId: string): Promise<{ userId: string } | null> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const { data: league } = await supabase
    .from('leagues')
    .select('created_by, owner_id')
    .eq('id', leagueId)
    .single();

  const isCreator = league?.created_by === user.id || league?.owner_id === user.id;
  const isAdmin = membership && ['owner', 'admin'].includes(membership.role);

  if (isCreator || isAdmin) {
    return { userId: user.id };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();

  if ((profile as Record<string, unknown>)?.is_platform_admin === true) {
    return { userId: user.id };
  }

  return null;
}

async function verifyTeamLeader(
  teamId: string,
  userId: string
): Promise<boolean> {
  const serviceSupabase = createServiceRoleClient();

  const { data: rosterMembership } = await serviceSupabase
    .from('team_rosters')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('player_id', userId)
    .eq('status', 'active')
    .in('leadership_role', ['captain', 'alternate_captain'])
    .maybeSingle();

  return Boolean(rosterMembership);
}

async function getActiveSeasonFeeConfig(
  supabase: ReturnType<typeof createServiceRoleClient>,
  leagueId: string,
  seasonId: string
): Promise<ActionResult<ActiveSeasonFeeConfig>> {
  const feeWithBasis = await supabase
    .from('season_fees')
    .select('amount_cents, currency, fee_basis')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (
    feeWithBasis.error &&
    (feeWithBasis.error.code === '42703' || feeWithBasis.error.message?.includes('fee_basis'))
  ) {
    const fallbackFee = await supabase
      .from('season_fees')
      .select('amount_cents, currency')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (fallbackFee.error || !fallbackFee.data) {
      return { success: false, error: 'No active season fee found for this season' };
    }

    return {
      success: true,
      data: {
        ...fallbackFee.data,
        fee_basis: 'player',
      },
    };
  }

  if (feeWithBasis.error || !feeWithBasis.data) {
    return { success: false, error: 'No active season fee found for this season' };
  }

  return {
    success: true,
    data: {
      ...feeWithBasis.data,
      fee_basis: normalizeFeeBasis((feeWithBasis.data as any).fee_basis),
    },
  };
}

// ==============================================================================
// 1. GET TEAM INVOICES
// ==============================================================================

export async function getTeamInvoices(
  leagueId: string,
  seasonId?: string
): Promise<ActionResult<TeamInvoice[]>> {
  try {
    if (!isValidUUID(leagueId)) {
      return { success: false, error: 'Invalid league ID format' };
    }

    if (seasonId && !isValidUUID(seasonId)) {
      return { success: false, error: 'Invalid season ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createServiceRoleClient();

    // Build base query — cast to any as team_invoices not in generated types
    const baseQuery = (supabase as any)
      .from('team_invoices')
      .select(`
        *,
        team:teams!team_invoices_team_id_fkey(id, name)
      `)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (seasonId ? (baseQuery as any).eq('season_id', seasonId) : baseQuery);

    if (error) {
      return { success: false, error: sanitizeError(error, 'getTeamInvoices') };
    }

    return { success: true, data: (data || []) as TeamInvoice[] };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'getTeamInvoices') };
  }
}

// ==============================================================================
// 2. GET SINGLE TEAM INVOICE (with payments)
// ==============================================================================

export async function getTeamInvoice(
  invoiceId: string
): Promise<ActionResult<TeamInvoiceWithPayments>> {
  try {
    if (!isValidUUID(invoiceId)) {
      return { success: false, error: 'Invalid invoice ID format' };
    }

    const authSupabase = await createClient();
    const supabase = createServiceRoleClient();

    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: invoice, error } = await (supabase as any)
      .from('team_invoices')
      .select(`
        *,
        team:teams!team_invoices_team_id_fkey(id, name),
        team_invoice_payments(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    // Auth: league owner/admin OR captain of that team
    const adminAuth = await verifyLeagueAdmin(invoice.league_id);

    if (!adminAuth) {
      const hasTeamLeaderAccess = await verifyTeamLeader(invoice.team_id, user.id);
      if (!hasTeamLeaderAccess) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    return { success: true, data: invoice as TeamInvoiceWithPayments };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'getTeamInvoice') };
  }
}

// ==============================================================================
// 3. GENERATE TEAM INVOICES
// ==============================================================================

export async function generateTeamInvoices(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<{ generated: number; skipped: number }>> {
  try {
    if (!isValidUUID(leagueId) || !isValidUUID(seasonId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createServiceRoleClient();

    const seasonFeeResult = await getActiveSeasonFeeConfig(supabase, leagueId, seasonId);
    if (!seasonFeeResult.success) {
      return { success: false, error: seasonFeeResult.error };
    }

    const seasonFee = seasonFeeResult.data;

    const feeCollectionModel = await getSeasonFeeCollectionModel(supabase as any, seasonId);
    const paymentMode = getRegistrationPaymentMode(
      feeCollectionModel,
      seasonFee.amount_cents,
      seasonFee.fee_basis
    );

    if (paymentMode === 'required' && seasonFee.fee_basis !== 'team') {
      return {
        success: false,
        error:
          'Team invoices are only available when the season fee collection model is Team or Hybrid.',
      };
    }

    const teams = await getSeasonParticipationTeams(supabase as any, leagueId, seasonId);

    if (!teams || teams.length === 0) {
      return { success: false, error: 'No teams found for this season' };
    }

    // Get existing invoices to avoid duplicates
    const { data: existingInvoices } = await (supabase as any)
      .from('team_invoices')
      .select(
        'id, team_id, amount_paid_cents, payment_deadline, notes, paid_by, paid_at'
      )
      .eq('league_id', leagueId)
      .eq('season_id', seasonId);

    const existingByTeamId = new Map<string, ExistingTeamInvoiceRecord>(
      ((existingInvoices || []) as ExistingTeamInvoiceRecord[]).map((invoice) => [
        invoice.team_id,
        invoice,
      ])
    );

    const { data: registrations, error: registrationError } = await supabase
      .from('registration_submissions')
      .select(
        'team_id, fee_amount_cents, amount_paid_cents, payment_status, status, submitted_at'
      )
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .not('team_id', 'is', null)
      .not('submitted_at', 'is', null)
      .in('status', ['pending', 'approved', 'waitlisted']);

    if (registrationError) {
      return {
        success: false,
        error: sanitizeError(registrationError, 'generateTeamInvoices'),
      };
    }

    const registrationsByTeam = new Map<string, Array<{
      fee_amount_cents: number | null;
      amount_paid_cents: number | null;
    }>>();

    for (const registration of registrations || []) {
      if (!registration.team_id) continue;

      if (!registrationsByTeam.has(registration.team_id)) {
        registrationsByTeam.set(registration.team_id, []);
      }

      registrationsByTeam.get(registration.team_id)!.push({
        fee_amount_cents: registration.fee_amount_cents,
        amount_paid_cents: registration.amount_paid_cents,
      });
    }

    let generated = 0;
    let skipped = 0;

    for (const team of teams) {
      const teamRegistrations = registrationsByTeam.get(team.id) || [];
      const perPlayerOutstanding = teamRegistrations
        .map((registration) => {
          const feeAmount =
            registration.fee_amount_cents ?? seasonFee.amount_cents;
          const amountPaid = registration.amount_paid_cents ?? 0;
          return Math.max(0, feeAmount - amountPaid);
        })
        .filter((amount) => amount > 0);

      const totalPlayers = teamRegistrations.length;
      const calculatedTotalAmount =
        seasonFee.fee_basis === 'team'
          ? seasonFee.amount_cents
          : perPlayerOutstanding.reduce((sum, amount) => sum + amount, 0);

      const existingInvoice = existingByTeamId.get(team.id);

      if (seasonFee.fee_basis !== 'team' && perPlayerOutstanding.length === 0 && !existingInvoice) {
        skipped++;
        continue;
      }

      const amountPaidCents = Math.max(existingInvoice?.amount_paid_cents ?? 0, 0);
      const totalAmountCents = Math.max(calculatedTotalAmount, amountPaidCents);
      const status =
        totalAmountCents === 0
          ? 'waived'
          : amountPaidCents >= totalAmountCents
            ? 'paid'
            : amountPaidCents > 0
              ? 'partial'
              : 'pending';

      const invoicePayload = {
          team_id: team.id,
          season_id: seasonId,
          league_id: leagueId,
          total_players: totalPlayers,
          fee_basis: seasonFee.fee_basis,
          fee_per_player_cents: seasonFee.fee_basis === 'team' ? 0 : seasonFee.amount_cents,
          total_amount_cents: totalAmountCents,
          amount_paid_cents: amountPaidCents,
          currency: seasonFee.currency,
          status,
          payment_deadline: existingInvoice?.payment_deadline ?? null,
          notes: existingInvoice?.notes ?? null,
          paid_by: status === 'paid' ? existingInvoice?.paid_by ?? auth.userId : null,
          paid_at:
            status === 'paid'
              ? existingInvoice?.paid_at ?? new Date().toISOString()
              : null,
          updated_at: new Date().toISOString(),
        };

      let { error: writeError } = existingInvoice
        ? await (supabase as any)
            .from('team_invoices')
            .update(invoicePayload)
            .eq('id', existingInvoice.id)
        : await (supabase as any).from('team_invoices').insert(invoicePayload);

      if (
        writeError &&
        (writeError.code === '42703' || writeError.message?.includes('fee_basis'))
      ) {
        if (seasonFee.fee_basis === 'team') {
          return {
            success: false,
            error: 'Flat team fee invoices are not available in this environment yet.',
          };
        }

        const fallbackPayload = { ...invoicePayload };
        delete (fallbackPayload as Record<string, unknown>).fee_basis;

        const fallbackResult = existingInvoice
          ? await (supabase as any)
              .from('team_invoices')
              .update(fallbackPayload)
              .eq('id', existingInvoice.id)
          : await (supabase as any).from('team_invoices').insert(fallbackPayload);

        writeError = fallbackResult.error;
      }

      if (writeError) {
        console.error(`Failed to write invoice for team ${team.id}:`, writeError);
        skipped++;
        continue;
      }

      generated++;
    }

    revalidatePath(`/dashboard/leagues/${leagueId}/billing`);

    return { success: true, data: { generated, skipped } };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'generateTeamInvoices') };
  }
}

// ==============================================================================
// 4. UPDATE TEAM INVOICE
// ==============================================================================

export async function updateTeamInvoice(
  invoiceId: string,
  data: { status?: string; payment_deadline?: string; notes?: string }
): Promise<ActionResult<TeamInvoice>> {
  try {
    if (!isValidUUID(invoiceId)) {
      return { success: false, error: 'Invalid invoice ID format' };
    }

    const supabase = createServiceRoleClient();

    // Fetch the invoice to get league_id for auth check
    // Cast to any — team_invoices table not yet in generated types
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('team_invoices')
      .select('league_id, total_amount_cents')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Invoice not found' };
    }

    const auth = await verifyLeagueAdmin(existing.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.status !== undefined) {
      updateData.status = data.status;

      // If waived, mark as fully paid
      if (data.status === 'waived') {
        updateData.amount_paid_cents = existing.total_amount_cents;
      }
    }

    if (data.payment_deadline !== undefined) {
      updateData.payment_deadline = data.payment_deadline;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    const { data: updated, error } = await (supabase as any)
      .from('team_invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select(`
        *,
        team:teams!team_invoices_team_id_fkey(id, name)
      `)
      .single();

    if (error) {
      return { success: false, error: sanitizeError(error, 'updateTeamInvoice') };
    }

    revalidatePath(`/dashboard/leagues/${existing.league_id}/billing`);

    return { success: true, data: updated as TeamInvoice };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'updateTeamInvoice') };
  }
}

// ==============================================================================
// 5. RECORD TEAM PAYMENT
// ==============================================================================

export async function recordTeamPayment(
  invoiceId: string,
  payment: {
    amount_cents: number;
    payment_method: string;
    reference_number?: string;
    notes?: string;
  }
): Promise<ActionResult<TeamInvoicePayment>> {
  try {
    if (!isValidUUID(invoiceId)) {
      return { success: false, error: 'Invalid invoice ID format' };
    }

    if (payment.amount_cents <= 0) {
      return { success: false, error: 'Payment amount must be positive' };
    }

    const supabase = createServiceRoleClient();

    // Fetch invoice for auth and totals
    const { data: invoice, error: fetchError } = await (supabase as any)
      .from('team_invoices')
      .select('league_id, total_amount_cents, amount_paid_cents')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    const auth = await verifyLeagueAdmin(invoice.league_id);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    // Insert the payment record
    const { data: paymentRecord, error: insertError } = await (supabase as any)
      .from('team_invoice_payments')
      .insert({
        team_invoice_id: invoiceId,
        amount_cents: payment.amount_cents,
        payment_method: payment.payment_method,
        reference_number: payment.reference_number || null,
        recorded_by: auth.userId,
        notes: payment.notes || null,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: sanitizeError(insertError, 'recordTeamPayment') };
    }

    // Sum all payments to update the invoice
    const { data: allPayments, error: sumError } = await (supabase as any)
      .from('team_invoice_payments')
      .select('amount_cents')
      .eq('team_invoice_id', invoiceId);

    if (sumError) {
      return { success: false, error: sanitizeError(sumError, 'recordTeamPayment') };
    }

    const totalPaid = (allPayments || []).reduce(
      (sum: number, p: any) => sum + p.amount_cents,
      0
    );

    // Determine new status
    let newStatus: string;
    if (totalPaid >= invoice.total_amount_cents) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }

    const invoiceUpdate: Record<string, unknown> = {
      amount_paid_cents: totalPaid,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'paid') {
      invoiceUpdate.paid_by = auth.userId;
      invoiceUpdate.paid_at = new Date().toISOString();
    }

    await (supabase as any)
      .from('team_invoices')
      .update(invoiceUpdate)
      .eq('id', invoiceId);

    revalidatePath(`/dashboard/leagues/${invoice.league_id}/billing`);

    return { success: true, data: paymentRecord as TeamInvoicePayment };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'recordTeamPayment') };
  }
}

// ==============================================================================
// 6. GET TEAM BILLING SUMMARY
// ==============================================================================

export async function getTeamBillingSummary(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<TeamBillingSummary>> {
  try {
    if (!isValidUUID(leagueId) || !isValidUUID(seasonId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createServiceRoleClient();

    const { data: invoices, error } = await (supabase as any)
      .from('team_invoices')
      .select('total_amount_cents, amount_paid_cents, status')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId);

    if (error) {
      return { success: false, error: sanitizeError(error, 'getTeamBillingSummary') };
    }

    const rows = invoices || [];

    const summary: TeamBillingSummary = {
      total_invoiced_cents: rows.reduce((sum: number, inv: any) => sum + inv.total_amount_cents, 0),
      total_collected_cents: rows.reduce((sum: number, inv: any) => sum + inv.amount_paid_cents, 0),
      outstanding_cents: 0,
      team_count: rows.length,
      paid_count: rows.filter((inv: any) => inv.status === 'paid' || inv.status === 'waived').length,
      overdue_count: rows.filter((inv: any) => inv.status === 'overdue').length,
    };

    summary.outstanding_cents = summary.total_invoiced_cents - summary.total_collected_cents;

    return { success: true, data: summary };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'getTeamBillingSummary') };
  }
}

// ==============================================================================
// 7. GET PER-TEAM PAYMENT BREAKDOWN (from registration submissions)
// ==============================================================================

export interface TeamPaymentBreakdown {
  team_id: string;
  team_name: string;
  total_players: number;
  total_fee_cents: number;
  total_collected_cents: number;
  total_outstanding_cents: number;
  players_paid: number;
  players_unpaid: number;
}

export async function getPerTeamPaymentBreakdown(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<TeamPaymentBreakdown[]>> {
  try {
    if (!isValidUUID(leagueId) || !isValidUUID(seasonId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createServiceRoleClient();
    const seasonFeeResult = await getActiveSeasonFeeConfig(supabase, leagueId, seasonId);

    if (!seasonFeeResult.success) {
      return { success: false, error: seasonFeeResult.error };
    }

    if (seasonFeeResult.data.fee_basis === 'team') {
      const { data: invoices, error: invoiceError } = await (supabase as any)
        .from('team_invoices')
        .select(`
          team_id,
          total_players,
          total_amount_cents,
          amount_paid_cents,
          status,
          team:teams!team_invoices_team_id_fkey(name)
        `)
        .eq('league_id', leagueId)
        .eq('season_id', seasonId);

      if (invoiceError) {
        return { success: false, error: sanitizeError(invoiceError, 'getPerTeamPaymentBreakdown') };
      }

      const rows: TeamPaymentBreakdown[] = ((invoices || []) as Array<Record<string, any>>).map(
        (invoice) => ({
          team_id: invoice.team_id,
          team_name: invoice.team?.name || 'Unknown Team',
          total_players: invoice.total_players || 0,
          total_fee_cents: invoice.total_amount_cents || 0,
          total_collected_cents: invoice.amount_paid_cents || 0,
          total_outstanding_cents: Math.max(
            0,
            (invoice.total_amount_cents || 0) - (invoice.amount_paid_cents || 0)
          ),
          players_paid: invoice.status === 'paid' || invoice.status === 'waived' ? invoice.total_players || 0 : 0,
          players_unpaid:
            invoice.status === 'paid' || invoice.status === 'waived' ? 0 : invoice.total_players || 0,
        })
      );

      rows.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return { success: true, data: rows };
    }

    const { data: submissions, error } = await supabase
      .from('registration_submissions')
      .select(`
        id,
        team_id,
        fee_amount_cents,
        amount_paid_cents,
        payment_status,
        teams!registration_submissions_team_id_fkey(id, name)
      `)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .in('status', ['pending', 'approved']);

    if (error) {
      return { success: false, error: sanitizeError(error, 'getPerTeamPaymentBreakdown') };
    }

    // Aggregate by team in JS
    const teamMap = new Map<string, TeamPaymentBreakdown>();

    for (const sub of submissions || []) {
      const teamId = sub.team_id || 'unassigned';
      const teamData = sub.teams as { id: string; name: string } | null;
      const teamName = teamData?.name || 'Unassigned';
      const fee = sub.fee_amount_cents || 0;
      const paid = sub.amount_paid_cents || 0;
      const isPaid = sub.payment_status === 'completed';

      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, {
          team_id: teamId,
          team_name: teamName,
          total_players: 0,
          total_fee_cents: 0,
          total_collected_cents: 0,
          total_outstanding_cents: 0,
          players_paid: 0,
          players_unpaid: 0,
        });
      }

      const team = teamMap.get(teamId)!;
      team.total_players++;
      team.total_fee_cents += fee;
      team.total_collected_cents += paid;
      team.total_outstanding_cents += Math.max(0, fee - paid);
      if (isPaid) {
        team.players_paid++;
      } else {
        team.players_unpaid++;
      }
    }

    const result = Array.from(teamMap.values()).sort((a, b) =>
      a.team_name.localeCompare(b.team_name)
    );

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'getPerTeamPaymentBreakdown') };
  }
}

// ==============================================================================
// 8. GET UNPAID PLAYERS
// ==============================================================================

export interface UnpaidPlayer {
  id: string;
  player_id: string;
  player_name: string;
  player_email: string;
  team_id: string | null;
  team_name: string;
  fee_amount_cents: number;
  amount_paid_cents: number;
  outstanding_cents: number;
  payment_status: string;
}

export async function getUnpaidPlayers(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<UnpaidPlayer[]>> {
  try {
    if (!isValidUUID(leagueId) || !isValidUUID(seasonId)) {
      return { success: false, error: 'Invalid ID format' };
    }

    const auth = await verifyLeagueAdmin(leagueId);
    if (!auth) {
      return { success: false, error: 'Unauthorized' };
    }

    const seasonFeeResult = await getActiveSeasonFeeConfig(createServiceRoleClient(), leagueId, seasonId);
    if (!seasonFeeResult.success) {
      return { success: false, error: seasonFeeResult.error };
    }

    if (seasonFeeResult.data.fee_basis === 'team') {
      return { success: true, data: [] };
    }

    const supabase = await createClient();

    const { data: submissions, error } = await supabase
      .from('registration_submissions')
      .select(`
        id,
        player_id,
        team_id,
        fee_amount_cents,
        amount_paid_cents,
        payment_status,
        profiles!registration_submissions_player_id_fkey(full_name, email),
        teams!registration_submissions_team_id_fkey(name)
      `)
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .in('status', ['pending', 'approved'])
      .neq('payment_status', 'completed')
      .gt('fee_amount_cents', 0);

    if (error) {
      return { success: false, error: sanitizeError(error, 'getUnpaidPlayers') };
    }

    const players: UnpaidPlayer[] = (submissions || []).map((sub) => {
      const profile = sub.profiles as { full_name: string; email: string } | null;
      const team = sub.teams as { name: string } | null;
      const fee = sub.fee_amount_cents || 0;
      const paid = sub.amount_paid_cents || 0;

      return {
        id: sub.id,
        player_id: sub.player_id,
        player_name: profile?.full_name || 'Unknown Player',
        player_email: profile?.email || '',
        team_id: sub.team_id,
        team_name: team?.name || 'Unassigned',
        fee_amount_cents: fee,
        amount_paid_cents: paid,
        outstanding_cents: Math.max(0, fee - paid),
        payment_status: sub.payment_status || 'pending',
      };
    });

    // Sort by team name, then player name
    players.sort((a, b) => {
      const teamCmp = a.team_name.localeCompare(b.team_name);
      return teamCmp !== 0 ? teamCmp : a.player_name.localeCompare(b.player_name);
    });

    return { success: true, data: players };
  } catch (error) {
    return { success: false, error: sanitizeError(error, 'getUnpaidPlayers') };
  }
}
