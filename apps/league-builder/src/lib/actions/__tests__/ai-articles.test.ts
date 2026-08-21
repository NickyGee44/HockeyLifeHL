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

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '../permissions';
import { regenerateGameRecap } from '../ai-articles';

const GAME_ID = 'game-1';
const LEAGUE_ID = 'league-1';

function createServiceClient(
  game: { league_id: string; status: string; leagues: { slug: string } | null },
  invokeResult: { data: unknown; error: unknown } = { data: { success: true }, error: null },
  gameError: unknown = null,
) {
  const single = jest.fn(async () => ({ data: game, error: gameError }));
  const scope: { league_id?: string } = {};
  const query = { eq: jest.fn(), single };
  query.eq.mockImplementation((column: string, value: string) => {
    if (column === 'league_id') scope.league_id = value;
    return query;
  });
  const select = jest.fn(() => query);
  const from = jest.fn((table: string) => {
    if (table !== 'games') throw new Error(`Unexpected table: ${table}`);
    return { select };
  });
  const invoke = jest.fn(async () => invokeResult);

  return { from, functions: { invoke }, invoke, eq: query.eq, scope };
}

describe('regenerateGameRecap', () => {
  const mockVerifyAccess = verifyLeagueOwnerAccess as jest.MockedFunction<
    typeof verifyLeagueOwnerAccess
  >;
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAccess.mockResolvedValue({ authorized: true, accessType: 'league_admin' });
  });

  it('blocks unauthorized callers before creating a service-role client', async () => {
    mockVerifyAccess.mockResolvedValue({ authorized: false, error: 'Not authorized' });

    await expect(regenerateGameRecap(GAME_ID, LEAGUE_ID)).resolves.toEqual({
      success: false,
      error: 'Not authorized',
    });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it('blocks a game belonging to another league', async () => {
    const service = createServiceClient({
      league_id: 'league-2',
      status: 'completed',
      leagues: { slug: 'other-league' },
    });
    mockCreateServiceRoleClient.mockReturnValue(service as never);

    await expect(regenerateGameRecap(GAME_ID, LEAGUE_ID)).resolves.toEqual({
      success: false,
      error: 'Game not found',
    });
    expect(service.invoke).not.toHaveBeenCalled();
  });

  it('blocks recap generation for a non-completed game', async () => {
    const service = createServiceClient({
      league_id: LEAGUE_ID,
      status: 'in_progress',
      leagues: { slug: 'hockey-life' },
    });
    mockCreateServiceRoleClient.mockReturnValue(service as never);

    await expect(regenerateGameRecap(GAME_ID, LEAGUE_ID)).resolves.toEqual({
      success: false,
      error: 'Game must be completed before generating a recap',
    });
    expect(service.invoke).not.toHaveBeenCalled();
  });

  it('surfaces a game lookup database failure', async () => {
    const service = createServiceClient(
      {
        league_id: LEAGUE_ID,
        status: 'completed',
        leagues: { slug: 'hockey-life' },
      },
      { data: { success: true }, error: null },
      { message: 'database unavailable' },
    );
    mockCreateServiceRoleClient.mockReturnValue(service as never);

    await expect(regenerateGameRecap(GAME_ID, LEAGUE_ID)).resolves.toEqual({
      success: false,
      error: 'Failed to load game: database unavailable',
    });
    expect(service.invoke).not.toHaveBeenCalled();
  });

  it('uses the service-role client with a forced game recap payload', async () => {
    const service = createServiceClient({
      league_id: LEAGUE_ID,
      status: 'completed',
      leagues: { slug: 'hockey-life' },
    });
    mockCreateServiceRoleClient.mockReturnValue(service as never);

    await expect(regenerateGameRecap(GAME_ID, LEAGUE_ID)).resolves.toEqual({
      success: true,
      data: undefined,
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(service.invoke).toHaveBeenCalledWith('generate-ai-article', {
      body: { action: 'game_recap', game_id: GAME_ID, force: true },
    });
    expect(service.eq).toHaveBeenCalledWith('league_id', LEAGUE_ID);
    expect(service.scope.league_id).toBe(LEAGUE_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/leagues/${LEAGUE_ID}/games`);
    expect(revalidatePath).toHaveBeenCalledWith('/hockey-life/games/game-1');
  });

  it('surfaces a returned edge-function failure', async () => {
    const service = createServiceClient(
      {
        league_id: LEAGUE_ID,
        status: 'completed',
        leagues: { slug: 'hockey-life' },
      },
      { data: { success: false, error: 'OpenAI unavailable' }, error: null },
    );
    mockCreateServiceRoleClient.mockReturnValue(service as never);

    await expect(regenerateGameRecap(GAME_ID, LEAGUE_ID)).resolves.toEqual({
      success: false,
      error: 'OpenAI unavailable',
    });
  });

  it('returns the edge-function invocation error when invocation fails', async () => {
    const service = createServiceClient(
      {
        league_id: LEAGUE_ID,
        status: 'completed',
        leagues: { slug: 'hockey-life' },
      },
      { data: null, error: { message: 'Function unavailable' } },
    );
    mockCreateServiceRoleClient.mockReturnValue(service as never);

    await expect(regenerateGameRecap(GAME_ID, LEAGUE_ID)).resolves.toEqual({
      success: false,
      error: 'Function unavailable',
    });
  });

  it('surfaces a structured edge-function HTTP error response', async () => {
    const service = createServiceClient(
      {
        league_id: LEAGUE_ID,
        status: 'completed',
        leagues: { slug: 'hockey-life' },
      },
      {
        data: null,
        error: {
          message: 'Edge Function returned a non-2xx status code',
          context: new Response(JSON.stringify({ error: 'OpenAI unavailable' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          }),
        },
      },
    );
    mockCreateServiceRoleClient.mockReturnValue(service as never);

    await expect(regenerateGameRecap(GAME_ID, LEAGUE_ID)).resolves.toEqual({
      success: false,
      error: 'OpenAI unavailable',
    });
  });
});
