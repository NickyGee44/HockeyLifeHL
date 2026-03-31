import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock('../permissions', () => ({
  verifyLeagueOwnerAccess: jest.fn(),
}));

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '../permissions';
import { createDivision } from '../divisions';

type QueryCall = {
  table: string;
  action: string;
  payload?: unknown;
  filters: Array<{ type: string; column?: string; value?: unknown }>;
};

type QueryResult = {
  data?: unknown;
  error?: { code?: string | null; message?: string | null } | null;
  count?: number | null;
};

type QueryHandler = (call: QueryCall) => QueryResult | undefined;

class MockSupabaseQueryBuilder {
  private readonly call: QueryCall;

  constructor(
    private readonly table: string,
    private readonly handlers: QueryHandler[],
    private readonly calls: QueryCall[],
  ) {
    this.call = {
      table,
      action: 'select',
      filters: [],
    };
  }

  select(selection?: unknown) {
    if (this.call.action === 'select') {
      this.call.payload = selection;
    }
    return this;
  }

  insert(payload: unknown) {
    this.call.action = 'insert';
    this.call.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.call.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.call.filters.push({ type: 'neq', column, value });
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.resolve());
  }

  single() {
    return Promise.resolve(this.resolve());
  }

  private resolve() {
    const snapshot: QueryCall = {
      table: this.call.table,
      action: this.call.action,
      payload: this.call.payload,
      filters: [...this.call.filters],
    };

    this.calls.push(snapshot);

    for (const handler of this.handlers) {
      const result = handler(snapshot);
      if (result !== undefined) {
        return result;
      }
    }

    throw new Error(
      `Unhandled query: ${snapshot.action} on ${snapshot.table} with filters ${JSON.stringify(snapshot.filters)}`
    );
  }
}

function createMockSupabaseClient(handlers: QueryHandler[]) {
  const calls: QueryCall[] = [];

  return {
    calls,
    from: jest.fn((table: string) => new MockSupabaseQueryBuilder(table, handlers, calls)),
  };
}

describe('division actions', () => {
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;
  const mockVerifyLeagueOwnerAccess = verifyLeagueOwnerAccess as jest.MockedFunction<
    typeof verifyLeagueOwnerAccess
  >;
  const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockVerifyLeagueOwnerAccess.mockResolvedValue({
      authorized: true,
      accessType: 'league_admin',
    } as never);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('rejects createDivision before creating a service client when unauthorized', async () => {
    mockVerifyLeagueOwnerAccess.mockResolvedValue({
      authorized: false,
      error: 'Not authorized',
    } as never);

    const result = await createDivision({
      leagueId: 'league-1',
      name: 'Division A',
    });

    expect(result).toEqual({ success: false, error: 'Not authorized' });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it('maps database duplicate errors to a friendly message', async () => {
    const mockClient = createMockSupabaseClient([
      (call) =>
        call.table === 'divisions' && call.action === 'select'
          ? { data: null, error: null }
          : undefined,
      (call) =>
        call.table === 'divisions' && call.action === 'insert'
          ? {
              data: null,
              error: { code: '23505', message: 'duplicate key value violates unique constraint' },
            }
          : undefined,
    ]);

    mockCreateServiceRoleClient.mockReturnValue(mockClient as never);

    const result = await createDivision({
      leagueId: 'league-1',
      name: 'Division A',
    });

    expect(result).toEqual({
      success: false,
      error: 'A division with this name already exists in the league',
    });
  });

  it('creates divisions with the service client and revalidates the dashboard path', async () => {
    let insertPayload: unknown;

    const mockClient = createMockSupabaseClient([
      (call) =>
        call.table === 'divisions' && call.action === 'select'
          ? { data: null, error: null }
          : undefined,
      (call) => {
        if (call.table === 'divisions' && call.action === 'insert') {
          insertPayload = call.payload;
          return {
            data: {
              id: 'division-1',
              league_id: 'league-1',
              name: 'Division A',
              description: 'Competitive',
              skill_level: null,
              max_teams: null,
              game_duration_minutes: 60,
              period_count: 3,
              created_at: null,
              updated_at: null,
            },
            error: null,
          };
        }

        return undefined;
      },
    ]);

    mockCreateServiceRoleClient.mockReturnValue(mockClient as never);

    const result = await createDivision({
      leagueId: 'league-1',
      name: '  Division A  ',
      description: 'Competitive',
    });

    expect(result).toEqual({
      success: true,
      data: {
        id: 'division-1',
        league_id: 'league-1',
        name: 'Division A',
        description: 'Competitive',
        skill_level: null,
        max_teams: null,
        game_duration_minutes: 60,
        period_count: 3,
        created_at: null,
        updated_at: null,
      },
    });

    expect(insertPayload).toMatchObject({
      league_id: 'league-1',
      name: 'Division A',
      description: 'Competitive',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/leagues/league-1/divisions');
  });
});
