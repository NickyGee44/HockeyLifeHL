import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}));

jest.mock('../permissions', () => ({
  verifyLeagueOwnerAccess: jest.fn(),
}));

jest.mock('../referee-management', () => ({
  getRefereePayrollReport: jest.fn(),
}));

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '../permissions';
import { getRefereePayrollReport } from '../referee-management';
import { getLeagueFinanceLedger } from '../league-finance';

function createThenableBuilder<T>(result: T, methods: string[] = []) {
  const builder: Record<string, jest.Mock | unknown> = {
    then: (onFulfilled?: (value: T) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };

  for (const method of methods) {
    builder[method] = jest.fn(() => builder);
  }

  return builder as Record<string, jest.Mock>;
}

function buildFinanceServiceClient(options: {
  seasons?: Array<Record<string, unknown>>;
  playerPayments?: Array<Record<string, unknown>>;
  invoices?: Array<Record<string, unknown>>;
  stripePayments?: Array<Record<string, unknown>>;
  manualItems?: Array<Record<string, unknown>>;
  paymentTransactions?: Array<Record<string, unknown>>;
  invoicePayments?: Array<Record<string, unknown>>;
} = {}) {
  const leagueResult = {
    data: {
      id: 'league-1',
      name: 'League One',
    },
    error: null,
  };
  const leagueQuery = createThenableBuilder(leagueResult, ['eq']);
  leagueQuery.single = jest.fn().mockResolvedValue(leagueResult);

  const seasonsResult = {
    data: options.seasons ?? [
      {
        id: 'season-1',
        name: 'Winter 2026',
        status: 'active',
        start_date: null,
        end_date: null,
      },
    ],
    error: null,
  };
  const seasonsQuery = createThenableBuilder(seasonsResult, ['eq', 'order']);

  const playerPaymentsResult = {
    data: options.playerPayments ?? [],
    error: null,
  };
  const playerPaymentsQuery = createThenableBuilder(playerPaymentsResult, ['eq', 'is']);

  const invoicesResult = {
    data: options.invoices ?? [],
    error: null,
  };
  const invoicesQuery = createThenableBuilder(invoicesResult, ['eq']);

  const stripePaymentsResult = {
    data: options.stripePayments ?? [],
    error: null,
  };
  const stripePaymentsQuery = createThenableBuilder(stripePaymentsResult, ['eq', 'gte', 'lte']);

  const manualItemsResult = {
    data: options.manualItems ?? [],
    error: null,
  };
  const manualItemsQuery = createThenableBuilder(manualItemsResult, ['eq', 'order', 'or']);

  const paymentTransactionsResult = {
    data: options.paymentTransactions ?? [],
    error: null,
  };
  const paymentTransactionsQuery = createThenableBuilder(paymentTransactionsResult, ['in']);

  const invoicePaymentsResult = {
    data: options.invoicePayments ?? [],
    error: null,
  };
  const invoicePaymentsQuery = createThenableBuilder(invoicePaymentsResult, ['in']);

  const serviceClient = {
    from: jest.fn((table: string) => {
      switch (table) {
        case 'leagues':
          return {
            select: jest.fn(() => leagueQuery),
          };
        case 'seasons':
          return {
            select: jest.fn(() => seasonsQuery),
          };
        case 'player_payments':
          return {
            select: jest.fn(() => playerPaymentsQuery),
          };
        case 'team_invoices':
          return {
            select: jest.fn(() => invoicesQuery),
          };
        case 'stripe_connect_payments':
          return {
            select: jest.fn(() => stripePaymentsQuery),
          };
        case 'league_finance_custom_items':
          return {
            select: jest.fn(() => manualItemsQuery),
          };
        case 'payment_transactions':
          return {
            select: jest.fn(() => paymentTransactionsQuery),
          };
        case 'team_invoice_payments':
          return {
            select: jest.fn(() => invoicePaymentsQuery),
          };
        default:
          throw new Error(`Unexpected finance table: ${table}`);
      }
    }),
  };

  return {
    serviceClient,
    mocks: {
      invoicePaymentsQuery,
      invoicesQuery,
      leagueQuery,
      manualItemsQuery,
      paymentTransactionsQuery,
      playerPaymentsQuery,
      seasonsQuery,
      stripePaymentsQuery,
    },
  };
}

describe('league finance ledger', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;
  const mockVerifyLeagueOwnerAccess = verifyLeagueOwnerAccess as jest.MockedFunction<
    typeof verifyLeagueOwnerAccess
  >;
  const mockGetRefereePayrollReport = getRefereePayrollReport as jest.MockedFunction<
    typeof getRefereePayrollReport
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyLeagueOwnerAccess.mockResolvedValue({
      authorized: true,
      userId: 'user-1',
    } as never);
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'owner@example.com',
            },
          },
        }),
      },
    } as never);
    mockGetRefereePayrollReport.mockResolvedValue({
      success: true,
      data: {
        lineItems: [],
      },
    } as never);
  });

  it('builds a combined ledger and excludes archived payments by default', async () => {
    const { serviceClient, mocks } = buildFinanceServiceClient({
      playerPayments: [
        {
          id: 'payment-1',
          player_id: 'player-1',
          team_id: 'team-1',
          season_id: 'season-1',
          status: 'paid',
          amount_paid_cents: 12000,
          total_amount_cents: 12000,
          currency: 'CAD',
          created_at: '2026-03-20T12:00:00.000Z',
          paid_at: '2026-03-21T12:00:00.000Z',
          archived_at: null,
          archived_reason: null,
          player: {
            id: 'player-1',
            full_name: 'Jordan Skater',
            email: 'jordan@example.com',
          },
          team: {
            id: 'team-1',
            name: 'Ice Wolves',
          },
          season_fee: {
            id: 'fee-1',
            name: 'Registration',
          },
        },
        {
          id: 'payment-2',
          player_id: 'player-2',
          team_id: null,
          season_id: 'season-1',
          status: 'paid',
          amount_paid_cents: 4500,
          total_amount_cents: 4500,
          currency: 'CAD',
          created_at: '2026-03-18T12:00:00.000Z',
          paid_at: '2026-03-19T12:00:00.000Z',
          archived_at: null,
          archived_reason: null,
          player: {
            id: 'player-2',
            full_name: 'Taylor Goalie',
            email: 'taylor@example.com',
          },
          team: null,
          season_fee: {
            id: 'fee-2',
            name: 'Late Fee',
          },
        },
      ],
      invoices: [
        {
          id: 'invoice-1',
          team_id: 'team-3',
          season_id: 'season-1',
          total_amount_cents: 30000,
          amount_paid_cents: 20000,
          status: 'partial',
          team: {
            id: 'team-3',
            name: 'Northern Lights',
          },
        },
      ],
      stripePayments: [
        {
          id: 'stripe-1',
          amount_cents: 12000,
          application_fee_cents: 360,
          status: 'succeeded',
          description: 'Stripe fee',
          customer_email: 'jordan@example.com',
          currency: 'CAD',
          created_at: '2026-03-22T12:00:00.000Z',
        },
      ],
      manualItems: [
        {
          id: 'manual-1',
          league_id: 'league-1',
          season_id: 'season-1',
          impact_type: 'expense',
          title: 'Arena Repair',
          description: null,
          entry_date: '2026-03-16',
          amount_cents: 9000,
          currency: 'CAD',
          debit_account_name: 'Repairs',
          credit_account_name: 'Cash',
          quickbooks_name: null,
          quickbooks_class: null,
          quickbooks_location: null,
          reference_number: null,
          notes: 'Board glass replacement',
          include_in_quickbooks_export: true,
          created_at: '2026-03-16T10:00:00.000Z',
          updated_at: '2026-03-16T10:00:00.000Z',
        },
      ],
      paymentTransactions: [
        {
          id: 'txn-1',
          player_payment_id: 'payment-1',
          transaction_type: 'payment',
          amount_cents: 12000,
          application_fee_cents: 360,
          status: 'succeeded',
          created_at: '2026-03-21T12:00:00.000Z',
          completed_at: '2026-03-21T12:05:00.000Z',
          description: 'Registration payment',
        },
        {
          id: 'txn-2',
          player_payment_id: 'payment-1',
          transaction_type: 'refund',
          amount_cents: 1500,
          application_fee_cents: 0,
          status: 'refunded',
          created_at: '2026-03-23T12:00:00.000Z',
          completed_at: '2026-03-23T12:05:00.000Z',
          description: 'Partial refund',
        },
      ],
      invoicePayments: [
        {
          id: 'invoice-payment-1',
          team_invoice_id: 'invoice-1',
          amount_cents: 20000,
          payment_method: 'etransfer',
          reference_number: 'EFT-100',
          notes: null,
          created_at: '2026-03-17T12:00:00.000Z',
        },
      ],
    });

    mockCreateServiceRoleClient.mockImplementation(() => serviceClient as never);
    mockGetRefereePayrollReport.mockResolvedValue({
      success: true,
      data: {
        lineItems: [
          {
            officialId: 'official-1',
            scheduledAt: '2026-03-15T19:00:00.000Z',
            role: 'Referee',
            matchup: 'Ice Wolves vs Northern Lights',
            refereeName: 'Morgan Ref',
            paymentStatus: 'paid',
            paymentAmountCents: 7000,
            venue: 'Main Rink',
            paymentRuleApplied: 'Standard',
          },
        ],
      },
    } as never);

    const result = await getLeagueFinanceLedger('league-1', {
      seasonId: 'season-1',
      limit: 20,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }

    expect(result.data.total).toBe(7);
    expect(result.data.rows.map((row) => row.source)).toEqual(
      expect.arrayContaining([
        'player_payment',
        'refund',
        'team_invoice_payment',
        'stripe_fee',
        'manual_item',
        'referee_payroll',
      ])
    );
    expect(result.data.rows.find((row) => row.id === 'manual-player-payment-2')).toMatchObject({
      counterparty: 'Taylor Goalie',
      note: 'Recorded without transaction history.',
      source: 'player_payment',
    });
    expect(mocks.playerPaymentsQuery.is).toHaveBeenCalledWith('archived_at', null);
  });

  it('includes archived player-payment rows when requested and preserves drilldown links', async () => {
    const { serviceClient, mocks } = buildFinanceServiceClient({
      playerPayments: [
        {
          id: 'payment-archived',
          player_id: 'player-3',
          team_id: null,
          season_id: 'season-1',
          status: 'paid',
          amount_paid_cents: 2500,
          total_amount_cents: 2500,
          currency: 'CAD',
          created_at: '2026-03-24T12:00:00.000Z',
          paid_at: '2026-03-24T14:00:00.000Z',
          archived_at: '2026-03-25T09:00:00.000Z',
          archived_reason: 'Duplicate charge entry',
          player: {
            id: 'player-3',
            full_name: 'Archived Player',
            email: 'archived@example.com',
          },
          team: null,
          season_fee: {
            id: 'fee-3',
            name: 'Archived registration',
          },
        },
      ],
      invoices: [],
      stripePayments: [],
      manualItems: [],
      paymentTransactions: [],
      invoicePayments: [],
    });

    mockCreateServiceRoleClient.mockImplementation(() => serviceClient as never);

    const result = await getLeagueFinanceLedger('league-1', {
      seasonId: 'season-1',
      includeArchived: true,
      source: 'player_payment',
      status: 'paid',
      query: 'duplicate',
      limit: 10,
    });

    expect(result).toEqual({
      success: true,
      data: {
        rows: [
          expect.objectContaining({
            id: 'manual-player-payment-archived',
            archived: true,
            source: 'player_payment',
            status: 'paid',
            note: 'Archived: Duplicate charge entry',
            href: expect.stringContaining('payment=payment-archived'),
          }),
        ],
        total: 1,
      },
    });
    expect(mocks.playerPaymentsQuery.is).not.toHaveBeenCalled();
    if (result.success) {
      expect(result.data.rows[0]?.href).toContain('archived=1');
    }
  });
});
