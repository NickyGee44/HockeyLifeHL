'use server';

import { revalidatePath } from 'next/cache';
import type { Json } from '@hockey-life/database';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import { getRefereePayrollReport } from './referee-management';
import { pickOperationalSeason } from '@/lib/seasons/operational';

type FinanceActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type LeagueSeason = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

type ManualPaymentEvent = {
  amount_cents?: number | null;
  method?: string | null;
  recorded_at?: string | null;
  reference_number?: string | null;
  notes?: string | null;
};

type RegistrationDraftData = {
  admin_payment_events?: ManualPaymentEvent[];
};

type PlayerPaymentRow = {
  id: string;
  player_id: string;
  season_fee_id: string;
  season_id: string;
  total_amount_cents: number | null;
  amount_paid_cents: number;
  status: string;
};

type PaymentTransactionRow = {
  id: string;
  player_payment_id: string;
  transaction_type: string;
  amount_cents: number;
  application_fee_cents: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  description: string | null;
};

type TeamInvoiceRow = {
  id: string;
  team_id: string;
  total_amount_cents: number;
  amount_paid_cents: number;
  status: string;
};

type TeamInvoicePaymentRow = {
  id: string;
  team_invoice_id: string;
  amount_cents: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
};

type StripeConnectPaymentRow = {
  amount_cents: number;
  application_fee_cents: number;
  status: string;
};

type RegistrationSubmissionRow = {
  id: string;
  player_id: string;
  draft_data: Json | null;
};

export interface LeagueFinanceCustomItem {
  id: string;
  league_id: string;
  season_id: string | null;
  impact_type: 'income' | 'expense' | 'neutral';
  title: string;
  description: string | null;
  entry_date: string;
  amount_cents: number;
  currency: string;
  debit_account_name: string;
  credit_account_name: string;
  quickbooks_name: string | null;
  quickbooks_class: string | null;
  quickbooks_location: string | null;
  reference_number: string | null;
  notes: string | null;
  include_in_quickbooks_export: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeagueFinanceDashboardData {
  league: {
    id: string;
    name: string;
  };
  seasons: LeagueSeason[];
  selectedSeason: LeagueSeason | null;
  registrationSummary: {
    totalExpectedCents: number;
    totalCollectedCents: number;
    totalOutstandingCents: number;
    playersPaidFull: number;
    playersPartial: number;
    playersPending: number;
    playersOverdue: number;
  };
  teamBillingSummary: {
    totalInvoicedCents: number;
    invoiceCollectedCents: number;
    invoiceOutstandingCents: number;
    teamCount: number;
    paidCount: number;
    overdueCount: number;
    teamSideCollectedCents: number;
    playerContributionCents: number;
  };
  stripeSummary: {
    totalRevenueCents: number;
    totalFeesPaidCents: number;
    netRevenueCents: number;
    paymentCount: number;
    successRate: number;
    filteredBySeasonWindow: boolean;
  };
  refereePayroll: {
    assignments: number;
    totalAmountCents: number;
    paidAmountCents: number;
    pendingAmountCents: number;
    unlinkedAssignments: number;
  };
  manualItemsAvailable: boolean;
  manualItems: LeagueFinanceCustomItem[];
  manualSummary: {
    incomeCents: number;
    expenseCents: number;
    neutralCents: number;
  };
  snapshot: {
    cashCollectedCents: number;
    trackedExpensesCents: number;
    netTrackedPositionCents: number;
  };
}

export interface CreateLeagueFinanceCustomItemInput {
  leagueId: string;
  seasonId?: string | null;
  impactType: 'income' | 'expense' | 'neutral';
  title: string;
  description?: string;
  entryDate: string;
  amountCents: number;
  currency?: string;
  debitAccountName: string;
  creditAccountName: string;
  quickbooksName?: string;
  quickbooksClass?: string;
  quickbooksLocation?: string;
  referenceNumber?: string;
  notes?: string;
  includeInQuickBooksExport?: boolean;
}

export interface QuickBooksExportOptions {
  leagueId: string;
  seasonId?: string | null;
  registrationRevenueAccount?: string;
  teamRevenueAccount?: string;
  stripeClearingAccount?: string;
  manualDepositAccount?: string;
  processingFeesAccount?: string;
  refereeExpenseAccount?: string;
  refereePayableAccount?: string;
  refereeCashAccount?: string;
  defaultClassName?: string;
  defaultLocationName?: string;
  includePendingPayroll?: boolean;
  includePaidPayroll?: boolean;
  includeManualItems?: boolean;
}

type QuickBooksJournalLine = {
  journalNo: string;
  journalDate: string;
  accountName: string;
  description: string;
  debits: string;
  credits: string;
  name: string;
  className: string;
  location: string;
};

function cents(value: number | null | undefined) {
  return Math.max(0, Math.round(value || 0));
}

function isFinanceCustomItemsUnavailable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;

  return (
    error.code === '42P01' ||
    error.code === '42703' ||
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('league_finance_custom_items'))
  );
}

function getFinanceCustomItemsUnavailableMessage() {
  return 'Manual finance items are temporarily unavailable until the latest finance database migration is applied.';
}

function escapeCsv(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function formatJournalDate(value: string | null | undefined) {
  const parsed = value ? new Date(value) : new Date();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
}

function buildQuickBooksCsv(lines: QuickBooksJournalLine[]) {
  const headers = [
    'Journal No.',
    'Journal Date',
    'Account Name',
    'Journal/Description',
    'Debits',
    'Credits',
    'Name',
    'Class',
    'Location',
  ];

  return [headers, ...lines.map((line) => [
    line.journalNo,
    line.journalDate,
    line.accountName,
    line.description,
    line.debits,
    line.credits,
    line.name,
    line.className,
    line.location,
  ])]
    .map((row) => row.map((value) => escapeCsv(value)).join(','))
    .join('\n');
}

function normalizeManualEvents(draftData: Json | null): ManualPaymentEvent[] {
  if (!draftData || typeof draftData !== 'object' || Array.isArray(draftData)) {
    return [];
  }

  const data = draftData as RegistrationDraftData;
  if (!Array.isArray(data.admin_payment_events)) {
    return [];
  }

  return data.admin_payment_events.filter(
    (event): event is ManualPaymentEvent =>
      Boolean(event) && typeof event === 'object' && !Array.isArray(event)
  );
}

async function requireFinanceAccess(leagueId: string) {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { error: access.error || 'Not authorized to manage this league.' };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  return { userId: user.id };
}

function revalidateFinancePaths(leagueId: string) {
  revalidatePath(`/dashboard/leagues/${leagueId}/finance`);
  revalidatePath(`/dashboard/leagues/${leagueId}/payments`);
  revalidatePath(`/dashboard/leagues/${leagueId}/billing`);
}

async function getFinanceBaseContext(leagueId: string, seasonId?: string | null) {
  const access = await requireFinanceAccess(leagueId);
  if ('error' in access) {
    throw new Error(access.error);
  }

  const service = createServiceRoleClient();

  const [{ data: league, error: leagueError }, { data: seasons, error: seasonsError }] =
    await Promise.all([
      service.from('leagues').select('id, name').eq('id', leagueId).single(),
      service
        .from('seasons')
        .select('id, name, status, start_date, end_date')
        .eq('league_id', leagueId)
        .order('start_date', { ascending: false }),
    ]);

  if (leagueError || !league) {
    throw new Error('League not found.');
  }

  if (seasonsError) {
    throw new Error('Failed to load league seasons.');
  }

  const seasonRows = (seasons || []) as LeagueSeason[];
  const selectedSeason =
    seasonId === 'all'
      ? null
      : (seasonId ? seasonRows.find((season) => season.id === seasonId) : null) ||
        pickOperationalSeason(seasonRows) ||
        seasonRows[0] ||
        null;

  return {
    access,
    service,
    league,
    seasons: seasonRows,
    selectedSeason,
  };
}

async function getManualFinanceItems(
  service: ReturnType<typeof createServiceRoleClient>,
  leagueId: string,
  seasonId?: string | null
) {
  let query = (service as any)
    .from('league_finance_custom_items')
    .select('*')
    .eq('league_id', leagueId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (seasonId) {
    query = query.or(`season_id.is.null,season_id.eq.${seasonId}`);
  }

  const { data, error } = await query;
  if (error) {
    if (isFinanceCustomItemsUnavailable(error)) {
      return {
        items: [] as LeagueFinanceCustomItem[],
        available: false,
      };
    }
    throw new Error('Failed to load finance custom items.');
  }

  return {
    items: (data || []) as LeagueFinanceCustomItem[],
    available: true,
  };
}

export async function getLeagueFinanceDashboardData(
  leagueId: string,
  seasonId?: string | null
): Promise<FinanceActionResult<LeagueFinanceDashboardData>> {
  try {
    const { service, league, seasons, selectedSeason } = await getFinanceBaseContext(
      leagueId,
      seasonId
    );

    const selectedSeasonId = selectedSeason?.id || null;

    let playerPaymentsQuery = service
      .from('player_payments')
      .select('id, player_id, season_fee_id, season_id, total_amount_cents, amount_paid_cents, status')
      .eq('league_id', leagueId);

    if (selectedSeasonId) {
      playerPaymentsQuery = playerPaymentsQuery.eq('season_id', selectedSeasonId);
    }

    let invoicesQuery = (service as any)
      .from('team_invoices')
      .select('id, team_id, total_amount_cents, amount_paid_cents, status')
      .eq('league_id', leagueId);

    if (selectedSeasonId) {
      invoicesQuery = invoicesQuery.eq('season_id', selectedSeasonId);
    }

    let stripePaymentsQuery = service
      .from('stripe_connect_payments')
      .select('amount_cents, application_fee_cents, status')
      .eq('league_id', leagueId);

    let stripeFilteredBySeasonWindow = false;
    if (selectedSeason?.start_date) {
      stripePaymentsQuery = stripePaymentsQuery.gte('created_at', selectedSeason.start_date);
      stripeFilteredBySeasonWindow = true;
    }
    if (selectedSeason?.end_date) {
      stripePaymentsQuery = stripePaymentsQuery.lte(
        'created_at',
        `${selectedSeason.end_date}T23:59:59.999Z`
      );
      stripeFilteredBySeasonWindow = true;
    }

    const [playerPaymentsResult, invoicesResult, stripeResult, manualItemsResult, refereePayrollResult] =
      await Promise.all([
        playerPaymentsQuery,
        invoicesQuery,
        stripePaymentsQuery,
        getManualFinanceItems(service, leagueId, selectedSeasonId),
        getRefereePayrollReport({
          leagueId,
          seasonId: selectedSeasonId || undefined,
          paymentStatus: 'all',
        }),
      ]);

    if (playerPaymentsResult.error) {
      throw new Error('Failed to load player payments.');
    }
    if (invoicesResult.error) {
      throw new Error('Failed to load team billing data.');
    }
    if (stripeResult.error) {
      throw new Error('Failed to load Stripe payment data.');
    }

    const manualItems = manualItemsResult.items;
    const playerPayments = (playerPaymentsResult.data || []) as PlayerPaymentRow[];
    const invoices = (invoicesResult.data || []) as TeamInvoiceRow[];
    const invoiceIds = invoices.map((invoice) => invoice.id);

    const teamInvoicePayments = invoiceIds.length
      ? (
          await (service as any)
            .from('team_invoice_payments')
            .select('id, team_invoice_id, amount_cents, payment_method, reference_number, notes, created_at')
            .in('team_invoice_id', invoiceIds)
        )
      : { data: [] as TeamInvoicePaymentRow[], error: null };

    if (teamInvoicePayments.error) {
      throw new Error('Failed to load team payment transactions.');
    }

    const registrationSummary = {
      totalExpectedCents: playerPayments.reduce(
        (sum, payment) => sum + cents(payment.total_amount_cents),
        0
      ),
      totalCollectedCents: playerPayments.reduce(
        (sum, payment) => sum + cents(payment.amount_paid_cents),
        0
      ),
      totalOutstandingCents: playerPayments.reduce(
        (sum, payment) =>
          sum + Math.max(0, cents(payment.total_amount_cents) - cents(payment.amount_paid_cents)),
        0
      ),
      playersPaidFull: playerPayments.filter((payment) => payment.status === 'paid').length,
      playersPartial: playerPayments.filter((payment) => payment.status === 'partially_paid').length,
      playersPending: playerPayments.filter((payment) => payment.status === 'pending').length,
      playersOverdue: playerPayments.filter((payment) => payment.status === 'overdue').length,
    };

    const invoiceCollectedCents = invoices.reduce(
      (sum, invoice) => sum + cents(invoice.amount_paid_cents),
      0
    );
    const teamSideCollectedCents = ((teamInvoicePayments.data || []) as TeamInvoicePaymentRow[]).reduce(
      (sum, payment) => sum + cents(payment.amount_cents),
      0
    );
    const playerContributionCents = Math.max(0, invoiceCollectedCents - teamSideCollectedCents);

    const teamBillingSummary = {
      totalInvoicedCents: invoices.reduce((sum, invoice) => sum + cents(invoice.total_amount_cents), 0),
      invoiceCollectedCents,
      invoiceOutstandingCents: invoices.reduce(
        (sum, invoice) =>
          sum + Math.max(0, cents(invoice.total_amount_cents) - cents(invoice.amount_paid_cents)),
        0
      ),
      teamCount: invoices.length,
      paidCount: invoices.filter((invoice) => ['paid', 'waived'].includes(invoice.status)).length,
      overdueCount: invoices.filter((invoice) => invoice.status === 'overdue').length,
      teamSideCollectedCents,
      playerContributionCents,
    };

    const stripePayments = (stripeResult.data || []) as StripeConnectPaymentRow[];
    const successfulStripePayments = stripePayments.filter((payment) => payment.status === 'succeeded');
    const stripeSummary = {
      totalRevenueCents: successfulStripePayments.reduce(
        (sum, payment) => sum + cents(payment.amount_cents),
        0
      ),
      totalFeesPaidCents: successfulStripePayments.reduce(
        (sum, payment) => sum + cents(payment.application_fee_cents),
        0
      ),
      netRevenueCents: 0,
      paymentCount: successfulStripePayments.length,
      successRate:
        stripePayments.length > 0
          ? Math.round((successfulStripePayments.length / stripePayments.length) * 100)
          : 0,
      filteredBySeasonWindow: stripeFilteredBySeasonWindow,
    };
    stripeSummary.netRevenueCents =
      stripeSummary.totalRevenueCents - stripeSummary.totalFeesPaidCents;

    const manualSummary = {
      incomeCents: manualItems
        .filter((item) => item.impact_type === 'income')
        .reduce((sum, item) => sum + cents(item.amount_cents), 0),
      expenseCents: manualItems
        .filter((item) => item.impact_type === 'expense')
        .reduce((sum, item) => sum + cents(item.amount_cents), 0),
      neutralCents: manualItems
        .filter((item) => item.impact_type === 'neutral')
        .reduce((sum, item) => sum + cents(item.amount_cents), 0),
    };

    const refereePayrollData =
      refereePayrollResult.success && refereePayrollResult.data
        ? refereePayrollResult.data
        : null;
    const refereePayroll = refereePayrollData
      ? refereePayrollData.totals
      : {
          assignments: 0,
          totalAmountCents: 0,
          paidAmountCents: 0,
          pendingAmountCents: 0,
        };

    const snapshot = {
      cashCollectedCents:
        registrationSummary.totalCollectedCents +
        teamBillingSummary.teamSideCollectedCents +
        manualSummary.incomeCents,
      trackedExpensesCents:
        stripeSummary.totalFeesPaidCents +
        refereePayroll.totalAmountCents +
        manualSummary.expenseCents,
      netTrackedPositionCents: 0,
    };
    snapshot.netTrackedPositionCents =
      snapshot.cashCollectedCents - snapshot.trackedExpensesCents;

    return {
      success: true,
      data: {
        league: {
          id: league.id,
          name: league.name,
        },
        seasons,
        selectedSeason,
        registrationSummary,
        teamBillingSummary,
        stripeSummary,
        refereePayroll: {
          assignments: refereePayroll.assignments,
          totalAmountCents: refereePayroll.totalAmountCents,
          paidAmountCents: refereePayroll.paidAmountCents,
          pendingAmountCents: refereePayroll.pendingAmountCents,
          unlinkedAssignments: refereePayrollData?.unlinkedAssignments || 0,
        },
        manualItemsAvailable: manualItemsResult.available,
        manualItems,
        manualSummary,
        snapshot,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load finance dashboard.',
    };
  }
}

export async function createLeagueFinanceCustomItem(
  input: CreateLeagueFinanceCustomItemInput
): Promise<FinanceActionResult<LeagueFinanceCustomItem>> {
  try {
    if (!input.title.trim()) {
      return { success: false, error: 'Title is required.' };
    }
    if (input.amountCents <= 0) {
      return { success: false, error: 'Amount must be greater than zero.' };
    }
    if (!input.debitAccountName.trim() || !input.creditAccountName.trim()) {
      return {
        success: false,
        error: 'Both QuickBooks debit and credit accounts are required.',
      };
    }

    const access = await requireFinanceAccess(input.leagueId);
    if ('error' in access) {
      return { success: false, error: access.error || 'Authentication required.' };
    }

    const service = createServiceRoleClient();
    const { data, error } = await (service as any)
      .from('league_finance_custom_items')
      .insert({
        league_id: input.leagueId,
        season_id: input.seasonId || null,
        impact_type: input.impactType,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        entry_date: input.entryDate,
        amount_cents: Math.round(input.amountCents),
        currency: (input.currency || 'CAD').trim().toUpperCase(),
        debit_account_name: input.debitAccountName.trim(),
        credit_account_name: input.creditAccountName.trim(),
        quickbooks_name: input.quickbooksName?.trim() || null,
        quickbooks_class: input.quickbooksClass?.trim() || null,
        quickbooks_location: input.quickbooksLocation?.trim() || null,
        reference_number: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        include_in_quickbooks_export: input.includeInQuickBooksExport ?? true,
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select('*')
      .single();

    if (error || !data) {
      if (isFinanceCustomItemsUnavailable(error)) {
        return {
          success: false,
          error: getFinanceCustomItemsUnavailableMessage(),
        };
      }
      return { success: false, error: 'Failed to save finance item.' };
    }

    revalidateFinancePaths(input.leagueId);

    return { success: true, data: data as LeagueFinanceCustomItem };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save finance item.',
    };
  }
}

export async function deleteLeagueFinanceCustomItem(
  leagueId: string,
  itemId: string
): Promise<FinanceActionResult<void>> {
  try {
    const access = await requireFinanceAccess(leagueId);
    if ('error' in access) {
      return { success: false, error: access.error || 'Authentication required.' };
    }

    const service = createServiceRoleClient();
    const { error } = await (service as any)
      .from('league_finance_custom_items')
      .delete()
      .eq('id', itemId)
      .eq('league_id', leagueId);

    if (error) {
      if (isFinanceCustomItemsUnavailable(error)) {
        return {
          success: false,
          error: getFinanceCustomItemsUnavailableMessage(),
        };
      }
      return { success: false, error: 'Failed to delete finance item.' };
    }

    revalidateFinancePaths(leagueId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete finance item.',
    };
  }
}

function pushBalancedEntry(
  lines: QuickBooksJournalLine[],
  params: {
    journalNo: string;
    journalDate: string;
    debitAccount: string;
    creditAccount: string;
    amountCents: number;
    description: string;
    name?: string | null;
    className?: string | null;
    location?: string | null;
  }
) {
  const amount = (params.amountCents / 100).toFixed(2);
  const common = {
    journalNo: params.journalNo,
    journalDate: params.journalDate,
    description: params.description,
    name: params.name || '',
    className: params.className || '',
    location: params.location || '',
  };

  lines.push({
    ...common,
    accountName: params.debitAccount,
    debits: amount,
    credits: '',
  });
  lines.push({
    ...common,
    accountName: params.creditAccount,
    debits: '',
    credits: amount,
  });
}

export async function exportLeagueFinanceQuickBooksCsv(
  options: QuickBooksExportOptions
): Promise<FinanceActionResult<{ fileName: string; csv: string; journalCount: number }>> {
  try {
    const {
      leagueId,
      seasonId,
      registrationRevenueAccount = 'Registration Revenue',
      teamRevenueAccount = 'Team Fee Revenue',
      stripeClearingAccount = 'Stripe Clearing',
      manualDepositAccount = 'Undeposited Funds',
      processingFeesAccount = 'Processing Fees',
      refereeExpenseAccount = 'Referee Payroll Expense',
      refereePayableAccount = 'Accounts Payable',
      refereeCashAccount = 'Checking',
      defaultClassName = '',
      defaultLocationName = '',
      includePendingPayroll = true,
      includePaidPayroll = true,
      includeManualItems = true,
    } = options;

    const { service, league, selectedSeason } = await getFinanceBaseContext(leagueId, seasonId);
    const selectedSeasonId = selectedSeason?.id || null;

    let playerPaymentsQuery = service
      .from('player_payments')
      .select('id, player_id, season_fee_id, season_id')
      .eq('league_id', leagueId);
    if (selectedSeasonId) {
      playerPaymentsQuery = playerPaymentsQuery.eq('season_id', selectedSeasonId);
    }

    let registrationsQuery = service
      .from('registration_submissions')
      .select('id, player_id, draft_data')
      .eq('league_id', leagueId)
      .not('submitted_at', 'is', null);
    if (selectedSeasonId) {
      registrationsQuery = registrationsQuery.eq('season_id', selectedSeasonId);
    }

    let invoicesQuery = (service as any)
      .from('team_invoices')
      .select('id, team_id')
      .eq('league_id', leagueId);
    if (selectedSeasonId) {
      invoicesQuery = invoicesQuery.eq('season_id', selectedSeasonId);
    }

    const [playerPaymentsResult, registrationsResult, invoicesResult, manualItemsResult, refereePayrollResult] =
      await Promise.all([
        playerPaymentsQuery,
        registrationsQuery,
        invoicesQuery,
        includeManualItems
          ? getManualFinanceItems(service, leagueId, selectedSeasonId)
          : Promise.resolve({
              items: [] as LeagueFinanceCustomItem[],
              available: false,
            }),
        getRefereePayrollReport({
          leagueId,
          seasonId: selectedSeasonId || undefined,
          paymentStatus: 'all',
        }),
      ]);

    if (playerPaymentsResult.error) {
      return { success: false, error: 'Failed to load player payments for export.' };
    }
    if (registrationsResult.error) {
      return { success: false, error: 'Failed to load manual registration payments.' };
    }
    if (invoicesResult.error) {
      return { success: false, error: 'Failed to load team payments for export.' };
    }

    const playerPayments = (playerPaymentsResult.data || []) as Array<{
      id: string;
      player_id: string;
      season_fee_id: string;
      season_id: string;
    }>;
    const paymentIds = playerPayments.map((payment) => payment.id);
    const playerIds = Array.from(new Set(playerPayments.map((payment) => payment.player_id)));
    const feeIds = Array.from(new Set(playerPayments.map((payment) => payment.season_fee_id)));

    const [playerProfilesResult, seasonFeesResult, paymentTransactionsResult] = await Promise.all([
      playerIds.length
        ? service.from('profiles').select('id, full_name').in('id', playerIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }>, error: null }),
      feeIds.length
        ? service.from('season_fees').select('id, name').in('id', feeIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
      paymentIds.length
        ? service
            .from('payment_transactions')
            .select(
              'id, player_payment_id, transaction_type, amount_cents, application_fee_cents, status, created_at, completed_at, description'
            )
            .in('player_payment_id', paymentIds)
        : Promise.resolve({ data: [] as PaymentTransactionRow[], error: null }),
    ]);

    if (playerProfilesResult.error || seasonFeesResult.error || paymentTransactionsResult.error) {
      return { success: false, error: 'Failed to build QuickBooks payment export.' };
    }

    const registrations = (registrationsResult.data || []) as RegistrationSubmissionRow[];
    const invoices = (invoicesResult.data || []) as Array<{ id: string; team_id: string }>;
    const invoiceIds = invoices.map((invoice) => invoice.id);
    const teamIds = Array.from(new Set(invoices.map((invoice) => invoice.team_id)));

    const [teamPaymentsResult, teamsResult] = await Promise.all([
      invoiceIds.length
        ? (service as any)
            .from('team_invoice_payments')
            .select('id, team_invoice_id, amount_cents, payment_method, reference_number, notes, created_at')
            .in('team_invoice_id', invoiceIds)
        : Promise.resolve({ data: [] as TeamInvoicePaymentRow[], error: null }),
      teamIds.length
        ? service.from('teams').select('id, name').in('id', teamIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
    ]);

    if (teamPaymentsResult.error || teamsResult.error) {
      return { success: false, error: 'Failed to load team invoice payments.' };
    }

    const playerNames = new Map(
      ((playerProfilesResult.data || []) as Array<{ id: string; full_name: string | null }>).map(
        (player) => [player.id, player.full_name || 'Player']
      )
    );
    const feeNames = new Map(
      ((seasonFeesResult.data || []) as Array<{ id: string; name: string }>).map((fee) => [
        fee.id,
        fee.name,
      ])
    );
    const paymentById = new Map(playerPayments.map((payment) => [payment.id, payment] as const));
    const teamNames = new Map(
      ((teamsResult.data || []) as Array<{ id: string; name: string }>).map((team) => [
        team.id,
        team.name,
      ])
    );
    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice] as const));

    const lines: QuickBooksJournalLine[] = [];
    let journalCounter = 0;
    const nextJournalNo = (prefix: string) => {
      journalCounter += 1;
      return `${prefix}-${String(journalCounter).padStart(4, '0')}`;
    };

    for (const transaction of (paymentTransactionsResult.data || []) as PaymentTransactionRow[]) {
      const payment = paymentById.get(transaction.player_payment_id);
      if (!payment) continue;
      if (!['payment', 'installment', 'late_fee', 'adjustment', 'refund'].includes(transaction.transaction_type)) {
        continue;
      }
      if (!['succeeded', 'refunded'].includes(transaction.status)) {
        continue;
      }

      const playerName = playerNames.get(payment.player_id) || 'Player';
      const feeName = feeNames.get(payment.season_fee_id) || 'Registration Fee';
      const date = formatJournalDate(transaction.completed_at || transaction.created_at);
      const description =
        transaction.description ||
        (transaction.transaction_type === 'refund'
          ? `Registration refund - ${feeName}`
          : `Registration payment - ${feeName}`);
      const journalNo = nextJournalNo('REG');
      const amountCents = cents(transaction.amount_cents);
      const feeCents = cents(transaction.application_fee_cents);

      if (transaction.transaction_type === 'refund') {
        pushBalancedEntry(lines, {
          journalNo,
          journalDate: date,
          debitAccount: registrationRevenueAccount,
          creditAccount: stripeClearingAccount,
          amountCents,
          description,
          name: playerName,
          className: defaultClassName,
          location: defaultLocationName,
        });
        if (feeCents > 0) {
          pushBalancedEntry(lines, {
            journalNo,
            journalDate: date,
            debitAccount: stripeClearingAccount,
            creditAccount: processingFeesAccount,
            amountCents: feeCents,
            description: `${description} fee reversal`,
            name: playerName,
            className: defaultClassName,
            location: defaultLocationName,
          });
        }
        continue;
      }

      pushBalancedEntry(lines, {
        journalNo,
        journalDate: date,
        debitAccount: stripeClearingAccount,
        creditAccount: registrationRevenueAccount,
        amountCents,
        description,
        name: playerName,
        className: defaultClassName,
        location: defaultLocationName,
      });

      if (feeCents > 0) {
        pushBalancedEntry(lines, {
          journalNo,
          journalDate: date,
          debitAccount: processingFeesAccount,
          creditAccount: stripeClearingAccount,
          amountCents: feeCents,
          description: `${description} processing fee`,
          name: playerName,
          className: defaultClassName,
          location: defaultLocationName,
        });
      }
    }

    for (const registration of registrations) {
      const events = normalizeManualEvents(registration.draft_data);
      if (events.length === 0) continue;

      const playerName = playerNames.get(registration.player_id) || 'Player';
      for (const event of events) {
        const amountCents = cents(event.amount_cents);
        if (amountCents <= 0) continue;

        const journalNo = nextJournalNo('MANREG');
        const methodLabel = event.method ? event.method.replace(/_/g, ' ') : 'manual';
        pushBalancedEntry(lines, {
          journalNo,
          journalDate: formatJournalDate(event.recorded_at),
          debitAccount: manualDepositAccount,
          creditAccount: registrationRevenueAccount,
          amountCents,
          description: `Manual registration payment - ${methodLabel}`,
          name: playerName,
          className: defaultClassName,
          location: defaultLocationName,
        });
      }
    }

    for (const payment of (teamPaymentsResult.data || []) as TeamInvoicePaymentRow[]) {
      const invoice = invoiceById.get(payment.team_invoice_id);
      const teamName = invoice ? teamNames.get(invoice.team_id) || 'Team' : 'Team';
      const journalNo = nextJournalNo('TEAM');
      pushBalancedEntry(lines, {
        journalNo,
        journalDate: formatJournalDate(payment.created_at),
        debitAccount: payment.payment_method === 'stripe' ? stripeClearingAccount : manualDepositAccount,
        creditAccount: teamRevenueAccount,
        amountCents: cents(payment.amount_cents),
        description: `Team invoice payment${payment.reference_number ? ` - ${payment.reference_number}` : ''}`,
        name: teamName,
        className: defaultClassName,
        location: defaultLocationName,
      });
    }

    if (refereePayrollResult.success && refereePayrollResult.data) {
      for (const lineItem of refereePayrollResult.data.lineItems) {
        if (lineItem.paymentStatus === 'paid' && !includePaidPayroll) continue;
        if (lineItem.paymentStatus !== 'paid' && !includePendingPayroll) continue;

        const offsetAccount =
          lineItem.paymentStatus === 'paid' ? refereeCashAccount : refereePayableAccount;
        const journalNo = nextJournalNo('REF');
        pushBalancedEntry(lines, {
          journalNo,
          journalDate: formatJournalDate(lineItem.scheduledAt),
          debitAccount: refereeExpenseAccount,
          creditAccount: offsetAccount,
          amountCents: cents(lineItem.paymentAmountCents),
          description: `Referee payroll - ${lineItem.matchup}`,
          name: lineItem.refereeName,
          className: defaultClassName,
          location: defaultLocationName,
        });
      }
    }

    for (const item of manualItemsResult.items) {
      if (!item.include_in_quickbooks_export) continue;

      const journalNo = nextJournalNo('MANUAL');
      pushBalancedEntry(lines, {
        journalNo,
        journalDate: formatJournalDate(item.entry_date),
        debitAccount: item.debit_account_name,
        creditAccount: item.credit_account_name,
        amountCents: cents(item.amount_cents),
        description: item.title,
        name: item.quickbooks_name,
        className: item.quickbooks_class || defaultClassName,
        location: item.quickbooks_location || defaultLocationName,
      });
    }

    const seasonLabel = selectedSeason?.name || 'all-seasons';
    const safeSeasonLabel = seasonLabel
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const fileName = `quickbooks-journal-${league.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${safeSeasonLabel || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      success: true,
      data: {
        fileName,
        csv: buildQuickBooksCsv(lines),
        journalCount: journalCounter,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate QuickBooks export.',
    };
  }
}
