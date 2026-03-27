'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { Json } from '@hockey-life/database';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import { getRefereePayrollReport } from './referee-management';
import { pickOperationalSeason } from '@/lib/seasons/operational';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import type { NextRequest } from 'next/server';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';
import {
  createQuickBooksJournalEntry,
  exchangeQuickBooksAuthorizationCode,
  fetchQuickBooksAccounts,
  fetchQuickBooksClasses,
  fetchQuickBooksCompanyInfo,
  fetchQuickBooksLocations,
  getQuickBooksAuthorizationUrl,
  getQuickBooksConfigurationStatus,
  refreshQuickBooksTokens,
  revokeQuickBooksToken,
  type QuickBooksAccountOption,
} from '@/lib/quickbooks/client';
import {
  createQuickBooksStateToken,
  decryptQuickBooksSecret,
  encryptQuickBooksSecret,
  verifyQuickBooksStateToken,
} from '@/lib/quickbooks/crypto';

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

type FinancePlayerPaymentRow = {
  id: string;
  player_id: string;
  team_id: string | null;
  season_id: string;
  status: string;
  amount_paid_cents: number;
  total_amount_cents: number | null;
  currency: string;
  created_at: string;
  paid_at: string | null;
  archived_at: string | null;
  archived_reason: string | null;
  player: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  team: {
    id: string;
    name: string | null;
  } | null;
  season_fee: {
    id: string;
    name: string | null;
  } | null;
};

type TeamInvoiceRow = {
  id: string;
  team_id: string;
  season_id?: string;
  total_amount_cents: number;
  amount_paid_cents: number;
  status: string;
  team?: {
    id: string;
    name: string | null;
  } | null;
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
  id?: string;
  amount_cents: number;
  application_fee_cents: number;
  status: string;
  description?: string | null;
  customer_email?: string | null;
  currency?: string;
  created_at?: string;
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

export type LeagueFinanceLedgerSource =
  | 'player_payment'
  | 'refund'
  | 'team_invoice_payment'
  | 'stripe_fee'
  | 'manual_item'
  | 'referee_payroll';

export interface FinanceLedgerFilters {
  seasonId?: string | null;
  source?: LeagueFinanceLedgerSource | 'all';
  status?: string | 'all';
  query?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface LeagueFinanceLedgerRow {
  id: string;
  entryDate: string;
  source: LeagueFinanceLedgerSource;
  title: string;
  counterparty: string | null;
  status: string;
  amountCents: number;
  direction: 'inflow' | 'outflow' | 'neutral';
  currency: string;
  seasonId: string | null;
  href: string;
  note: string | null;
  archived: boolean;
}

export interface LeagueFinanceLedgerData {
  rows: LeagueFinanceLedgerRow[];
  total: number;
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

export type QuickBooksMappingSlot =
  | 'registrationRevenue'
  | 'teamRevenue'
  | 'stripeClearing'
  | 'manualDeposit'
  | 'processingFees'
  | 'refereeExpense'
  | 'refereePayable'
  | 'refereeCash';

export interface QuickBooksMappingSelection {
  id: string;
  name: string;
}

export interface QuickBooksMappingConfig {
  registrationRevenue: QuickBooksMappingSelection | null;
  teamRevenue: QuickBooksMappingSelection | null;
  stripeClearing: QuickBooksMappingSelection | null;
  manualDeposit: QuickBooksMappingSelection | null;
  processingFees: QuickBooksMappingSelection | null;
  refereeExpense: QuickBooksMappingSelection | null;
  refereePayable: QuickBooksMappingSelection | null;
  refereeCash: QuickBooksMappingSelection | null;
  defaultClass: QuickBooksMappingSelection | null;
  defaultLocation: QuickBooksMappingSelection | null;
}

export interface QuickBooksConnection {
  id: string;
  leagueId: string;
  realmId: string;
  companyName: string | null;
  status: 'active' | 'disconnected' | 'error';
  connectedAt: string | null;
  lastSyncedAt: string | null;
  disconnectedAt: string | null;
}

export interface QuickBooksSyncFilters {
  seasonId?: string | null;
  includePendingPayroll?: boolean;
  includePaidPayroll?: boolean;
  includeManualItems?: boolean;
}

export interface QuickBooksSyncEntry {
  id: string;
  sourceKey: string;
  journalNo: string;
  journalDate: string;
  description: string;
  amountCents: number;
  lineCount: number;
  status: 'pending' | 'already_synced' | 'changed' | 'error' | 'syncing' | 'success' | 'failed';
  errorText: string | null;
  qboJournalEntryId: string | null;
  syncedAt: string | null;
}

export interface QuickBooksSyncRun {
  id: string;
  status: 'preview' | 'syncing' | 'success' | 'partial' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt: string | null;
  seasonId: string | null;
  previewCount: number;
  pendingCount: number;
  alreadySyncedCount: number;
  changedCount: number;
  syncedCount: number;
  failedCount: number;
  entryFailures: QuickBooksSyncEntry[];
}

export interface QuickBooksIntegrationStatus {
  available: boolean;
  configurationMessage: string | null;
  canManage: boolean;
  connection: QuickBooksConnection | null;
  mappings: QuickBooksMappingConfig | null;
  missingMappings: QuickBooksMappingSlot[];
  recentRuns: QuickBooksSyncRun[];
}

export interface QuickBooksMappingOptions {
  accounts: QuickBooksAccountOption[];
  classes: QuickBooksAccountOption[];
  locations: QuickBooksAccountOption[];
  current: QuickBooksMappingConfig | null;
}

export interface QuickBooksJournalPreview {
  previewId: string;
  createdAt: string;
  canSync: boolean;
  counts: {
    total: number;
    pending: number;
    alreadySynced: number;
    changed: number;
    failed: number;
  };
  entries: QuickBooksSyncEntry[];
}

type QuickBooksConnectionRow = {
  id: string;
  league_id: string;
  realm_id: string;
  company_name: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_type: string | null;
  scopes: string[] | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  status: 'active' | 'disconnected' | 'error';
  connected_by: string | null;
  connected_at: string | null;
  last_synced_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
};

type QuickBooksMappingsRow = {
  id: string;
  league_id: string;
  connection_id: string;
  mapping_config: Json;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type QuickBooksSyncRunRow = {
  id: string;
  league_id: string;
  connection_id: string;
  season_id: string | null;
  requested_by: string | null;
  status: 'preview' | 'syncing' | 'success' | 'partial' | 'failed' | 'cancelled';
  filters: Json;
  summary: Json;
  preview_count: number;
  pending_count: number;
  already_synced_count: number;
  changed_count: number;
  synced_count: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type QuickBooksSyncEntryRow = {
  id: string;
  sync_run_id: string;
  league_id: string;
  connection_id: string;
  source_key: string;
  source_hash: string;
  journal_no: string;
  journal_date: string;
  description: string;
  amount_cents: number;
  line_count: number;
  status: QuickBooksSyncEntry['status'];
  qbo_journal_entry_id: string | null;
  payload_snapshot: Json;
  response_snapshot: Json | null;
  error_text: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

type QuickBooksOAuthCallbackResult = {
  redirectTo: string;
  clearNonceCookie?: boolean;
};

type FinanceQuickBooksAccess = {
  userId: string;
  canView: boolean;
  canManage: boolean;
  accessType: 'owner' | 'org_owner' | 'league_owner_member' | 'league_admin' | 'platform_admin';
};

type QuickBooksResolvedOption = {
  id: string;
  name: string;
};

type QuickBooksRemoteOptions = {
  accounts: QuickBooksAccountOption[];
  classes: QuickBooksAccountOption[];
  locations: QuickBooksAccountOption[];
};

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

type AccountingJournalAccountRef =
  | { type: 'slot'; slot: QuickBooksMappingSlot }
  | { type: 'named'; name: string };

type AccountingJournalDimensionRef =
  | { type: 'default' }
  | { type: 'named'; name: string }
  | { type: 'none' };

type AccountingJournalEntryDraftLine = {
  postingType: 'Debit' | 'Credit';
  account: AccountingJournalAccountRef;
  amountCents: number;
  description: string;
  name: string;
  classRef: AccountingJournalDimensionRef;
  locationRef: AccountingJournalDimensionRef;
};

type AccountingJournalEntryDraft = {
  sourceKey: string;
  journalNo: string;
  journalDate: string;
  txnDate: string;
  description: string;
  amountCents: number;
  lineCount: number;
  lines: AccountingJournalEntryDraftLine[];
};

const QUICKBOOKS_OAUTH_NONCE_COOKIE = 'hl_qbo_oauth_nonce';
const QUICKBOOKS_SYNC_MAPPING_SLOTS: QuickBooksMappingSlot[] = [
  'registrationRevenue',
  'teamRevenue',
  'stripeClearing',
  'manualDeposit',
  'processingFees',
  'refereeExpense',
  'refereePayable',
  'refereeCash',
];

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

type QueryCompatibilityError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type LegacyCompatibleQueryResult<T> = {
  data: T | null;
  error: QueryCompatibilityError | null;
  count?: number | null;
  legacySchema: boolean;
};

type LegacyCompatibleQueryResponse<T> = {
  data: T | null;
  error: QueryCompatibilityError | null;
  count?: number | null;
};

type LegacyCompatibleAwaitable<T> = PromiseLike<LegacyCompatibleQueryResponse<T>>;

function getQueryCompatibilityErrorText(error: QueryCompatibilityError | null | undefined) {
  return `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
}

function isFinancePaymentArchiveSchemaUnavailable(
  error: QueryCompatibilityError | null | undefined
) {
  if (!error) return false;

  const message = getQueryCompatibilityErrorText(error);
  return (
    ['42703', '42P01', 'PGRST205'].includes(error.code || '') &&
    ['archived_at', 'archived_by', 'archived_reason'].some((token) =>
      message.includes(token)
    )
  );
}

function isQuickBooksSchemaUnavailable(error: QueryCompatibilityError | null | undefined) {
  if (!error) return false;

  const message = getQueryCompatibilityErrorText(error);
  return (
    ['42703', '42P01', 'PGRST205'].includes(error.code || '') &&
    [
      'league_quickbooks_connections',
      'league_quickbooks_mappings',
      'league_quickbooks_sync_runs',
      'league_quickbooks_sync_entries',
    ].some((token) => message.includes(token))
  );
}

function getQuickBooksSchemaUnavailableMessage() {
  return 'QuickBooks Online sync is temporarily unavailable until the latest finance database migration is applied.';
}

async function runLegacyCompatibleQuery<T>(
  primary: () => LegacyCompatibleAwaitable<T>,
  legacy: () => LegacyCompatibleAwaitable<T>
): Promise<LegacyCompatibleQueryResult<T>> {
  const primaryResult = await primary();
  if (!primaryResult.error || !isFinancePaymentArchiveSchemaUnavailable(primaryResult.error)) {
    return { ...primaryResult, legacySchema: false };
  }

  const legacyResult = await legacy();
  return { ...legacyResult, legacySchema: true };
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

function normalizeSearchValue(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function matchesLedgerQuery(row: LeagueFinanceLedgerRow, query: string) {
  const normalized = normalizeSearchValue(query);
  if (!normalized) return true;

  const haystack = [
    row.title,
    row.counterparty,
    row.status,
    row.source,
    row.note,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

function buildLeaguePaymentHref(
  leagueId: string,
  seasonId: string | null,
  paymentId: string,
  archived: boolean
) {
  const params = new URLSearchParams();
  if (seasonId) {
    params.set('season', seasonId);
  }
  params.set('payment', paymentId);
  if (archived) {
    params.set('archived', '1');
  }
  return `/dashboard/leagues/${leagueId}/payments?${params.toString()}`;
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
    .join('\r\n');
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

function createEmptyQuickBooksMappingConfig(): QuickBooksMappingConfig {
  return {
    registrationRevenue: null,
    teamRevenue: null,
    stripeClearing: null,
    manualDeposit: null,
    processingFees: null,
    refereeExpense: null,
    refereePayable: null,
    refereeCash: null,
    defaultClass: null,
    defaultLocation: null,
  };
}

function parseQuickBooksMappingSelection(value: unknown): QuickBooksMappingSelection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const selection = value as Record<string, unknown>;
  if (typeof selection.id !== 'string' || typeof selection.name !== 'string') {
    return null;
  }

  const id = selection.id.trim();
  const name = selection.name.trim();
  if (!id || !name) {
    return null;
  }

  return { id, name };
}

function parseQuickBooksMappingConfig(value: Json | null | undefined): QuickBooksMappingConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyQuickBooksMappingConfig();
  }

  const record = value as Record<string, unknown>;

  return {
    registrationRevenue: parseQuickBooksMappingSelection(record.registrationRevenue),
    teamRevenue: parseQuickBooksMappingSelection(record.teamRevenue),
    stripeClearing: parseQuickBooksMappingSelection(record.stripeClearing),
    manualDeposit: parseQuickBooksMappingSelection(record.manualDeposit),
    processingFees: parseQuickBooksMappingSelection(record.processingFees),
    refereeExpense: parseQuickBooksMappingSelection(record.refereeExpense),
    refereePayable: parseQuickBooksMappingSelection(record.refereePayable),
    refereeCash: parseQuickBooksMappingSelection(record.refereeCash),
    defaultClass: parseQuickBooksMappingSelection(record.defaultClass),
    defaultLocation: parseQuickBooksMappingSelection(record.defaultLocation),
  };
}

function toQuickBooksConnection(row: QuickBooksConnectionRow | null | undefined): QuickBooksConnection | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    leagueId: row.league_id,
    realmId: row.realm_id,
    companyName: row.company_name,
    status: row.status,
    connectedAt: row.connected_at,
    lastSyncedAt: row.last_synced_at,
    disconnectedAt: row.disconnected_at,
  };
}

function toQuickBooksSyncEntry(row: QuickBooksSyncEntryRow): QuickBooksSyncEntry {
  return {
    id: row.id,
    sourceKey: row.source_key,
    journalNo: row.journal_no,
    journalDate: row.journal_date,
    description: row.description,
    amountCents: row.amount_cents,
    lineCount: row.line_count,
    status: row.status,
    errorText: row.error_text,
    qboJournalEntryId: row.qbo_journal_entry_id,
    syncedAt: row.synced_at,
  };
}

function toQuickBooksSyncRun(
  row: QuickBooksSyncRunRow,
  entryFailures: QuickBooksSyncEntry[]
): QuickBooksSyncRun {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    seasonId: row.season_id,
    previewCount: row.preview_count,
    pendingCount: row.pending_count,
    alreadySyncedCount: row.already_synced_count,
    changedCount: row.changed_count,
    syncedCount: row.synced_count,
    failedCount: row.failed_count,
    entryFailures,
  };
}

function getMissingQuickBooksMappingSlots(
  mappings: QuickBooksMappingConfig | null | undefined
): QuickBooksMappingSlot[] {
  if (!mappings) {
    return [...QUICKBOOKS_SYNC_MAPPING_SLOTS];
  }

  return QUICKBOOKS_SYNC_MAPPING_SLOTS.filter((slot) => !mappings[slot]);
}

function getQuickBooksSlotLabel(slot: QuickBooksMappingSlot) {
  switch (slot) {
    case 'registrationRevenue':
      return 'registration revenue';
    case 'teamRevenue':
      return 'team revenue';
    case 'stripeClearing':
      return 'Stripe clearing';
    case 'manualDeposit':
      return 'manual deposit';
    case 'processingFees':
      return 'processing fees';
    case 'refereeExpense':
      return 'referee expense';
    case 'refereePayable':
      return 'referee payable';
    case 'refereeCash':
      return 'referee cash';
  }
}

function normalizeQuickBooksOptionName(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function getQuickBooksOptionDisplayName(option: QuickBooksAccountOption) {
  return option.fullyQualifiedName || option.name;
}

function sortQuickBooksOptions(options: QuickBooksAccountOption[]) {
  return [...options].sort((left, right) => {
    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    return getQuickBooksOptionDisplayName(left).localeCompare(getQuickBooksOptionDisplayName(right));
  });
}

function findQuickBooksOptionById(options: QuickBooksAccountOption[], id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return options.find((option) => option.id === id) || null;
}

function findQuickBooksOptionByName(options: QuickBooksAccountOption[], name: string | null | undefined) {
  const normalized = normalizeQuickBooksOptionName(name);
  if (!normalized) {
    return null;
  }

  return (
    options.find(
      (option) =>
        normalizeQuickBooksOptionName(option.name) === normalized ||
        normalizeQuickBooksOptionName(option.fullyQualifiedName) === normalized
    ) || null
  );
}

function getQuickBooksDateOnly(value: string | null | undefined) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function appendQuickBooksRedirectParams(
  returnTo: string,
  params: Record<string, string | null | undefined>
) {
  const safePath = safeRedirectPath(returnTo);
  const url = new URL(safePath, 'http://localhost');

  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      url.searchParams.delete(key);
      return;
    }

    url.searchParams.set(key, value);
  });

  return `${url.pathname}${url.search}${url.hash}`;
}

function getQuickBooksCounts(entries: QuickBooksSyncEntry[]) {
  return entries.reduce(
    (counts, entry) => {
      counts.total += 1;
      if (entry.status === 'pending') counts.pending += 1;
      if (entry.status === 'already_synced') counts.alreadySynced += 1;
      if (entry.status === 'changed') counts.changed += 1;
      if (entry.status === 'error' || entry.status === 'failed') counts.failed += 1;
      return counts;
    },
    {
      total: 0,
      pending: 0,
      alreadySynced: 0,
      changed: 0,
      failed: 0,
    }
  );
}

function buildQuickBooksSyncSummary(entries: QuickBooksSyncEntry[]) {
  const counts = getQuickBooksCounts(entries);

  return {
    previewCount: counts.total,
    pendingCount: counts.pending,
    alreadySyncedCount: counts.alreadySynced,
    changedCount: counts.changed,
    syncedCount: entries.filter((entry) => entry.status === 'success').length,
    failedCount: counts.failed,
  };
}

async function getQuickBooksLeagueAccess(
  leagueId: string
): Promise<FinanceActionResult<FinanceQuickBooksAccess>> {
  const baseAccess = await verifyLeagueOwnerAccess(leagueId);
  if (!baseAccess.authorized) {
    return { success: false, error: baseAccess.error || 'Not authorized to access this league.' };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  const service = createServiceRoleClient();
  const { data: league, error: leagueError } = await service
    .from('leagues')
    .select('id, owner_id, created_by, organization_id')
    .eq('id', leagueId)
    .maybeSingle();

  if (leagueError || !league) {
    return { success: false, error: 'League not found.' };
  }

  if (league.owner_id === user.id || league.created_by === user.id) {
    return {
      success: true,
      data: {
        userId: user.id,
        canView: true,
        canManage: true,
        accessType: 'owner',
      },
    };
  }

  if (league.organization_id) {
    const { data: organization } = await service
      .from('organizations')
      .select('owner_user_id')
      .eq('id', league.organization_id)
      .maybeSingle();

    if (organization?.owner_user_id === user.id) {
      return {
        success: true,
        data: {
          userId: user.id,
          canView: true,
          canManage: true,
          accessType: 'org_owner',
        },
      };
    }
  }

  const { data: membership } = await service
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .maybeSingle();

  if (membership?.role === 'owner') {
    return {
      success: true,
      data: {
        userId: user.id,
        canView: true,
        canManage: true,
        accessType: 'league_owner_member',
      },
    };
  }

  if (membership?.role === 'admin') {
    return {
      success: true,
      data: {
        userId: user.id,
        canView: true,
        canManage: false,
        accessType: 'league_admin',
      },
    };
  }

  if (await isUserPlatformAdmin(user.id)) {
    return {
      success: true,
      data: {
        userId: user.id,
        canView: true,
        canManage: true,
        accessType: 'platform_admin',
      },
    };
  }

  return { success: false, error: 'Not authorized to access this league.' };
}

async function loadQuickBooksConnectionRow(
  service: ReturnType<typeof createServiceRoleClient>,
  leagueId: string
) {
  const { data, error } = await (service as any)
    .from('league_quickbooks_connections')
    .select('*')
    .eq('league_id', leagueId)
    .maybeSingle();

  if (error) {
    if (isQuickBooksSchemaUnavailable(error)) {
      throw new Error(getQuickBooksSchemaUnavailableMessage());
    }
    throw new Error('Failed to load the QuickBooks connection.');
  }

  return (data || null) as QuickBooksConnectionRow | null;
}

async function loadQuickBooksMappingsRow(
  service: ReturnType<typeof createServiceRoleClient>,
  leagueId: string
) {
  const { data, error } = await (service as any)
    .from('league_quickbooks_mappings')
    .select('*')
    .eq('league_id', leagueId)
    .maybeSingle();

  if (error) {
    if (isQuickBooksSchemaUnavailable(error)) {
      throw new Error(getQuickBooksSchemaUnavailableMessage());
    }
    throw new Error('Failed to load the QuickBooks mappings.');
  }

  return (data || null) as QuickBooksMappingsRow | null;
}

async function persistQuickBooksConnectionTokens(
  service: ReturnType<typeof createServiceRoleClient>,
  connectionId: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    scope: string[];
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  }
) {
  const { data, error } = await (service as any)
    .from('league_quickbooks_connections')
    .update({
      access_token_encrypted: encryptQuickBooksSecret(tokens.accessToken),
      refresh_token_encrypted: encryptQuickBooksSecret(tokens.refreshToken),
      token_type: tokens.tokenType,
      scopes: tokens.scope,
      access_token_expires_at: tokens.accessTokenExpiresAt,
      refresh_token_expires_at: tokens.refreshTokenExpiresAt,
      status: 'active',
      disconnected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('Failed to persist refreshed QuickBooks tokens.');
  }

  return data as QuickBooksConnectionRow;
}

async function ensureQuickBooksAccessToken(
  service: ReturnType<typeof createServiceRoleClient>,
  connection: QuickBooksConnectionRow
) {
  if (connection.status !== 'active') {
    throw new Error('Reconnect QuickBooks Online before syncing journals.');
  }
  if (!connection.access_token_encrypted || !connection.refresh_token_encrypted) {
    throw new Error('Reconnect QuickBooks Online before syncing journals.');
  }

  const currentAccessToken = decryptQuickBooksSecret(connection.access_token_encrypted);
  const currentRefreshToken = decryptQuickBooksSecret(connection.refresh_token_encrypted);
  const accessTokenExpiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;
  const now = Date.now();

  if (accessTokenExpiresAt && accessTokenExpiresAt - now > 5 * 60 * 1000) {
    return {
      connection,
      accessToken: currentAccessToken,
      refreshToken: currentRefreshToken,
    };
  }

  const refreshed = await refreshQuickBooksTokens(currentRefreshToken);
  const updatedConnection = await persistQuickBooksConnectionTokens(service, connection.id, refreshed);

  return {
    connection: updatedConnection,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  };
}

async function fetchOptionalQuickBooksOptions(
  loader: () => Promise<QuickBooksAccountOption[]>
): Promise<QuickBooksAccountOption[]> {
  try {
    return await loader();
  } catch {
    return [];
  }
}

async function loadQuickBooksRemoteOptions(
  service: ReturnType<typeof createServiceRoleClient>,
  connection: QuickBooksConnectionRow
): Promise<{ connection: QuickBooksConnectionRow; accessToken: string } & QuickBooksRemoteOptions> {
  const tokenState = await ensureQuickBooksAccessToken(service, connection);
  const [accounts, classes, locations] = await Promise.all([
    fetchQuickBooksAccounts(tokenState.connection.realm_id, tokenState.accessToken),
    fetchOptionalQuickBooksOptions(() =>
      fetchQuickBooksClasses(tokenState.connection.realm_id, tokenState.accessToken)
    ),
    fetchOptionalQuickBooksOptions(() =>
      fetchQuickBooksLocations(tokenState.connection.realm_id, tokenState.accessToken)
    ),
  ]);

  return {
    connection: tokenState.connection,
    accessToken: tokenState.accessToken,
    accounts: sortQuickBooksOptions(accounts),
    classes: sortQuickBooksOptions(classes),
    locations: sortQuickBooksOptions(locations),
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
    const loadPlayerPayments = () =>
      runLegacyCompatibleQuery<PlayerPaymentRow[]>(
        () => {
          let query = service
            .from('player_payments')
            .select('id, player_id, season_fee_id, season_id, total_amount_cents, amount_paid_cents, status')
            .eq('league_id', leagueId)
            .is('archived_at', null);

          if (selectedSeasonId) {
            query = query.eq('season_id', selectedSeasonId);
          }

          return query;
        },
        () => {
          let query = service
            .from('player_payments')
            .select('id, player_id, season_fee_id, season_id, total_amount_cents, amount_paid_cents, status')
            .eq('league_id', leagueId);

          if (selectedSeasonId) {
            query = query.eq('season_id', selectedSeasonId);
          }

          return query;
        }
      );

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
        loadPlayerPayments(),
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

export async function getLeagueFinanceLedger(
  leagueId: string,
  filters: FinanceLedgerFilters = {}
): Promise<FinanceActionResult<LeagueFinanceLedgerData>> {
  try {
    const {
      service,
      selectedSeason,
    } = await getFinanceBaseContext(leagueId, filters.seasonId);

    const selectedSeasonId = selectedSeason?.id || null;
    const includeArchived = filters.includeArchived ?? false;
    const sourceFilter = filters.source || 'all';
    const statusFilter = filters.status || 'all';
    const limit = Math.max(1, Math.min(filters.limit ?? 50, 200));
    const offset = Math.max(0, filters.offset ?? 0);
    const loadPlayerPayments = () =>
      runLegacyCompatibleQuery<any[]>(
        () => {
          let query = (service as any)
            .from('player_payments')
            .select(`
              id,
              player_id,
              team_id,
              season_id,
              status,
              amount_paid_cents,
              total_amount_cents,
              currency,
              created_at,
              paid_at,
              archived_at,
              archived_reason,
              player:player_id(id, full_name, email),
              team:team_id(id, name),
              season_fee:season_fee_id(id, name)
            `)
            .eq('league_id', leagueId);

          if (selectedSeasonId) {
            query = query.eq('season_id', selectedSeasonId);
          }
          if (!includeArchived) {
            query = query.is('archived_at', null);
          }

          return query;
        },
        () => {
          let query = (service as any)
            .from('player_payments')
            .select(`
              id,
              player_id,
              team_id,
              season_id,
              status,
              amount_paid_cents,
              total_amount_cents,
              currency,
              created_at,
              paid_at,
              player:player_id(id, full_name, email),
              team:team_id(id, name),
              season_fee:season_fee_id(id, name)
            `)
            .eq('league_id', leagueId);

          if (selectedSeasonId) {
            query = query.eq('season_id', selectedSeasonId);
          }

          return query;
        }
      );

    let invoicesQuery = (service as any)
      .from('team_invoices')
      .select(`
        id,
        team_id,
        season_id,
        total_amount_cents,
        amount_paid_cents,
        status,
        team:team_id(id, name)
      `)
      .eq('league_id', leagueId);

    if (selectedSeasonId) {
      invoicesQuery = invoicesQuery.eq('season_id', selectedSeasonId);
    }

    let stripePaymentsQuery = service
      .from('stripe_connect_payments')
      .select('id, amount_cents, application_fee_cents, status, description, customer_email, currency, created_at')
      .eq('league_id', leagueId);

    if (selectedSeason?.start_date) {
      stripePaymentsQuery = stripePaymentsQuery.gte('created_at', selectedSeason.start_date);
    }
    if (selectedSeason?.end_date) {
      stripePaymentsQuery = stripePaymentsQuery.lte(
        'created_at',
        `${selectedSeason.end_date}T23:59:59.999Z`
      );
    }

    const [playerPaymentsResult, invoicesResult, stripePaymentsResult, manualItemsResult, refereePayrollResult] =
      await Promise.all([
        loadPlayerPayments(),
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
      return { success: false, error: 'Failed to load player payment ledger rows.' };
    }
    if (invoicesResult.error) {
      return { success: false, error: 'Failed to load team invoice ledger rows.' };
    }
    if (stripePaymentsResult.error) {
      return { success: false, error: 'Failed to load Stripe ledger rows.' };
    }

    const playerPayments = playerPaymentsResult.legacySchema
      ? ((playerPaymentsResult.data || []) as Array<
          Omit<FinancePlayerPaymentRow, 'archived_at' | 'archived_reason'>
        >).map((payment) => ({
          ...payment,
          archived_at: null,
          archived_reason: null,
        }))
      : ((playerPaymentsResult.data || []) as FinancePlayerPaymentRow[]);
    const playerPaymentById = new Map(playerPayments.map((payment) => [payment.id, payment]));
    const paymentIds = playerPayments.map((payment) => payment.id);

    const { data: paymentTransactions, error: paymentTransactionsError } = paymentIds.length
      ? await service
          .from('payment_transactions')
          .select(
            'id, player_payment_id, transaction_type, amount_cents, application_fee_cents, status, created_at, completed_at, description'
          )
          .in('player_payment_id', paymentIds)
      : { data: [] as PaymentTransactionRow[], error: null };

    if (paymentTransactionsError) {
      return { success: false, error: 'Failed to load player payment transactions.' };
    }

    const invoices = (invoicesResult.data || []) as TeamInvoiceRow[];
    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    const invoiceIds = invoices.map((invoice) => invoice.id);

    const { data: invoicePayments, error: invoicePaymentsError } = invoiceIds.length
      ? await (service as any)
          .from('team_invoice_payments')
          .select('id, team_invoice_id, amount_cents, payment_method, reference_number, notes, created_at')
          .in('team_invoice_id', invoiceIds)
      : { data: [] as TeamInvoicePaymentRow[], error: null };

    if (invoicePaymentsError) {
      return { success: false, error: 'Failed to load team invoice payments.' };
    }

    const transactionRows = (paymentTransactions || []) as PaymentTransactionRow[];
    const transactionCountByPaymentId = new Map<string, number>();
    for (const transaction of transactionRows) {
      transactionCountByPaymentId.set(
        transaction.player_payment_id,
        (transactionCountByPaymentId.get(transaction.player_payment_id) || 0) + 1
      );
    }

    const rows: LeagueFinanceLedgerRow[] = [];

    for (const transaction of transactionRows) {
      const payment = playerPaymentById.get(transaction.player_payment_id);
      if (!payment) continue;

      const isRefund = transaction.transaction_type === 'refund';
      const archived = Boolean(payment.archived_at);

      rows.push({
        id: transaction.id,
        entryDate: transaction.completed_at || transaction.created_at,
        source: isRefund ? 'refund' : 'player_payment',
        title:
          transaction.description ||
          payment.season_fee?.name ||
          (isRefund ? 'Player refund' : 'Player payment'),
        counterparty: payment.player?.full_name || payment.player?.email || null,
        status: transaction.status,
        amountCents: cents(transaction.amount_cents),
        direction: isRefund ? 'outflow' : 'inflow',
        currency: payment.currency || 'CAD',
        seasonId: payment.season_id,
        href: buildLeaguePaymentHref(leagueId, payment.season_id, payment.id, archived),
        note: payment.team?.name
          ? `${payment.team.name}${payment.archived_reason ? ` | Archived: ${payment.archived_reason}` : ''}`
          : payment.archived_reason
            ? `Archived: ${payment.archived_reason}`
            : null,
        archived,
      });
    }

    for (const payment of playerPayments) {
      if ((transactionCountByPaymentId.get(payment.id) || 0) > 0 || payment.amount_paid_cents <= 0) {
        continue;
      }

      const archived = Boolean(payment.archived_at);
      rows.push({
        id: `manual-player-${payment.id}`,
        entryDate: payment.paid_at || payment.created_at,
        source: 'player_payment',
        title: payment.season_fee?.name || 'Manual player payment',
        counterparty: payment.player?.full_name || payment.player?.email || null,
        status: payment.status,
        amountCents: cents(payment.amount_paid_cents),
        direction: 'inflow',
        currency: payment.currency || 'CAD',
        seasonId: payment.season_id,
        href: buildLeaguePaymentHref(leagueId, payment.season_id, payment.id, archived),
        note: payment.archived_reason ? `Archived: ${payment.archived_reason}` : 'Recorded without transaction history.',
        archived,
      });
    }

    for (const invoicePayment of (invoicePayments || []) as TeamInvoicePaymentRow[]) {
      const invoice = invoiceById.get(invoicePayment.team_invoice_id);
      if (!invoice) continue;

      rows.push({
        id: invoicePayment.id,
        entryDate: invoicePayment.created_at,
        source: 'team_invoice_payment',
        title: 'Team invoice payment',
        counterparty: invoice.team?.name || 'Team payment',
        status: 'recorded',
        amountCents: cents(invoicePayment.amount_cents),
        direction: 'inflow',
        currency: 'CAD',
        seasonId: (invoice.season_id as string | undefined) || null,
        href: `/dashboard/leagues/${leagueId}/billing`,
        note: invoicePayment.reference_number || invoicePayment.notes || invoicePayment.payment_method,
        archived: false,
      });
    }

    for (const stripePayment of (stripePaymentsResult.data || []) as StripeConnectPaymentRow[]) {
      if ((stripePayment.application_fee_cents || 0) <= 0) {
        continue;
      }

      rows.push({
        id: `stripe-fee-${stripePayment.id || stripePayment.created_at || Math.random().toString(36).slice(2)}`,
        entryDate: stripePayment.created_at || new Date().toISOString(),
        source: 'stripe_fee',
        title: stripePayment.description || 'Stripe application fee',
        counterparty: stripePayment.customer_email || null,
        status: stripePayment.status,
        amountCents: cents(stripePayment.application_fee_cents),
        direction: 'outflow',
        currency: stripePayment.currency || 'CAD',
        seasonId: selectedSeasonId,
        href: `/dashboard/leagues/${leagueId}/billing`,
        note:
          (stripePayment.amount_cents || 0) > 0
            ? `Gross charge $${(cents(stripePayment.amount_cents) / 100).toFixed(2)}`
            : null,
        archived: false,
      });
    }

    for (const manualItem of manualItemsResult.items) {
      rows.push({
        id: manualItem.id,
        entryDate: manualItem.entry_date,
        source: 'manual_item',
        title: manualItem.title,
        counterparty: manualItem.quickbooks_name || null,
        status: 'posted',
        amountCents: cents(manualItem.amount_cents),
        direction:
          manualItem.impact_type === 'income'
            ? 'inflow'
            : manualItem.impact_type === 'expense'
              ? 'outflow'
              : 'neutral',
        currency: manualItem.currency || 'CAD',
        seasonId: manualItem.season_id,
        href: `/dashboard/leagues/${leagueId}/finance#manual-items`,
        note: manualItem.notes || `${manualItem.debit_account_name} / ${manualItem.credit_account_name}`,
        archived: false,
      });
    }

    if (refereePayrollResult.success && refereePayrollResult.data) {
      for (const lineItem of refereePayrollResult.data.lineItems) {
        rows.push({
          id: lineItem.officialId,
          entryDate: lineItem.scheduledAt,
          source: 'referee_payroll',
          title: `${lineItem.role} - ${lineItem.matchup}`,
          counterparty: lineItem.refereeName,
          status: lineItem.paymentStatus,
          amountCents: cents(lineItem.paymentAmountCents),
          direction: 'outflow',
          currency: 'CAD',
          seasonId: selectedSeasonId,
          href: `/dashboard/leagues/${leagueId}/settings/referees`,
          note: lineItem.venue || lineItem.paymentRuleApplied || null,
          archived: false,
        });
      }
    }

    const filteredRows = rows
      .filter((row) => (sourceFilter === 'all' ? true : row.source === sourceFilter))
      .filter((row) => (statusFilter === 'all' ? true : row.status === statusFilter))
      .filter((row) => matchesLedgerQuery(row, filters.query || ''))
      .sort((left, right) => {
        const timeDiff = new Date(right.entryDate).getTime() - new Date(left.entryDate).getTime();
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return left.title.localeCompare(right.title);
      });

    return {
      success: true,
      data: {
        rows: filteredRows.slice(offset, offset + limit),
        total: filteredRows.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load finance ledger.',
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

function pushBalancedDraftLines(
  lines: AccountingJournalEntryDraftLine[],
  params: {
    debitAccount: AccountingJournalAccountRef;
    creditAccount: AccountingJournalAccountRef;
    amountCents: number;
    description: string;
    name?: string | null;
    classRef?: AccountingJournalDimensionRef;
    locationRef?: AccountingJournalDimensionRef;
  }
) {
  const common = {
    amountCents: params.amountCents,
    description: params.description,
    name: params.name || '',
    classRef: params.classRef || { type: 'default' as const },
    locationRef: params.locationRef || { type: 'default' as const },
  };

  lines.push({
    ...common,
    postingType: 'Debit',
    account: params.debitAccount,
  });
  lines.push({
    ...common,
    postingType: 'Credit',
    account: params.creditAccount,
  });
}

function finalizeQuickBooksDraft(params: {
  sourceKey: string;
  journalNo: string;
  entryDate: string | null | undefined;
  description: string;
  lines: AccountingJournalEntryDraftLine[];
}): AccountingJournalEntryDraft {
  return {
    sourceKey: params.sourceKey,
    journalNo: params.journalNo,
    journalDate: formatJournalDate(params.entryDate),
    txnDate: getQuickBooksDateOnly(params.entryDate),
    description: params.description,
    amountCents: params.lines
      .filter((line) => line.postingType === 'Debit')
      .reduce((sum, line) => sum + cents(line.amountCents), 0),
    lineCount: params.lines.length,
    lines: params.lines,
  };
}

async function buildQuickBooksJournalDrafts(options: {
  leagueId: string;
  seasonId?: string | null;
  includePendingPayroll?: boolean;
  includePaidPayroll?: boolean;
  includeManualItems?: boolean;
}) {
  const {
    leagueId,
    seasonId,
    includePendingPayroll = true,
    includePaidPayroll = true,
    includeManualItems = true,
  } = options;

  const { service, league, selectedSeason } = await getFinanceBaseContext(leagueId, seasonId);
  const selectedSeasonId = selectedSeason?.id || null;
  const loadPlayerPayments = () =>
    runLegacyCompatibleQuery<
      Array<{
        id: string;
        player_id: string;
        season_fee_id: string;
        season_id: string;
      }>
    >(
      () => {
        let query = service
          .from('player_payments')
          .select('id, player_id, season_fee_id, season_id')
          .eq('league_id', leagueId)
          .is('archived_at', null);
        if (selectedSeasonId) {
          query = query.eq('season_id', selectedSeasonId);
        }

        return query;
      },
      () => {
        let query = service
          .from('player_payments')
          .select('id, player_id, season_fee_id, season_id')
          .eq('league_id', leagueId);
        if (selectedSeasonId) {
          query = query.eq('season_id', selectedSeasonId);
        }

        return query;
      }
    );

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

  const [
    playerPaymentsResult,
    registrationsResult,
    invoicesResult,
    manualItemsResult,
    refereePayrollResult,
  ] = await Promise.all([
    loadPlayerPayments(),
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
    throw new Error('Failed to load player payments for QuickBooks journals.');
  }
  if (registrationsResult.error) {
    throw new Error('Failed to load manual registration payments.');
  }
  if (invoicesResult.error) {
    throw new Error('Failed to load team invoice payments.');
  }

  const playerPayments = (playerPaymentsResult.data || []) as Array<{
    id: string;
    player_id: string;
    season_fee_id: string;
    season_id: string;
  }>;
  const registrations = (registrationsResult.data || []) as RegistrationSubmissionRow[];
  const invoices = (invoicesResult.data || []) as Array<{ id: string; team_id: string }>;
  const paymentIds = playerPayments.map((payment) => payment.id);
  const playerIds = Array.from(
    new Set([
      ...playerPayments.map((payment) => payment.player_id),
      ...registrations.map((registration) => registration.player_id),
    ])
  );
  const feeIds = Array.from(new Set(playerPayments.map((payment) => payment.season_fee_id)));
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const teamIds = Array.from(new Set(invoices.map((invoice) => invoice.team_id)));

  const [
    playerProfilesResult,
    seasonFeesResult,
    paymentTransactionsResult,
    teamPaymentsResult,
    teamsResult,
  ] = await Promise.all([
    playerIds.length
      ? service.from('profiles').select('id, full_name').in('id', playerIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; full_name: string | null }>,
          error: null,
        }),
    feeIds.length
      ? service.from('season_fees').select('id, name').in('id', feeIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; name: string }>,
          error: null,
        }),
    paymentIds.length
      ? service
          .from('payment_transactions')
          .select(
            'id, player_payment_id, transaction_type, amount_cents, application_fee_cents, status, created_at, completed_at, description'
          )
          .in('player_payment_id', paymentIds)
      : Promise.resolve({ data: [] as PaymentTransactionRow[], error: null }),
    invoiceIds.length
      ? (service as any)
          .from('team_invoice_payments')
          .select(
            'id, team_invoice_id, amount_cents, payment_method, reference_number, notes, created_at'
          )
          .in('team_invoice_id', invoiceIds)
      : Promise.resolve({ data: [] as TeamInvoicePaymentRow[], error: null }),
    teamIds.length
      ? service.from('teams').select('id, name').in('id', teamIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; name: string }>,
          error: null,
        }),
  ]);

  if (
    playerProfilesResult.error ||
    seasonFeesResult.error ||
    paymentTransactionsResult.error ||
    teamPaymentsResult.error ||
    teamsResult.error
  ) {
    throw new Error('Failed to build QuickBooks journals from league finance data.');
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

  const drafts: AccountingJournalEntryDraft[] = [];
  let journalCounter = 0;
  const nextJournalNo = (prefix: string) => {
    journalCounter += 1;
    return `${prefix}-${String(journalCounter).padStart(4, '0')}`;
  };

  for (const transaction of (paymentTransactionsResult.data || []) as PaymentTransactionRow[]) {
    const payment = paymentById.get(transaction.player_payment_id);
    if (!payment) continue;
    if (
      !['payment', 'installment', 'late_fee', 'adjustment', 'refund'].includes(
        transaction.transaction_type
      )
    ) {
      continue;
    }
    if (!['succeeded', 'refunded'].includes(transaction.status)) {
      continue;
    }

    const playerName = playerNames.get(payment.player_id) || 'Player';
    const feeName = feeNames.get(payment.season_fee_id) || 'Registration Fee';
    const description =
      transaction.description ||
      (transaction.transaction_type === 'refund'
        ? `Registration refund - ${feeName}`
        : `Registration payment - ${feeName}`);
    const lines: AccountingJournalEntryDraftLine[] = [];
    const amountCents = cents(transaction.amount_cents);
    const feeCents = cents(transaction.application_fee_cents);

    if (transaction.transaction_type === 'refund') {
      pushBalancedDraftLines(lines, {
        debitAccount: { type: 'slot', slot: 'registrationRevenue' },
        creditAccount: { type: 'slot', slot: 'stripeClearing' },
        amountCents,
        description,
        name: playerName,
      });
      if (feeCents > 0) {
        pushBalancedDraftLines(lines, {
          debitAccount: { type: 'slot', slot: 'stripeClearing' },
          creditAccount: { type: 'slot', slot: 'processingFees' },
          amountCents: feeCents,
          description: `${description} fee reversal`,
          name: playerName,
        });
      }
    } else {
      pushBalancedDraftLines(lines, {
        debitAccount: { type: 'slot', slot: 'stripeClearing' },
        creditAccount: { type: 'slot', slot: 'registrationRevenue' },
        amountCents,
        description,
        name: playerName,
      });
      if (feeCents > 0) {
        pushBalancedDraftLines(lines, {
          debitAccount: { type: 'slot', slot: 'processingFees' },
          creditAccount: { type: 'slot', slot: 'stripeClearing' },
          amountCents: feeCents,
          description: `${description} processing fee`,
          name: playerName,
        });
      }
    }

    drafts.push(
      finalizeQuickBooksDraft({
        sourceKey: `player-transaction:${transaction.id}`,
        journalNo: nextJournalNo('REG'),
        entryDate: transaction.completed_at || transaction.created_at,
        description,
        lines,
      })
    );
  }

  for (const registration of registrations) {
    const events = normalizeManualEvents(registration.draft_data);
    if (events.length === 0) continue;

    const playerName = playerNames.get(registration.player_id) || 'Player';
    events.forEach((event, index) => {
      const amountCents = cents(event.amount_cents);
      if (amountCents <= 0) {
        return;
      }

      const methodLabel = event.method ? event.method.replace(/_/g, ' ') : 'manual';
      const description = `Manual registration payment - ${methodLabel}`;
      const lines: AccountingJournalEntryDraftLine[] = [];
      pushBalancedDraftLines(lines, {
        debitAccount: { type: 'slot', slot: 'manualDeposit' },
        creditAccount: { type: 'slot', slot: 'registrationRevenue' },
        amountCents,
        description,
        name: playerName,
      });

      drafts.push(
        finalizeQuickBooksDraft({
          sourceKey: `manual-registration:${registration.id}:${index}`,
          journalNo: nextJournalNo('MANREG'),
          entryDate: event.recorded_at,
          description,
          lines,
        })
      );
    });
  }

  for (const payment of (teamPaymentsResult.data || []) as TeamInvoicePaymentRow[]) {
    const invoice = invoiceById.get(payment.team_invoice_id);
    const teamName = invoice ? teamNames.get(invoice.team_id) || 'Team' : 'Team';
    const description = `Team invoice payment${
      payment.reference_number ? ` - ${payment.reference_number}` : ''
    }`;
    const lines: AccountingJournalEntryDraftLine[] = [];
    pushBalancedDraftLines(lines, {
      debitAccount: {
        type: 'slot',
        slot: payment.payment_method === 'stripe' ? 'stripeClearing' : 'manualDeposit',
      },
      creditAccount: { type: 'slot', slot: 'teamRevenue' },
      amountCents: cents(payment.amount_cents),
      description,
      name: teamName,
    });

    drafts.push(
      finalizeQuickBooksDraft({
        sourceKey: `team-invoice:${payment.id}`,
        journalNo: nextJournalNo('TEAM'),
        entryDate: payment.created_at,
        description,
        lines,
      })
    );
  }

  if (refereePayrollResult.success && refereePayrollResult.data) {
    for (const lineItem of refereePayrollResult.data.lineItems) {
      if (lineItem.paymentStatus === 'paid' && !includePaidPayroll) continue;
      if (lineItem.paymentStatus !== 'paid' && !includePendingPayroll) continue;

      const description = `Referee payroll - ${lineItem.matchup}`;
      const lines: AccountingJournalEntryDraftLine[] = [];
      pushBalancedDraftLines(lines, {
        debitAccount: { type: 'slot', slot: 'refereeExpense' },
        creditAccount: {
          type: 'slot',
          slot: lineItem.paymentStatus === 'paid' ? 'refereeCash' : 'refereePayable',
        },
        amountCents: cents(lineItem.paymentAmountCents),
        description,
        name: lineItem.refereeName,
      });

      drafts.push(
        finalizeQuickBooksDraft({
          sourceKey: `referee-payroll:${lineItem.officialId}:${lineItem.paymentStatus}`,
          journalNo: nextJournalNo('REF'),
          entryDate: lineItem.scheduledAt,
          description,
          lines,
        })
      );
    }
  }

  for (const item of manualItemsResult.items) {
    if (!item.include_in_quickbooks_export) continue;

    const lines: AccountingJournalEntryDraftLine[] = [];
    pushBalancedDraftLines(lines, {
      debitAccount: { type: 'named', name: item.debit_account_name },
      creditAccount: { type: 'named', name: item.credit_account_name },
      amountCents: cents(item.amount_cents),
      description: item.title,
      name: item.quickbooks_name,
      classRef: item.quickbooks_class
        ? { type: 'named', name: item.quickbooks_class }
        : { type: 'default' },
      locationRef: item.quickbooks_location
        ? { type: 'named', name: item.quickbooks_location }
        : { type: 'default' },
    });

    drafts.push(
      finalizeQuickBooksDraft({
        sourceKey: `manual-item:${item.id}`,
        journalNo: nextJournalNo('MANUAL'),
        entryDate: item.entry_date,
        description: item.title,
        lines,
      })
    );
  }

  return {
    leagueName: league.name,
    selectedSeasonName: selectedSeason?.name || 'all-seasons',
    drafts,
  };
}

function buildQuickBooksCsvLines(
  drafts: AccountingJournalEntryDraft[],
  options: QuickBooksExportOptions
) {
  const accountNames: Record<QuickBooksMappingSlot, string> = {
    registrationRevenue: options.registrationRevenueAccount || 'Registration Revenue',
    teamRevenue: options.teamRevenueAccount || 'Team Fee Revenue',
    stripeClearing: options.stripeClearingAccount || 'Stripe Clearing',
    manualDeposit: options.manualDepositAccount || 'Undeposited Funds',
    processingFees: options.processingFeesAccount || 'Processing Fees',
    refereeExpense: options.refereeExpenseAccount || 'Referee Payroll Expense',
    refereePayable: options.refereePayableAccount || 'Accounts Payable',
    refereeCash: options.refereeCashAccount || 'Checking',
  };

  const resolveAccountName = (account: AccountingJournalAccountRef) =>
    account.type === 'slot' ? accountNames[account.slot] : account.name;

  const resolveDimensionName = (
    ref: AccountingJournalDimensionRef,
    defaultName: string | null | undefined
  ) => {
    if (ref.type === 'named') {
      return ref.name;
    }
    if (ref.type === 'default') {
      return defaultName || '';
    }
    return '';
  };

  const lines: QuickBooksJournalLine[] = [];
  drafts.forEach((draft) => {
    draft.lines.forEach((line) => {
      const amount = (cents(line.amountCents) / 100).toFixed(2);
      lines.push({
        journalNo: draft.journalNo,
        journalDate: draft.journalDate,
        accountName: resolveAccountName(line.account),
        description: line.description,
        debits: line.postingType === 'Debit' ? amount : '',
        credits: line.postingType === 'Credit' ? amount : '',
        name: line.name || '',
        className: resolveDimensionName(line.classRef, options.defaultClassName),
        location: resolveDimensionName(line.locationRef, options.defaultLocationName),
      });
    });
  });

  return lines;
}

function buildQuickBooksCsvFileName(leagueName: string, selectedSeasonName: string) {
  const safeLeagueName = leagueName
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const safeSeasonName = selectedSeasonName
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `quickbooks-journal-${safeLeagueName || 'league'}-${safeSeasonName || 'all'}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
}

export async function exportLeagueFinanceQuickBooksCsv(
  options: QuickBooksExportOptions
): Promise<FinanceActionResult<{ fileName: string; csv: string; journalCount: number }>> {
  try {
    const draftData = await buildQuickBooksJournalDrafts({
      leagueId: options.leagueId,
      seasonId: options.seasonId,
      includePendingPayroll: options.includePendingPayroll ?? true,
      includePaidPayroll: options.includePaidPayroll ?? true,
      includeManualItems: options.includeManualItems ?? true,
    });

    return {
      success: true,
      data: {
        fileName: buildQuickBooksCsvFileName(
          draftData.leagueName,
          draftData.selectedSeasonName
        ),
        csv: `\uFEFF${buildQuickBooksCsv(buildQuickBooksCsvLines(draftData.drafts, options))}`,
        journalCount: draftData.drafts.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QuickBooks export.',
    };
  }
}

function resolveQuickBooksAccountRef(
  account: AccountingJournalAccountRef,
  mappings: QuickBooksMappingConfig,
  accounts: QuickBooksAccountOption[]
): FinanceActionResult<QuickBooksResolvedOption> {
  if (account.type === 'slot') {
    const selection = mappings[account.slot];
    if (!selection) {
      return {
        success: false,
        error: `The ${getQuickBooksSlotLabel(account.slot)} account mapping is missing.`,
      };
    }

    const option = findQuickBooksOptionById(accounts, selection.id);
    if (!option) {
      return {
        success: false,
        error: `The mapped ${getQuickBooksSlotLabel(account.slot)} account is no longer available in QuickBooks.`,
      };
    }

    return {
      success: true,
      data: {
        id: option.id,
        name: getQuickBooksOptionDisplayName(option),
      },
    };
  }

  const option = findQuickBooksOptionByName(accounts, account.name);
  if (!option) {
    return {
      success: false,
      error: `QuickBooks account "${account.name}" was not found.`,
    };
  }

  return {
    success: true,
    data: {
      id: option.id,
      name: getQuickBooksOptionDisplayName(option),
    },
  };
}

function resolveQuickBooksDimensionRef(
  type: 'class' | 'location',
  ref: AccountingJournalDimensionRef,
  mappings: QuickBooksMappingConfig,
  options: QuickBooksAccountOption[]
): FinanceActionResult<QuickBooksResolvedOption | null> {
  if (ref.type === 'none') {
    return { success: true, data: null };
  }

  if (ref.type === 'default') {
    const selection = type === 'class' ? mappings.defaultClass : mappings.defaultLocation;
    if (!selection) {
      return { success: true, data: null };
    }

    const option = findQuickBooksOptionById(options, selection.id);
    if (!option) {
      return {
        success: false,
        error: `The default QuickBooks ${type} mapping is no longer available.`,
      };
    }

    return {
      success: true,
      data: {
        id: option.id,
        name: getQuickBooksOptionDisplayName(option),
      },
    };
  }

  const option = findQuickBooksOptionByName(options, ref.name);
  if (!option) {
    return {
      success: false,
      error: `QuickBooks ${type} "${ref.name}" was not found.`,
    };
  }

  return {
    success: true,
    data: {
      id: option.id,
      name: getQuickBooksOptionDisplayName(option),
    },
  };
}

function buildQuickBooksPayloadForDraft(
  draft: AccountingJournalEntryDraft,
  mappings: QuickBooksMappingConfig,
  options: QuickBooksRemoteOptions
): FinanceActionResult<Record<string, unknown>> {
  const lines: Array<Record<string, unknown>> = [];

  for (const line of draft.lines) {
    const accountResult = resolveQuickBooksAccountRef(line.account, mappings, options.accounts);
    if (!accountResult.success) {
      return accountResult;
    }

    const classResult = resolveQuickBooksDimensionRef(
      'class',
      line.classRef,
      mappings,
      options.classes
    );
    if (!classResult.success) {
      return classResult;
    }

    const locationResult = resolveQuickBooksDimensionRef(
      'location',
      line.locationRef,
      mappings,
      options.locations
    );
    if (!locationResult.success) {
      return locationResult;
    }

    lines.push({
      Description: line.description,
      Amount: Number((cents(line.amountCents) / 100).toFixed(2)),
      DetailType: 'JournalEntryLineDetail',
      JournalEntryLineDetail: {
        PostingType: line.postingType,
        AccountRef: {
          value: accountResult.data.id,
          name: accountResult.data.name,
        },
        ...(classResult.data
          ? {
              ClassRef: {
                value: classResult.data.id,
                name: classResult.data.name,
              },
            }
          : {}),
        ...(locationResult.data
          ? {
              DepartmentRef: {
                value: locationResult.data.id,
                name: locationResult.data.name,
              },
            }
          : {}),
      },
    });
  }

  return {
    success: true,
    data: {
      TxnDate: draft.txnDate,
      PrivateNote: draft.description,
      Line: lines,
    },
  };
}

function buildQuickBooksSourceHash(payload: Record<string, unknown>) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export type QuickBooksMappingSelectionInput = Partial<
  Record<QuickBooksMappingSlot | 'defaultClass' | 'defaultLocation', string | null>
>;

export async function startQuickBooksConnect(
  leagueId: string,
  locale = 'en',
  returnTo?: string
): Promise<FinanceActionResult<string>> {
  try {
    const access = await getQuickBooksLeagueAccess(leagueId);
    if (!access.success) {
      return access;
    }
    if (!access.data.canManage) {
      return { success: false, error: 'Only league owners can connect QuickBooks Online.' };
    }

    const configuration = getQuickBooksConfigurationStatus();
    if (!configuration.configured) {
      return {
        success: false,
        error: configuration.message || 'QuickBooks Online is not configured in this environment.',
      };
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const cookieStore = await cookies();
    cookieStore.set(QUICKBOOKS_OAUTH_NONCE_COOKIE, nonce, {
      httpOnly: true,
      maxAge: 60 * 15,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    const safeReturnTo = safeRedirectPath(
      returnTo || `/${locale}/dashboard/leagues/${leagueId}/finance`
    );
    const state = createQuickBooksStateToken({
      leagueId,
      userId: access.data.userId,
      nonce,
      returnTo: safeReturnTo,
    });

    return {
      success: true,
      data: getQuickBooksAuthorizationUrl(state),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start QuickBooks connect.',
    };
  }
}

export async function handleQuickBooksCallback(
  request: NextRequest
): Promise<QuickBooksOAuthCallbackResult> {
  const { searchParams } = new URL(request.url);
  const rawState = searchParams.get('state');
  const state = rawState ? verifyQuickBooksStateToken(rawState) : null;
  const fallbackReturnTo = state?.returnTo || '/en/dashboard';

  const redirectWithError = (message: string) => ({
    redirectTo: appendQuickBooksRedirectParams(fallbackReturnTo, {
      qb_error: message,
    }),
    clearNonceCookie: true,
  });

  const oauthError = searchParams.get('error');
  if (oauthError) {
    return redirectWithError(searchParams.get('error_description') || oauthError);
  }

  if (!state) {
    return {
      redirectTo: appendQuickBooksRedirectParams('/en/dashboard', {
        qb_error: 'QuickBooks authorization could not be verified.',
      }),
      clearNonceCookie: true,
    };
  }

  const nonceCookie = request.cookies.get(QUICKBOOKS_OAUTH_NONCE_COOKIE)?.value;
  if (!nonceCookie || nonceCookie !== state.nonce) {
    return redirectWithError('QuickBooks authorization expired. Start the connection again.');
  }

  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');
  if (!code || !realmId) {
    return redirectWithError('QuickBooks did not return a complete authorization response.');
  }

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user || user.id !== state.userId) {
      return redirectWithError(
        'Your session changed before the QuickBooks connection completed. Try again.'
      );
    }

    const access = await getQuickBooksLeagueAccess(state.leagueId);
    if (!access.success) {
      return redirectWithError(access.error);
    }
    if (!access.data.canManage || access.data.userId !== user.id) {
      return redirectWithError('Only league owners can connect QuickBooks Online.');
    }

    const tokens = await exchangeQuickBooksAuthorizationCode(code);
    const companyInfo = await fetchQuickBooksCompanyInfo(realmId, tokens.accessToken);
    const service = createServiceRoleClient();
    const { error } = await (service as any)
      .from('league_quickbooks_connections')
      .upsert(
        {
          league_id: state.leagueId,
          realm_id: companyInfo.realmId,
          company_name: companyInfo.companyName,
          access_token_encrypted: encryptQuickBooksSecret(tokens.accessToken),
          refresh_token_encrypted: encryptQuickBooksSecret(tokens.refreshToken),
          token_type: tokens.tokenType,
          scopes: tokens.scope,
          access_token_expires_at: tokens.accessTokenExpiresAt,
          refresh_token_expires_at: tokens.refreshTokenExpiresAt,
          status: 'active',
          connected_by: user.id,
          connected_at: new Date().toISOString(),
          disconnected_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'league_id' }
      );

    if (error) {
      throw new Error('Failed to save the QuickBooks connection.');
    }

    revalidateFinancePaths(state.leagueId);
    return {
      redirectTo: appendQuickBooksRedirectParams(state.returnTo, {
        qb: 'connected',
      }),
      clearNonceCookie: true,
    };
  } catch (error) {
    return redirectWithError(
      error instanceof Error ? error.message : 'Failed to connect QuickBooks Online.'
    );
  }
}

export async function getQuickBooksIntegrationStatus(
  leagueId: string
): Promise<FinanceActionResult<QuickBooksIntegrationStatus>> {
  let quickBooksAccess: FinanceQuickBooksAccess | null = null;
  try {
    const access = await getQuickBooksLeagueAccess(leagueId);
    if (!access.success) {
      return access;
    }
    quickBooksAccess = access.data;

    const configuration = getQuickBooksConfigurationStatus();
    const service = createServiceRoleClient();
    const [connectionRow, mappingsRow] = await Promise.all([
      loadQuickBooksConnectionRow(service, leagueId),
      loadQuickBooksMappingsRow(service, leagueId),
    ]);

    const { data: recentRunRows, error: recentRunsError } = await (service as any)
      .from('league_quickbooks_sync_runs')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentRunsError) {
      if (isQuickBooksSchemaUnavailable(recentRunsError)) {
        return {
          success: true,
          data: {
            available: false,
            configurationMessage: getQuickBooksSchemaUnavailableMessage(),
            canManage: access.data.canManage,
            connection: null,
            mappings: null,
            missingMappings: [],
            recentRuns: [],
          },
        };
      }
      throw new Error('Failed to load QuickBooks sync history.');
    }

    const runRows = (recentRunRows || []) as QuickBooksSyncRunRow[];
    const runIds = runRows.map((run) => run.id);
    const { data: failureRows, error: failureRowsError } = runIds.length
      ? await (service as any)
          .from('league_quickbooks_sync_entries')
          .select('*')
          .in('sync_run_id', runIds)
          .in('status', ['failed', 'error'])
          .order('created_at', { ascending: true })
      : { data: [] as QuickBooksSyncEntryRow[], error: null };

    if (failureRowsError) {
      throw new Error('Failed to load QuickBooks sync entry failures.');
    }

    const failuresByRunId = new Map<string, QuickBooksSyncEntry[]>();
    ((failureRows || []) as QuickBooksSyncEntryRow[]).forEach((row) => {
      const current = failuresByRunId.get(row.sync_run_id) || [];
      if (current.length < 5) {
        current.push(toQuickBooksSyncEntry(row));
      }
      failuresByRunId.set(row.sync_run_id, current);
    });

    const mappings = mappingsRow ? parseQuickBooksMappingConfig(mappingsRow.mapping_config) : null;

    return {
      success: true,
      data: {
        available: configuration.configured,
        configurationMessage: configuration.message,
        canManage: access.data.canManage,
        connection: toQuickBooksConnection(connectionRow),
        mappings,
        missingMappings: getMissingQuickBooksMappingSlots(mappings),
        recentRuns: runRows.map((run) =>
          toQuickBooksSyncRun(run, failuresByRunId.get(run.id) || [])
        ),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load QuickBooks integration status.';
    if (message === getQuickBooksSchemaUnavailableMessage()) {
      return {
        success: true,
        data: {
          available: false,
          configurationMessage: message,
          canManage: quickBooksAccess?.canManage ?? false,
          connection: null,
          mappings: null,
          missingMappings: [],
          recentRuns: [],
        },
      };
    }

    return {
      success: false,
      error: message,
    };
  }
}

export async function getQuickBooksMappingOptions(
  leagueId: string
): Promise<FinanceActionResult<QuickBooksMappingOptions>> {
  try {
    const access = await getQuickBooksLeagueAccess(leagueId);
    if (!access.success) {
      return access;
    }
    if (!access.data.canManage) {
      return { success: false, error: 'Only league owners can manage QuickBooks mappings.' };
    }

    const configuration = getQuickBooksConfigurationStatus();
    if (!configuration.configured) {
      return {
        success: false,
        error: configuration.message || 'QuickBooks Online is not configured in this environment.',
      };
    }

    const service = createServiceRoleClient();
    const [connectionRow, mappingsRow] = await Promise.all([
      loadQuickBooksConnectionRow(service, leagueId),
      loadQuickBooksMappingsRow(service, leagueId),
    ]);

    if (!connectionRow || connectionRow.status !== 'active') {
      return {
        success: false,
        error: 'Connect QuickBooks Online before loading account mappings.',
      };
    }

    const remoteOptions = await loadQuickBooksRemoteOptions(service, connectionRow);
    return {
      success: true,
      data: {
        accounts: remoteOptions.accounts,
        classes: remoteOptions.classes,
        locations: remoteOptions.locations,
        current: mappingsRow ? parseQuickBooksMappingConfig(mappingsRow.mapping_config) : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load QuickBooks mapping options.',
    };
  }
}

export async function saveQuickBooksMappings(
  leagueId: string,
  mappingIds: QuickBooksMappingSelectionInput
): Promise<FinanceActionResult<QuickBooksMappingConfig>> {
  try {
    const access = await getQuickBooksLeagueAccess(leagueId);
    if (!access.success) {
      return access;
    }
    if (!access.data.canManage) {
      return { success: false, error: 'Only league owners can manage QuickBooks mappings.' };
    }

    const configuration = getQuickBooksConfigurationStatus();
    if (!configuration.configured) {
      return {
        success: false,
        error: configuration.message || 'QuickBooks Online is not configured in this environment.',
      };
    }

    const service = createServiceRoleClient();
    const connectionRow = await loadQuickBooksConnectionRow(service, leagueId);
    if (!connectionRow || connectionRow.status !== 'active') {
      return {
        success: false,
        error: 'Connect QuickBooks Online before saving account mappings.',
      };
    }

    const remoteOptions = await loadQuickBooksRemoteOptions(service, connectionRow);
    const nextConfig = createEmptyQuickBooksMappingConfig();

    for (const slot of QUICKBOOKS_SYNC_MAPPING_SLOTS) {
      const selectedId = mappingIds[slot];
      const option = findQuickBooksOptionById(remoteOptions.accounts, selectedId || null);
      if (!option) {
        return {
          success: false,
          error: `Select a valid QuickBooks account for ${getQuickBooksSlotLabel(slot)}.`,
        };
      }

      nextConfig[slot] = {
        id: option.id,
        name: getQuickBooksOptionDisplayName(option),
      };
    }

    const defaultClassOption = findQuickBooksOptionById(
      remoteOptions.classes,
      mappingIds.defaultClass || null
    );
    const defaultLocationOption = findQuickBooksOptionById(
      remoteOptions.locations,
      mappingIds.defaultLocation || null
    );

    nextConfig.defaultClass = defaultClassOption
      ? {
          id: defaultClassOption.id,
          name: getQuickBooksOptionDisplayName(defaultClassOption),
        }
      : null;
    nextConfig.defaultLocation = defaultLocationOption
      ? {
          id: defaultLocationOption.id,
          name: getQuickBooksOptionDisplayName(defaultLocationOption),
        }
      : null;

    const { error } = await (service as any).from('league_quickbooks_mappings').upsert(
      {
        league_id: leagueId,
        connection_id: connectionRow.id,
        mapping_config: nextConfig,
        created_by: access.data.userId,
        updated_by: access.data.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'league_id' }
    );

    if (error) {
      throw new Error('Failed to save QuickBooks mappings.');
    }

    revalidateFinancePaths(leagueId);
    return {
      success: true,
      data: nextConfig,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save QuickBooks mappings.',
    };
  }
}

export async function previewQuickBooksJournalSync(
  leagueId: string,
  filters: QuickBooksSyncFilters = {}
): Promise<FinanceActionResult<QuickBooksJournalPreview>> {
  try {
    const access = await getQuickBooksLeagueAccess(leagueId);
    if (!access.success) {
      return access;
    }
    if (!access.data.canManage) {
      return { success: false, error: 'Only league owners can preview QuickBooks syncs.' };
    }

    const configuration = getQuickBooksConfigurationStatus();
    if (!configuration.configured) {
      return {
        success: false,
        error: configuration.message || 'QuickBooks Online is not configured in this environment.',
      };
    }

    const service = createServiceRoleClient();
    const [connectionRow, mappingsRow, draftData] = await Promise.all([
      loadQuickBooksConnectionRow(service, leagueId),
      loadQuickBooksMappingsRow(service, leagueId),
      buildQuickBooksJournalDrafts({
        leagueId,
        seasonId: filters.seasonId,
        includePendingPayroll: filters.includePendingPayroll ?? true,
        includePaidPayroll: filters.includePaidPayroll ?? true,
        includeManualItems: filters.includeManualItems ?? true,
      }),
    ]);

    if (!connectionRow || connectionRow.status !== 'active') {
      return {
        success: false,
        error: 'Connect QuickBooks Online before previewing a sync.',
      };
    }

    const mappings = mappingsRow ? parseQuickBooksMappingConfig(mappingsRow.mapping_config) : null;
    const missingMappings = getMissingQuickBooksMappingSlots(mappings);
    if (!mappings || missingMappings.length > 0) {
      return {
        success: false,
        error: `Finish the required QuickBooks mappings before previewing a sync. Missing: ${missingMappings
          .map(getQuickBooksSlotLabel)
          .join(', ')}.`,
      };
    }

    const remoteOptions = await loadQuickBooksRemoteOptions(service, connectionRow);
    const sourceKeys = draftData.drafts.map((draft) => draft.sourceKey);
    const { data: previousRows, error: previousRowsError } = sourceKeys.length
      ? await (service as any)
          .from('league_quickbooks_sync_entries')
          .select('*')
          .eq('connection_id', remoteOptions.connection.id)
          .eq('status', 'success')
          .in('source_key', sourceKeys)
          .order('created_at', { ascending: false })
      : { data: [] as QuickBooksSyncEntryRow[], error: null };

    if (previousRowsError) {
      throw new Error('Failed to compare this journal preview with prior QuickBooks syncs.');
    }

    const previousBySourceKey = new Map<string, QuickBooksSyncEntryRow>();
    ((previousRows || []) as QuickBooksSyncEntryRow[]).forEach((row) => {
      if (!previousBySourceKey.has(row.source_key)) {
        previousBySourceKey.set(row.source_key, row);
      }
    });

    const previewEntries: QuickBooksSyncEntry[] = [];
    const entryInserts: Array<Record<string, unknown>> = [];

    draftData.drafts.forEach((draft) => {
      const payloadResult = buildQuickBooksPayloadForDraft(draft, mappings, remoteOptions);
      const previous = previousBySourceKey.get(draft.sourceKey);
      let status: QuickBooksSyncEntry['status'] = 'pending';
      let errorText: string | null = null;
      let sourceHash = '';
      let payloadSnapshot: Json = { draft } as Json;

      if (!payloadResult.success) {
        status = 'error';
        errorText = payloadResult.error;
        payloadSnapshot = { draft, error: payloadResult.error } as Json;
      } else {
        sourceHash = buildQuickBooksSourceHash(payloadResult.data);
        payloadSnapshot = { draft, payload: payloadResult.data } as Json;

        if (previous && previous.source_hash === sourceHash) {
          status = 'already_synced';
        } else if (previous) {
          status = 'changed';
          errorText =
            'This journal differs from a previously synced entry. v1 keeps QuickBooks history immutable, so export an adjustment manually.';
        }
      }

      previewEntries.push({
        id: draft.sourceKey,
        sourceKey: draft.sourceKey,
        journalNo: draft.journalNo,
        journalDate: draft.txnDate,
        description: draft.description,
        amountCents: draft.amountCents,
        lineCount: draft.lineCount,
        status,
        errorText,
        qboJournalEntryId: previous?.qbo_journal_entry_id || null,
        syncedAt: previous?.synced_at || null,
      });

      entryInserts.push({
        league_id: leagueId,
        connection_id: remoteOptions.connection.id,
        source_key: draft.sourceKey,
        source_hash: sourceHash || `preview-error:${draft.sourceKey}`,
        journal_no: draft.journalNo,
        journal_date: draft.txnDate,
        description: draft.description,
        amount_cents: draft.amountCents,
        line_count: draft.lineCount,
        status,
        qbo_journal_entry_id: previous?.qbo_journal_entry_id || null,
        payload_snapshot: payloadSnapshot,
        error_text: errorText,
        synced_at: previous?.synced_at || null,
      });
    });

    const counts = getQuickBooksCounts(previewEntries);
    const { data: syncRunData, error: syncRunError } = await (service as any)
      .from('league_quickbooks_sync_runs')
      .insert({
        league_id: leagueId,
        connection_id: remoteOptions.connection.id,
        season_id: filters.seasonId || null,
        requested_by: access.data.userId,
        status: 'preview',
        filters,
        summary: {
          counts,
          canSync: counts.pending > 0,
        },
        preview_count: counts.total,
        pending_count: counts.pending,
        already_synced_count: counts.alreadySynced,
        changed_count: counts.changed,
        synced_count: 0,
        failed_count: counts.failed,
      })
      .select('*')
      .single();

    if (syncRunError || !syncRunData) {
      throw new Error('Failed to create the QuickBooks sync preview.');
    }

    let insertedEntries = [] as QuickBooksSyncEntryRow[];
    if (entryInserts.length > 0) {
      const { data, error } = await (service as any)
        .from('league_quickbooks_sync_entries')
        .insert(entryInserts.map((entry) => ({ ...entry, sync_run_id: syncRunData.id })))
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error('Failed to save the QuickBooks journal preview entries.');
      }

      insertedEntries = (data || []) as QuickBooksSyncEntryRow[];
    }

    revalidateFinancePaths(leagueId);

    return {
      success: true,
      data: {
        previewId: syncRunData.id,
        createdAt: syncRunData.created_at,
        canSync: counts.pending > 0,
        counts: {
          total: counts.total,
          pending: counts.pending,
          alreadySynced: counts.alreadySynced,
          changed: counts.changed,
          failed: counts.failed,
        },
        entries: insertedEntries.map(toQuickBooksSyncEntry),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview QuickBooks sync.',
    };
  }
}

export async function syncQuickBooksJournalBatch(
  leagueId: string,
  previewId: string
): Promise<FinanceActionResult<QuickBooksJournalPreview>> {
  try {
    const access = await getQuickBooksLeagueAccess(leagueId);
    if (!access.success) {
      return access;
    }
    if (!access.data.canManage) {
      return { success: false, error: 'Only league owners can sync QuickBooks journals.' };
    }

    const configuration = getQuickBooksConfigurationStatus();
    if (!configuration.configured) {
      return {
        success: false,
        error: configuration.message || 'QuickBooks Online is not configured in this environment.',
      };
    }

    const service = createServiceRoleClient();
    const connectionRow = await loadQuickBooksConnectionRow(service, leagueId);
    if (!connectionRow || connectionRow.status !== 'active') {
      return {
        success: false,
        error: 'Reconnect QuickBooks Online before syncing journals.',
      };
    }

    const [{ data: syncRunData, error: syncRunError }, { data: syncEntryRows, error: syncEntryError }] =
      await Promise.all([
        (service as any)
          .from('league_quickbooks_sync_runs')
          .select('*')
          .eq('id', previewId)
          .eq('league_id', leagueId)
          .maybeSingle(),
        (service as any)
          .from('league_quickbooks_sync_entries')
          .select('*')
          .eq('sync_run_id', previewId)
          .eq('league_id', leagueId)
          .order('created_at', { ascending: true }),
      ]);

    if (syncRunError || !syncRunData) {
      return { success: false, error: 'QuickBooks preview not found.' };
    }
    if (syncEntryError) {
      throw new Error('Failed to load QuickBooks preview entries.');
    }

    const entryRows = (syncEntryRows || []) as QuickBooksSyncEntryRow[];
    const pendingEntries = entryRows.filter((entry) => entry.status === 'pending');
    if (pendingEntries.length === 0) {
      return {
        success: false,
        error: 'This QuickBooks preview has no pending journals to sync.',
      };
    }

    await (service as any)
      .from('league_quickbooks_sync_runs')
      .update({
        status: 'syncing',
        started_at: syncRunData.started_at || new Date().toISOString(),
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', previewId);

    const tokenState = await ensureQuickBooksAccessToken(service, connectionRow);
    const updatedEntries: QuickBooksSyncEntryRow[] = [];

    for (const entry of entryRows) {
      if (entry.status !== 'pending') {
        updatedEntries.push(entry);
        continue;
      }

      const payload = ((entry.payload_snapshot as Record<string, unknown>)?.payload ||
        entry.payload_snapshot) as Record<string, unknown>;

      try {
        const response = await createQuickBooksJournalEntry(
          tokenState.connection.realm_id,
          tokenState.accessToken,
          payload
        );

        const { data, error } = await (service as any)
          .from('league_quickbooks_sync_entries')
          .update({
            status: 'success',
            qbo_journal_entry_id: response.id || null,
            response_snapshot: response.payload,
            error_text: null,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.id)
          .select('*')
          .single();

        if (error || !data) {
          throw new Error('Failed to record the QuickBooks sync result.');
        }

        updatedEntries.push(data as QuickBooksSyncEntryRow);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'QuickBooks rejected this journal entry.';
        const { data } = await (service as any)
          .from('league_quickbooks_sync_entries')
          .update({
            status: 'failed',
            error_text: message,
            response_snapshot: {
              message,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.id)
          .select('*')
          .single();

        updatedEntries.push(
          (data || { ...entry, status: 'failed', error_text: message }) as QuickBooksSyncEntryRow
        );
      }
    }

    const previewEntries = updatedEntries.map(toQuickBooksSyncEntry);
    const summary = buildQuickBooksSyncSummary(previewEntries);
    const syncedCount = previewEntries.filter((entry) => entry.status === 'success').length;
    const hasFailures = summary.failedCount > 0;
    const hasChanged = summary.changedCount > 0;
    const hasAlreadySynced = summary.alreadySyncedCount > 0;
    const finalStatus: QuickBooksSyncRun['status'] =
      syncedCount > 0 && (hasFailures || hasChanged || hasAlreadySynced)
        ? 'partial'
        : syncedCount > 0 && !hasFailures
          ? 'success'
          : hasFailures
            ? 'failed'
            : 'partial';

    await (service as any)
      .from('league_quickbooks_sync_runs')
      .update({
        status: finalStatus,
        summary: {
          syncedCount,
          failedCount: summary.failedCount,
          changedCount: summary.changedCount,
          alreadySyncedCount: summary.alreadySyncedCount,
        },
        preview_count: summary.previewCount,
        pending_count: summary.pendingCount,
        already_synced_count: summary.alreadySyncedCount,
        changed_count: summary.changedCount,
        synced_count: syncedCount,
        failed_count: summary.failedCount,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', previewId);

    if (syncedCount > 0) {
      await (service as any)
        .from('league_quickbooks_connections')
        .update({
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenState.connection.id);
    }

    revalidateFinancePaths(leagueId);

    return {
      success: true,
      data: {
        previewId,
        createdAt: syncRunData.created_at,
        canSync: summary.pendingCount > 0,
        counts: {
          total: summary.previewCount,
          pending: summary.pendingCount,
          alreadySynced: summary.alreadySyncedCount,
          changed: summary.changedCount,
          failed: summary.failedCount,
        },
        entries: previewEntries,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync QuickBooks journals.',
    };
  }
}

export async function disconnectQuickBooks(
  leagueId: string
): Promise<FinanceActionResult<void>> {
  try {
    const access = await getQuickBooksLeagueAccess(leagueId);
    if (!access.success) {
      return access;
    }
    if (!access.data.canManage) {
      return { success: false, error: 'Only league owners can disconnect QuickBooks Online.' };
    }

    const service = createServiceRoleClient();
    const connectionRow = await loadQuickBooksConnectionRow(service, leagueId);
    if (!connectionRow) {
      return { success: true, data: undefined };
    }

    try {
      if (connectionRow.refresh_token_encrypted) {
        await revokeQuickBooksToken(decryptQuickBooksSecret(connectionRow.refresh_token_encrypted));
      } else if (connectionRow.access_token_encrypted) {
        await revokeQuickBooksToken(decryptQuickBooksSecret(connectionRow.access_token_encrypted));
      }
    } catch {
      // Keep the local disconnect path resilient even if token revocation fails.
    }

    const { error } = await (service as any)
      .from('league_quickbooks_connections')
      .update({
        status: 'disconnected',
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        token_type: null,
        scopes: [],
        access_token_expires_at: null,
        refresh_token_expires_at: null,
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionRow.id);

    if (error) {
      throw new Error('Failed to disconnect QuickBooks Online.');
    }

    revalidateFinancePaths(leagueId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect QuickBooks Online.',
    };
  }
}
