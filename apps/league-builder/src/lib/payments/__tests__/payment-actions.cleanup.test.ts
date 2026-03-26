import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/stripe/client', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    refunds: {
      create: jest.fn(),
    },
    invoiceItems: {
      create: jest.fn(),
    },
    invoices: {
      create: jest.fn(),
      finalizeInvoice: jest.fn(),
    },
  },
}));

jest.mock('@/lib/stripe/idempotency', () => ({
  generateIdempotencyKey: jest.fn(() => 'test-idempotency-key'),
}));

jest.mock('@/lib/leagues/stripe-connect', () => ({
  calculateApplicationFee: jest.fn(() => 0),
}));

jest.mock('@/lib/payments/team-contributions', () => ({
  buildRegistrationPaymentStatus: jest.fn(() => 'pending'),
  recalculateTeamInvoiceForTeam: jest.fn().mockResolvedValue(undefined),
}));

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { paymentCleanupTestables } from '../payment-cleanup-helpers';
import {
  archivePlayerPayment,
  getPaymentSummary,
  permanentlyDeletePlayerPayment,
} from '../payment-actions';

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

function buildPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    league_id: 'league-1',
    season_id: 'season-1',
    player_id: 'player-1',
    season_fee_id: 'fee-1',
    team_id: 'team-1',
    status: 'pending',
    total_amount_cents: 12000,
    amount_paid_cents: 0,
    currency: 'CAD',
    payment_plan: 'full',
    notes: null,
    archived_at: null,
    archived_by: null,
    archived_reason: null,
    paid_at: null,
    created_at: '2026-03-25T12:00:00.000Z',
    updated_at: '2026-03-25T12:00:00.000Z',
    ...overrides,
  };
}

function buildAppClient(options: {
  payment?: Record<string, unknown> | null;
  paymentError?: unknown;
  membership?: Record<string, unknown> | null;
  membershipError?: unknown;
  summaryRows?: Array<Record<string, unknown>>;
  summaryError?: unknown;
  userId?: string | null;
} = {}) {
  const paymentResult = {
    data: options.payment ?? null,
    error: options.paymentError ?? null,
  };
  const paymentQuery = createThenableBuilder(paymentResult, ['eq']);
  paymentQuery.single = jest.fn().mockResolvedValue(paymentResult);

  const summaryResult = {
    data: options.summaryRows ?? [],
    error: options.summaryError ?? null,
  };
  const summaryQuery = createThenableBuilder(summaryResult, ['eq', 'is']);

  const membershipResult = {
    data:
      options.membership === undefined
        ? { role: 'admin', status: 'active' }
        : options.membership,
    error: options.membershipError ?? null,
  };
  const membershipQuery = createThenableBuilder(membershipResult, ['eq']);
  membershipQuery.single = jest.fn().mockResolvedValue(membershipResult);

  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user:
            options.userId === null
              ? null
              : {
                  id: options.userId ?? 'user-1',
                  email: 'user@example.com',
                },
        },
      }),
    },
    from: jest.fn((table: string) => {
      switch (table) {
        case 'player_payments':
          return {
            select: jest.fn((columns?: string) =>
              columns === '*' ? paymentQuery : summaryQuery
            ),
          };
        case 'league_memberships':
          return {
            select: jest.fn(() => membershipQuery),
          };
        default:
          throw new Error(`Unexpected app client table: ${table}`);
      }
    }),
  };

  return {
    client,
    paymentQuery,
    summaryQuery,
    membershipQuery,
  };
}

function buildServiceClient(options: {
  transactions?: Array<Record<string, unknown>>;
  transactionsError?: unknown;
  updatedPayment?: Record<string, unknown> | null;
  updateError?: unknown;
  disputeCount?: number;
  disputeError?: unknown;
  deletionLog?: Record<string, unknown> | null;
  deletionLogError?: unknown;
  deleteError?: unknown;
} = {}) {
  const transactionsResult = {
    data: options.transactions ?? [],
    error: options.transactionsError ?? null,
  };
  const transactionsQuery = createThenableBuilder(transactionsResult, ['eq']);

  const disputesResult = {
    count: options.disputeCount ?? 0,
    error: options.disputeError ?? null,
  };
  const disputesQuery = createThenableBuilder(disputesResult, ['eq']);

  const updateResult = {
    data: options.updatedPayment ?? null,
    error: options.updateError ?? null,
  };
  const updateBuilder = createThenableBuilder(updateResult, ['eq', 'select']);
  updateBuilder.single = jest.fn().mockResolvedValue(updateResult);

  const deletionLogResult = {
    data: options.deletionLog ?? { id: 'delete-log-1' },
    error: options.deletionLogError ?? null,
  };
  const deletionLogBuilder = createThenableBuilder(deletionLogResult, ['select']);
  deletionLogBuilder.single = jest.fn().mockResolvedValue(deletionLogResult);

  const deleteResult = {
    error: options.deleteError ?? null,
  };
  const deleteBuilder = createThenableBuilder(deleteResult, ['eq']);

  const auditInsert = jest.fn().mockResolvedValue({ error: null });
  const deletionInsert = jest.fn(() => deletionLogBuilder);
  const update = jest.fn(() => updateBuilder);
  const remove = jest.fn(() => deleteBuilder);

  const client = {
    from: jest.fn((table: string) => {
      switch (table) {
        case 'payment_transactions':
          return {
            select: jest.fn(() => transactionsQuery),
          };
        case 'payment_disputes':
          return {
            select: jest.fn(() => disputesQuery),
          };
        case 'player_payments':
          return {
            update,
            delete: remove,
          };
        case 'player_payment_audit_log':
          return {
            insert: auditInsert,
          };
        case 'player_payment_deletion_log':
          return {
            insert: deletionInsert,
          };
        default:
          throw new Error(`Unexpected service client table: ${table}`);
      }
    }),
  };

  return {
    client,
    mocks: {
      auditInsert,
      deletionInsert,
      deleteBuilder,
      disputesQuery,
      remove,
      transactionsQuery,
      update,
      updateBuilder,
    },
  };
}

describe('payment cleanup actions', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;
  const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks archiving when a payment has successful or refund history', () => {
    expect(
      paymentCleanupTestables.canArchivePayment(
        buildPayment(),
        [{ id: 'txn-1', status: 'succeeded', transaction_type: 'payment' }]
      )
    ).toBe('Payments with successful charge or refund history cannot be archived.');

    expect(
      paymentCleanupTestables.canArchivePayment(
        buildPayment(),
        [{ id: 'txn-2', status: 'pending', transaction_type: 'refund' }]
      )
    ).toBe('Payments with successful charge or refund history cannot be archived.');
  });

  it('blocks permanent deletion when the payment still has dispute history', () => {
    expect(
      paymentCleanupTestables.canPermanentlyDeletePayment(
        buildPayment({
          status: 'cancelled',
          archived_at: '2026-03-25T12:30:00.000Z',
        }),
        [],
        1
      )
    ).toBe('Payments with dispute history cannot be permanently deleted.');
  });

  it('allows a league admin to archive an unpaid payment and revalidates finance paths', async () => {
    const payment = buildPayment();
    const archivedPayment = buildPayment({
      status: 'cancelled',
      archived_at: '2026-03-25T13:00:00.000Z',
      archived_by: 'user-1',
      archived_reason: 'Created in error',
      notes: '[Archived] Created in error',
    });

    const { client: appClient } = buildAppClient({
      payment,
      membership: { role: 'admin', status: 'active' },
      userId: 'user-1',
    });
    const { client: serviceClient, mocks } = buildServiceClient({
      transactions: [],
      updatedPayment: archivedPayment,
    });

    mockCreateClient.mockResolvedValue(appClient as never);
    mockCreateServiceRoleClient.mockImplementation(() => serviceClient as never);

    const result = await archivePlayerPayment({
      paymentId: 'payment-1',
      reason: 'Created in error',
    });

    expect(result).toEqual({
      success: true,
      data: archivedPayment,
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        archived_by: 'user-1',
        archived_reason: 'Created in error',
        notes: '[Archived] Created in error',
      })
    );
    expect(mocks.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'payment_archived',
        league_id: 'league-1',
        player_payment_id: 'payment-1',
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/leagues/league-1/payments');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/leagues/league-1/finance');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/leagues/league-1/billing');
  });

  it('aggregates the payment summary from active records only', async () => {
    const { client: appClient, summaryQuery } = buildAppClient({
      summaryRows: [
        {
          status: 'paid',
          total_amount_cents: 12000,
          amount_paid_cents: 12000,
        },
        {
          status: 'partially_paid',
          total_amount_cents: 14000,
          amount_paid_cents: 5000,
        },
        {
          status: 'overdue',
          total_amount_cents: 10000,
          amount_paid_cents: 0,
        },
        {
          status: 'processing',
          total_amount_cents: 7000,
          amount_paid_cents: 0,
        },
      ],
    });

    mockCreateClient.mockResolvedValue(appClient as never);

    const result = await getPaymentSummary('league-1', 'season-1');

    expect(result).toEqual({
      success: true,
      data: {
        totalExpectedCents: 43000,
        totalCollectedCents: 17000,
        totalOutstandingCents: 26000,
        playersPaidFull: 1,
        playersPartial: 1,
        playersPending: 1,
        playersOverdue: 1,
      },
    });
    expect(summaryQuery.is).toHaveBeenCalledWith('archived_at', null);
  });

  it('rejects permanent deletion for non-owner league members', async () => {
    const payment = buildPayment({
      status: 'cancelled',
      archived_at: '2026-03-25T13:00:00.000Z',
      archived_reason: 'Created in error',
    });
    const { client: appClient } = buildAppClient({
      payment,
      membership: { role: 'admin', status: 'active' },
      userId: 'user-1',
    });

    mockCreateClient.mockResolvedValue(appClient as never);
    mockCreateServiceRoleClient.mockImplementation(
      () => buildServiceClient().client as never
    );

    const result = await permanentlyDeletePlayerPayment({
      paymentId: 'payment-1',
      reason: 'Cleanup duplicate',
      confirmationText: 'DELETE',
    });

    expect(result).toEqual({
      success: false,
      error: 'Only league owners can permanently delete payment records.',
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('stores a deletion snapshot and removes an eligible archived payment for league owners', async () => {
    const payment = buildPayment({
      status: 'cancelled',
      archived_at: '2026-03-25T13:00:00.000Z',
      archived_by: 'user-1',
      archived_reason: 'Duplicate draft entry',
    });
    const { client: appClient } = buildAppClient({
      payment,
      membership: { role: 'owner', status: 'active' },
      userId: 'user-1',
    });
    const { client: serviceClient, mocks } = buildServiceClient({
      transactions: [],
      disputeCount: 0,
      deletionLog: { id: 'delete-log-1' },
    });

    mockCreateClient.mockResolvedValue(appClient as never);
    mockCreateServiceRoleClient.mockImplementation(() => serviceClient as never);

    const result = await permanentlyDeletePlayerPayment({
      paymentId: 'payment-1',
      reason: 'Duplicate draft entry',
      confirmationText: 'delete',
    });

    expect(result).toEqual({
      success: true,
      data: undefined,
    });
    expect(mocks.deletionInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        player_payment_id: 'payment-1',
        delete_reason: 'Duplicate draft entry',
        deleted_by: 'user-1',
      })
    );
    expect(mocks.remove).toHaveBeenCalled();
    expect(mocks.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'payment_permanently_deleted',
        player_payment_id: 'payment-1',
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/leagues/league-1/payments');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/leagues/league-1/finance');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/leagues/league-1/billing');
  });
});
