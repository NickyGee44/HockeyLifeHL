import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { finalizeDraftRosters, makeDraftPick } from '../draft';

describe('finalizeDraftRosters', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated callers before invoking the RPC', async () => {
    const rpc = jest.fn();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      rpc,
    } as never);

    await expect(finalizeDraftRosters('draft-1')).resolves.toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('maps successful RPC counts and inserted row IDs', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        success: true,
        inserted_count: 4,
        existing_count: 2,
        total_picks: 6,
        inserted_ids: ['roster-1', 'roster-2', 'roster-3', 'roster-4'],
      },
      error: null,
    });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
      },
      rpc,
    } as never);

    await expect(finalizeDraftRosters('draft-1')).resolves.toEqual({
      success: true,
      data: {
        insertedCount: 4,
        existingCount: 2,
        totalPicks: 6,
        insertedIds: ['roster-1', 'roster-2', 'roster-3', 'roster-4'],
      },
    });
    expect(rpc).toHaveBeenCalledWith('finalize_draft_rosters', {
      p_draft_id: 'draft-1',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/leagues');
  });

  it('preserves validation errors returned by the RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        success: false,
        error: 'Draft pool still contains undrafted players',
      },
      error: null,
    });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
      },
      rpc,
    } as never);

    await expect(finalizeDraftRosters('draft-1')).resolves.toEqual({
      success: false,
      error: 'Draft pool still contains undrafted players',
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('treats an idempotent second run with zero inserts as success', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        success: true,
        inserted_count: 0,
        existing_count: 6,
        total_picks: 6,
        inserted_ids: [],
      },
      error: null,
    });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
      },
      rpc,
    } as never);

    await expect(finalizeDraftRosters('draft-1')).resolves.toEqual({
      success: true,
      data: {
        insertedCount: 0,
        existingCount: 6,
        totalPicks: 6,
        insertedIds: [],
      },
    });
  });
});

describe('makeDraftPick', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the canonical public RPC with exactly the two public arguments', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        success: true,
        pick: {
          id: 'pick-1',
          pick_number: 3,
          round: 1,
          team_id: 'team-1',
          player_id: 'player-1',
          player_name: 'Player One',
        },
      },
      error: null,
    });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'captain-1' } }, error: null }),
      },
      rpc,
    } as never);

    await expect(makeDraftPick('draft-1', 'player-1')).resolves.toEqual({
      success: true,
      data: {
        pickId: 'pick-1',
        pickNumber: 3,
        round: 1,
        teamId: 'team-1',
        playerId: 'player-1',
        playerName: 'Player One',
      },
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('make_draft_pick', {
      p_draft_id: 'draft-1',
      p_player_id: 'player-1',
    });
  });
});
