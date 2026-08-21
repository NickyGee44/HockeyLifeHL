import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}));

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { recalculateGameStats } from '../stat-corrections';

const GAME_ID = '00000000-0000-4000-8000-000000000001';
const LEAGUE_ID = '00000000-0000-4000-8000-000000000002';
const SEASON_ID = '00000000-0000-4000-8000-000000000003';
const ADMIN_ID = '00000000-0000-4000-8000-000000000004';

function createAuthClient() {
  const leagueQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(async () => ({
      data: { created_by: 'another-user', organizations: null },
      error: null,
    })),
  };
  leagueQuery.select.mockReturnValue(leagueQuery);
  leagueQuery.eq.mockReturnValue(leagueQuery);

  const membershipQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(async () => ({
      data: { role: 'admin' },
      error: null,
    })),
  };
  membershipQuery.select.mockReturnValue(membershipQuery);
  membershipQuery.eq.mockReturnValue(membershipQuery);

  const client = {
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: { id: ADMIN_ID } },
        error: null,
      })),
    },
    from: jest.fn((table: string) => {
      if (table === 'leagues') return leagueQuery;
      if (table === 'league_memberships') return membershipQuery;
      throw new Error(`Unexpected auth table: ${table}`);
    }),
  };

  return { client, membershipQuery };
}

function createServiceClient(seasonRollupError: { message: string } | null) {
  const filters: Array<{ table: string; column: string; value: string }> = [];
  const auditInsert = jest.fn(async () => ({ error: null }));
  const rpc = jest.fn(async (name: string) => {
    if (name === 'recalculate_game_stats_from_events') {
      return { data: null, error: { message: 'primary rollup failed' } };
    }
    if (name === 'recalculate_all_season_stats') {
      return { data: null, error: seasonRollupError };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });

  const gameEvents = [
    {
      team_type: 'home',
      player_id: 'home-scorer',
      assist1_player_id: null,
      assist2_player_id: null,
    },
    {
      team_type: 'home',
      player_id: null,
      assist1_player_id: null,
      assist2_player_id: null,
    },
    {
      team_type: 'away',
      player_id: 'away-scorer',
      assist1_player_id: null,
      assist2_player_id: null,
    },
  ];

  const from = jest.fn((table: string) => {
    if (table === 'games') {
      return {
        select: jest.fn((selection: string) => ({
          eq: jest.fn((column: string, value: string) => {
            filters.push({ table: 'games', column, value });
            return {
              single: jest.fn(async () =>
                selection.includes('league_id')
                  ? {
                      data: { league_id: LEAGUE_ID, season_id: SEASON_ID },
                      error: null,
                    }
                  : { data: { home_score: 2, away_score: 1 }, error: null },
              ),
            };
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(async (column: string, value: string) => {
            filters.push({ table: 'games', column, value });
            return { error: null };
          }),
        })),
      };
    }

    if (table === 'game_events') {
      let selection = '';
      let teamType: 'home' | 'away' | null = null;
      const query = {
        select: jest.fn((value: string) => {
          selection = value;
          return query;
        }),
        eq: jest.fn((column: string, value: string) => {
          filters.push({ table: 'game_events', column, value });
          if (column === 'team_type') teamType = value as 'home' | 'away';
          return query;
        }),
        is: jest.fn(async () => {
          if (selection === '*') {
            return {
              count: gameEvents.filter((event) => event.team_type === teamType)
                .length,
              data: null,
              error: null,
            };
          }
          return { data: gameEvents, error: null };
        }),
      };
      return query;
    }

    if (table === 'game_audit_log') {
      return {
        insert: auditInsert,
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return { auditInsert, filters, from, rpc };
}

describe('recalculateGameStats fallback', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServiceRoleClient =
    createServiceRoleClient as jest.MockedFunction<
      typeof createServiceRoleClient
    >;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;
  let authClient: ReturnType<typeof createAuthClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    authClient = createAuthClient();
    mockCreateClient.mockResolvedValue(authClient.client as never);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns failure when the fallback score update succeeds but the season rollup fails', async () => {
    const serviceClient = createServiceClient({
      message: 'season rollup failed',
    });
    mockCreateServiceRoleClient.mockReturnValue(serviceClient as never);

    const result = await recalculateGameStats(GAME_ID);

    expect(result).toEqual({
      success: false,
      error: 'Game score updated, but failed to refresh season stats',
    });
    expect(serviceClient.rpc).toHaveBeenCalledWith(
      'recalculate_all_season_stats',
      {
        p_season_id: SEASON_ID,
      },
    );
    expect(serviceClient.filters).toContainEqual({
      table: 'game_events',
      column: 'game_id',
      value: GAME_ID,
    });
    expect(serviceClient.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        game_id: GAME_ID,
        league_id: LEAGUE_ID,
        action: 'stat_correction_recalculate',
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('succeeds when the fallback score update and season rollup both succeed', async () => {
    const serviceClient = createServiceClient(null);
    mockCreateServiceRoleClient.mockReturnValue(serviceClient as never);

    const result = await recalculateGameStats(GAME_ID);

    expect(result).toEqual({
      success: true,
      data: { homeScore: 2, awayScore: 1 },
    });
    expect(serviceClient.rpc).toHaveBeenNthCalledWith(
      2,
      'recalculate_all_season_stats',
      {
        p_season_id: SEASON_ID,
      },
    );
    expect(serviceClient.filters).toContainEqual({
      table: 'games',
      column: 'id',
      value: GAME_ID,
    });
    const authScope = Object.fromEntries(
      authClient.membershipQuery.eq.mock.calls,
    ) as Record<string, string>;
    expect(authScope.league_id).toBe(LEAGUE_ID);
    expect(authScope.user_id).toBe(ADMIN_ID);
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });
});
