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

jest.mock('@/lib/playoffs/bracket-generation', () => ({
  buildGeneratedPlayoffScopes: jest.fn(),
}));

jest.mock('@/lib/playoffs/scheduling', () => ({
  assignPlayoffSeriesToSlots: jest.fn(),
  buildPlayoffSchedulingSlots: jest.fn(),
}));

jest.mock('@/lib/ratings', () => ({
  calculateDivisionBalance: jest.fn(),
}));

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '../permissions';
import { buildGeneratedPlayoffScopes } from '@/lib/playoffs/bracket-generation';
import {
  generatePlayoffBracket,
  recordSeriesWin,
  schedulePlayoffGame,
} from '../playoff-bracket';

type QueryCall = {
  table: string;
  action: string;
  payload?: unknown;
  filters: Array<{ type: string; column?: string; value?: unknown }>;
};

type QueryResult = {
  data?: unknown;
  error?: { message?: string | null } | null;
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
      this.call.action = 'select';
    }
    this.call.payload = selection;
    return this;
  }

  delete() {
    this.call.action = 'delete';
    return this;
  }

  insert(payload: unknown) {
    this.call.action = 'insert';
    this.call.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.call.action = 'update';
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

  in(column: string, value: unknown) {
    this.call.filters.push({ type: 'in', column, value });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    this.call.filters.push({ type: 'not', column: `${column}:${operator}`, value });
    return this;
  }

  is(column: string, value: unknown) {
    this.call.filters.push({ type: 'is', column, value });
    return this;
  }

  order(column: string, value?: unknown) {
    this.call.filters.push({ type: 'order', column, value });
    return this;
  }

  or(value: string) {
    this.call.filters.push({ type: 'or', value });
    return this;
  }

  limit(value: number) {
    this.call.filters.push({ type: 'limit', value });
    return Promise.resolve(this.resolve());
  }

  single() {
    return Promise.resolve(this.resolve());
  }

  maybeSingle() {
    return Promise.resolve(this.resolve());
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected);
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
    rpc: jest.fn(),
  };
}

describe('playoff bracket actions', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;
  const mockVerifyLeagueOwnerAccess = verifyLeagueOwnerAccess as jest.MockedFunction<
    typeof verifyLeagueOwnerAccess
  >;
  const mockBuildGeneratedPlayoffScopes = buildGeneratedPlayoffScopes as jest.MockedFunction<
    typeof buildGeneratedPlayoffScopes
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyLeagueOwnerAccess.mockResolvedValue({
      authorized: true,
      accessType: 'league_admin',
    } as never);
  });

  it('rejects bracket generation before creating clients when unauthorized', async () => {
    mockVerifyLeagueOwnerAccess.mockResolvedValue({
      authorized: false,
      error: 'Not authorized',
    } as never);

    const result = await generatePlayoffBracket('league-1', 'season-1');

    expect(result).toEqual({ success: false, error: 'Not authorized' });
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it('generates a bracket using service-role writes', async () => {
    mockBuildGeneratedPlayoffScopes.mockReturnValue({
      success: true,
      data: [
        {
          divisionId: null,
          series: [
            {
              round_number: 1,
              series_number: 1,
              high_seed_id: 'team-1',
              low_seed_id: 'team-2',
              high_seed_wins: 0,
              low_seed_wins: 0,
              winner_id: null,
              status: 'pending',
            },
          ],
        },
      ],
    } as never);

    const readClient = createMockSupabaseClient([
      (call) => {
        if (call.table === 'playoff_series' && call.action === 'select') {
          const selection = String(call.payload ?? '');
          if (selection.includes('id, division_id')) {
            return { error: null };
          }
        }
        return undefined;
      },
      (call) =>
        call.table === 'seasons' && call.action === 'select'
          ? { data: { playoff_format: 'single_elimination' }, error: null }
          : undefined,
      (call) =>
        call.table === 'standings_config' && call.action === 'select'
          ? { data: null, error: null }
          : undefined,
      (call) =>
        call.table === 'leagues' && call.action === 'select'
          ? { data: { slug: 'league-slug' }, error: null }
          : undefined,
    ]);
    readClient.rpc.mockResolvedValue({
      data: [
        {
          team_id: 'team-1',
          team_name: 'Team 1',
          division_id: null,
        },
      ],
      error: null,
    });

    const serviceClient = createMockSupabaseClient([
      (call) =>
        call.table === 'games' && call.action === 'delete'
          ? { error: null }
          : undefined,
      (call) => {
        if (call.table === 'games' && call.action === 'select') {
          return { data: [], error: null };
        }
        return undefined;
      },
      (call) => {
        if (call.table === 'playoff_series' && call.action === 'delete') {
          return { error: null };
        }
        if (call.table === 'playoff_series' && call.action === 'insert') {
          return { error: null };
        }
        if (call.table === 'playoff_series' && call.action === 'select') {
          return {
            data: [
              {
                id: 'series-1',
                division_id: null,
                round_number: 1,
                series_number: 1,
                high_seed_id: 'team-1',
                low_seed_id: 'team-2',
                high_seed_wins: 0,
                low_seed_wins: 0,
                winner_id: null,
                status: 'pending',
                high_seed: { name: 'Team 1' },
                low_seed: { name: 'Team 2' },
                winner: null,
              },
            ],
            error: null,
          };
        }
        return undefined;
      },
      (call) =>
        call.table === 'seasons' && call.action === 'update'
          ? { error: null }
          : undefined,
      (call) =>
        call.table === 'seasons' && call.action === 'select'
          ? { data: { playoff_format: 'single_elimination' }, error: null }
          : undefined,
    ]);

    mockCreateClient.mockResolvedValue(readClient as never);
    mockCreateServiceRoleClient.mockReturnValue(serviceClient as never);

    const result = await generatePlayoffBracket('league-1', 'season-1');

    expect(result.success).toBe(true);
    expect(serviceClient.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'games', action: 'delete' }),
        expect.objectContaining({ table: 'playoff_series', action: 'delete' }),
        expect.objectContaining({ table: 'playoff_series', action: 'insert' }),
        expect.objectContaining({ table: 'seasons', action: 'update' }),
      ])
    );
    expect(readClient.calls.some((call) => ['delete', 'insert', 'update'].includes(call.action))).toBe(false);
  });

  it('keeps the division-scope migration message when playoff_series lacks division_id', async () => {
    mockBuildGeneratedPlayoffScopes.mockReturnValue({
      success: true,
      data: [
        {
          divisionId: 'division-1',
          series: [],
        },
      ],
    } as never);

    const readClient = createMockSupabaseClient([
      (call) => {
        if (call.table === 'playoff_series' && call.action === 'select') {
          return {
            error: {
              message:
                "Could not find the 'division_id' column of 'playoff_series' in the schema cache",
            },
          };
        }
        return undefined;
      },
      (call) =>
        call.table === 'seasons' && call.action === 'select'
          ? { data: { playoff_format: 'single_elimination' }, error: null }
          : undefined,
      (call) =>
        call.table === 'standings_config' && call.action === 'select'
          ? { data: { use_division_playoffs: true }, error: null }
          : undefined,
    ]);
    readClient.rpc.mockResolvedValue({
      data: [{ team_id: 'team-1' }],
      error: null,
    });

    mockCreateClient.mockResolvedValue(readClient as never);
    mockCreateServiceRoleClient.mockReturnValue(createMockSupabaseClient([]) as never);

    const result = await generatePlayoffBracket('league-1', 'season-1', {
      forceDivisionPlayoffs: true,
    });

    expect(result).toEqual({
      success: false,
      error:
        'This environment is missing division-scoped playoff support. Apply the playoff_series division migration, then try again.',
    });
  });

  it('normalizes schedulePlayoffGame write failures instead of returning raw database errors', async () => {
    const serviceClient = createMockSupabaseClient([
      (call) => {
        if (call.table === 'playoff_series' && call.action === 'select') {
          return {
            data: {
              id: 'series-1',
              league_id: 'league-1',
              season_id: 'season-1',
              round_number: 1,
              series_number: 1,
              high_seed_id: 'team-1',
              low_seed_id: 'team-2',
              division_id: null,
              status: 'pending',
            },
            error: null,
          };
        }
        if (call.table === 'games' && call.action === 'insert') {
          return {
            data: null,
            error: {
              message: 'new row violates row-level security policy for table "games"',
            },
          };
        }
        return undefined;
      },
    ]);

    mockCreateClient.mockResolvedValue(createMockSupabaseClient([]) as never);
    mockCreateServiceRoleClient.mockReturnValue(serviceClient as never);

    const result = await schedulePlayoffGame(
      'league-1',
      'season-1',
      'series-1',
      '2026-03-25T20:00:00.000Z',
      'Main Rink'
    );

    expect(result).toEqual({
      success: false,
      error:
        'Playoff game scheduling is temporarily unavailable. Please try again after playoff access is updated.',
    });
    expect(serviceClient.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'playoff_series', action: 'select' }),
        expect.objectContaining({ table: 'games', action: 'insert' }),
      ])
    );
  });

  it('records a series win and advances the winner using service-role updates', async () => {
    const serviceClient = createMockSupabaseClient([
      (call) => {
        if (
          call.table === 'playoff_series'
          && call.action === 'select'
          && call.filters.some((filter) => filter.column === 'id' && filter.value === 'series-1')
        ) {
          return {
            data: {
              id: 'series-1',
              league_id: 'league-1',
              season_id: 'season-1',
              division_id: null,
              round_number: 1,
              series_number: 1,
              high_seed_id: 'team-1',
              low_seed_id: 'team-2',
              high_seed_wins: 0,
              low_seed_wins: 0,
              winner_id: null,
              status: 'pending',
            },
            error: null,
          };
        }
        if (
          call.table === 'playoff_series'
          && call.action === 'select'
          && call.filters.some((filter) => filter.column === 'round_number' && filter.value === 2)
        ) {
          return {
            data: {
              id: 'series-2',
              season_id: 'season-1',
              round_number: 2,
              series_number: 1,
              division_id: null,
            },
            error: null,
          };
        }
        if (call.table === 'playoff_series' && call.action === 'update') {
          return { error: null };
        }
        if (call.table === 'seasons' && call.action === 'select') {
          return { data: { playoff_format: 'single_elimination' }, error: null };
        }
        if (call.table === 'playoff_series' && call.action === 'select' && call.filters.some((filter) => filter.type === 'neq')) {
          return { count: 1, error: null };
        }
        return undefined;
      },
    ]);

    mockCreateClient.mockResolvedValue(createMockSupabaseClient([
      (call) => {
        if (call.table === 'playoff_series' && call.action === 'select') {
          return { error: null };
        }
        if (call.table === 'leagues' && call.action === 'select') {
          return { data: { slug: 'league-slug' }, error: null };
        }
        return undefined;
      },
    ]) as never);
    mockCreateServiceRoleClient.mockReturnValue(serviceClient as never);

    const result = await recordSeriesWin('league-1', 'season-1', 'series-1', 'high');

    expect(result).toEqual({ success: true, data: undefined });
    expect(serviceClient.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'playoff_series',
          action: 'update',
          payload: expect.objectContaining({
            high_seed_wins: 1,
            winner_id: 'team-1',
            status: 'completed',
          }),
        }),
        expect.objectContaining({
          table: 'playoff_series',
          action: 'update',
          payload: { high_seed_id: 'team-1' },
        }),
      ])
    );
  });
});
