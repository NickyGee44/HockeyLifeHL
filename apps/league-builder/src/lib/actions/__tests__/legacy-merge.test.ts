import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}));

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getLegacyCandidates } from '../legacy-merge';

describe('legacy merge candidate loading', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates candidate stats from player_season_stats instead of per-game rows', async () => {
    const authClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: { id: 'user-1' },
          },
        }),
      },
    };

    const serviceClient = {
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn((columns: string) => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue(
                  columns === 'pending_legacy_match_ids'
                    ? { data: { pending_legacy_match_ids: ['legacy-1'] }, error: null }
                    : { data: { id: 'legacy-1', full_name: 'Alex Legacy' }, error: null }
                ),
              })),
            })),
          };
        }

        if (table === 'team_rosters') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    teams: { name: 'Wolves' },
                    seasons: { name: 'Winter 2025' },
                  },
                ],
                error: null,
              }),
            })),
          };
        }

        if (table === 'player_season_stats') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { games_played: 10, goals: 4, assists: 7, points: 11 },
                  { games_played: 8, goals: 3, assists: 5, points: 8 },
                ],
                error: null,
              }),
            })),
          };
        }

        if (table === 'player_stats') {
          throw new Error('legacy candidate loading should not read player_stats');
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    mockCreateClient.mockResolvedValue(authClient as never);
    mockCreateServiceRoleClient.mockReturnValue(serviceClient as never);

    const result = await getLegacyCandidates();

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 'legacy-1',
          fullName: 'Alex Legacy',
          teams: [
            {
              teamName: 'Wolves',
              seasonName: 'Winter 2025',
            },
          ],
          stats: {
            gamesPlayed: 18,
            goals: 7,
            assists: 12,
            points: 19,
          },
        },
      ],
    });
  });
});
