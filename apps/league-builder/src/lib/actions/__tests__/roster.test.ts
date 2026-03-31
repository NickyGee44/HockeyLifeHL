import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}));

jest.mock('../permissions', () => ({
  verifyCaptainOrAdminAccess: jest.fn(),
}));

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyCaptainOrAdminAccess } from '../permissions';
import { addPlayerToRoster } from '../roster';

type RpcCall = {
  fn: string;
  args: Record<string, unknown>;
};

type QueryCall = {
  table: string;
  action: 'select' | 'insert';
  payload?: unknown;
  filters: Array<{ column: string; value: unknown }>;
};

class MockRosterQueryBuilder {
  private action: 'select' | 'insert' = 'select';
  private payload: unknown;
  private readonly filters: Array<{ column: string; value: unknown }> = [];

  constructor(
    private readonly table: string,
    private readonly queryHandlers: Array<(call: QueryCall) => unknown>,
    private readonly queryCalls: QueryCall[]
  ) {}

  select(payload?: unknown) {
    if (this.action === 'select') {
      this.payload = payload;
    }
    return this;
  }

  insert(payload: unknown) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  single() {
    const call: QueryCall = {
      table: this.table,
      action: this.action,
      payload: this.payload,
      filters: [...this.filters],
    };

    this.queryCalls.push(call);

    for (const handler of this.queryHandlers) {
      const result = handler(call);
      if (result !== undefined) {
        return Promise.resolve(result);
      }
    }

    throw new Error(`Unhandled query for ${this.table} (${this.action})`);
  }
}

function createMockServiceClient({
  rpcHandlers,
  queryHandlers,
}: {
  rpcHandlers: Array<(call: RpcCall) => unknown>;
  queryHandlers: Array<(call: QueryCall) => unknown>;
}) {
  const rpcCalls: RpcCall[] = [];
  const queryCalls: QueryCall[] = [];

  return {
    rpcCalls,
    queryCalls,
    rpc: jest.fn((fn: string, args: Record<string, unknown>) => {
      const call = { fn, args };
      rpcCalls.push(call);

      for (const handler of rpcHandlers) {
        const result = handler(call);
        if (result !== undefined) {
          return Promise.resolve(result);
        }
      }

      throw new Error(`Unhandled rpc ${fn}`);
    }),
    from: jest.fn(
      (table: string) => new MockRosterQueryBuilder(table, queryHandlers, queryCalls)
    ),
  };
}

describe('addPlayerToRoster', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;
  const mockVerifyCaptainOrAdminAccess = verifyCaptainOrAdminAccess as jest.MockedFunction<
    typeof verifyCaptainOrAdminAccess
  >;
  const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockVerifyCaptainOrAdminAccess.mockResolvedValue({
      authorized: true,
      accessType: 'league_admin',
      team: { id: 'team-1', league_id: 'league-1', division_id: 'division-1' } as never,
    } as never);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns early before creating a service client when unauthorized', async () => {
    mockVerifyCaptainOrAdminAccess.mockResolvedValue({
      authorized: false,
      error: 'Not authorized',
    } as never);

    const result = await addPlayerToRoster({
      teamId: 'team-1',
      playerId: 'player-1',
      seasonId: 'season-1',
      jerseyNumber: 14,
      position: 'Forward',
    });

    expect(result).toEqual({ error: 'Not authorized' });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('uses the service-role client for jersey validation and roster insertion', async () => {
    const mockServiceClient = createMockServiceClient({
      rpcHandlers: [
        (call) =>
          call.fn === 'is_jersey_available' ? { data: true, error: null } : undefined,
      ],
      queryHandlers: [
        (call) =>
          call.table === 'teams' && call.action === 'select'
            ? { data: { division_id: 'division-9' }, error: null }
            : undefined,
        (call) =>
          call.table === 'team_rosters' && call.action === 'insert'
            ? { data: { id: 'roster-1', player_id: 'player-1' }, error: null }
            : undefined,
      ],
    });

    mockCreateServiceRoleClient.mockReturnValue(mockServiceClient as never);

    const result = await addPlayerToRoster({
      teamId: 'team-1',
      playerId: 'player-1',
      seasonId: 'season-1',
      jerseyNumber: 14,
      position: 'Forward',
    });

    expect(result).toEqual({
      success: true,
      data: { id: 'roster-1', player_id: 'player-1' },
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(mockServiceClient.rpc).toHaveBeenCalledWith('is_jersey_available', {
      p_team_id: 'team-1',
      p_season_id: 'season-1',
      p_jersey_number: 14,
    });
    expect(mockServiceClient.queryCalls).toContainEqual({
      table: 'teams',
      action: 'select',
      payload: 'division_id',
      filters: [{ column: 'id', value: 'team-1' }],
    });
    expect(mockServiceClient.queryCalls).toContainEqual({
      table: 'team_rosters',
      action: 'insert',
      payload: {
        team_id: 'team-1',
        player_id: 'player-1',
        season_id: 'season-1',
        division_id: 'division-9',
        jersey_number: 14,
        position: 'Forward',
        status: 'active',
        leadership_role: null,
        start_date: expect.any(String),
      },
      filters: [],
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/teams/team-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/captain/team-1');
  });
});
