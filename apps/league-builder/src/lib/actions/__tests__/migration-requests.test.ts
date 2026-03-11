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
import { upsertLeagueMigrationRequest } from '../migration-requests';

describe('migration request actions', () => {
  const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;
  const mockVerifyLeagueOwnerAccess = verifyLeagueOwnerAccess as jest.MockedFunction<
    typeof verifyLeagueOwnerAccess
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyLeagueOwnerAccess.mockResolvedValue({
      authorized: true,
      league: { id: 'league-1' },
      userId: 'user-1',
    } as never);
  });

  it('rejects submitted requests without any migration scope', async () => {
    const result = await upsertLeagueMigrationRequest({
      leagueId: 'league-1',
      locale: 'en',
      mode: 'submit',
      scope: [],
    });

    expect(result).toEqual({
      success: false,
      error: 'Select at least one migration track before submitting.',
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('creates a submitted request with normalized scope and asset links', async () => {
    const insertSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'request-1',
        league_id: 'league-1',
        requested_by: 'user-1',
        status: 'submitted',
        scope: ['teams', 'players'],
        source_system: 'TeamSnap',
        source_url: 'https://legacy.example.com',
        asset_links: ['https://files.example.com/export.csv'],
        notes: 'Need champions history too',
        desired_launch_date: '2026-04-01',
        estimated_item_count: 120,
        admin_notes: null,
        quoted_price_cents: null,
        submitted_at: '2026-03-06T12:00:00.000Z',
        reviewed_at: null,
        scheduled_for: null,
        completed_at: null,
        created_at: '2026-03-06T12:00:00.000Z',
        updated_at: '2026-03-06T12:00:00.000Z',
      },
      error: null,
    });
    const insert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: insertSingle,
      })),
    }));
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    const serviceClient = {
      from: jest.fn((table: string) => {
        if (table !== 'league_migration_requests') {
          throw new Error(`Unexpected table: ${table}`);
        }

        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              in: jest.fn(() => ({
                order: jest.fn(() => ({
                  maybeSingle,
                })),
              })),
            })),
          })),
          insert,
        };
      }),
    };

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as never);
    mockCreateServiceRoleClient.mockReturnValue(serviceClient as never);

    const result = await upsertLeagueMigrationRequest({
      leagueId: 'league-1',
      locale: 'en',
      mode: 'submit',
      scope: ['teams', 'players', 'teams'],
      sourceSystem: '  TeamSnap  ',
      sourceUrl: ' https://legacy.example.com ',
      assetLinks: [
        ' https://files.example.com/export.csv ',
        'https://files.example.com/export.csv',
        '   ',
      ],
      notes: '  Need champions history too  ',
      desiredLaunchDate: '2026-04-01',
      estimatedItemCount: 120,
    });

    expect(result.success).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        league_id: 'league-1',
        requested_by: 'user-1',
        status: 'submitted',
        scope: ['teams', 'players'],
        source_system: 'TeamSnap',
        source_url: 'https://legacy.example.com',
        asset_links: ['https://files.example.com/export.csv'],
        notes: 'Need champions history too',
        desired_launch_date: '2026-04-01',
        estimated_item_count: 120,
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/dashboard');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/dashboard/leagues/league-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/dashboard/leagues/league-1/migration-center');
  });
});
