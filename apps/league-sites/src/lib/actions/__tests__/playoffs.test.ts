import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/data', () => ({
  getStandings: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getStandings } from '@/lib/data';
import { previewPlayoffSeeding } from '../playoffs';

describe('previewPlayoffSeeding', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockGetStandings = getStandings as jest.MockedFunction<typeof getStandings>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches the live bracket generator by seeding from the top overall standings only', async () => {
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                playoff_teams_total: 4,
                use_division_playoffs: true,
                playoff_teams_per_division: 1,
              },
            }),
          })),
        })),
      })),
    } as never);

    mockGetStandings.mockResolvedValue([
      {
        team_id: 't1',
        team_name: 'Falcons',
        team_logo: null,
        points: 24,
        division_id: 'east',
        division_name: 'East',
      },
      {
        team_id: 't2',
        team_name: 'Wolves',
        team_logo: null,
        points: 22,
        division_id: 'west',
        division_name: 'West',
      },
      {
        team_id: 't3',
        team_name: 'Sharks',
        team_logo: null,
        points: 21,
        division_id: 'east',
        division_name: 'East',
      },
      {
        team_id: 't4',
        team_name: 'Bears',
        team_logo: null,
        points: 18,
        division_id: 'west',
        division_name: 'West',
      },
      {
        team_id: 't5',
        team_name: 'Lynx',
        team_logo: null,
        points: 17,
        division_id: 'east',
        division_name: 'East',
      },
    ] as never);

    const result = await previewPlayoffSeeding('league-1', 'season-1');

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.playoffTeamCount).toBe(4);
    expect(result.data.useDivisionPlayoffs).toBe(false);
    expect(result.data.firstRound).toEqual([
      expect.objectContaining({
        seriesNumber: 1,
        highSeed: expect.objectContaining({ teamName: 'Falcons', rank: 1 }),
        lowSeed: expect.objectContaining({ teamName: 'Bears', rank: 4 }),
      }),
      expect.objectContaining({
        seriesNumber: 2,
        highSeed: expect.objectContaining({ teamName: 'Wolves', rank: 2 }),
        lowSeed: expect.objectContaining({ teamName: 'Sharks', rank: 3 }),
      }),
    ]);
  });

  it('returns a clear error when standings are empty', async () => {
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: { playoff_teams_total: 4 } }),
          })),
        })),
      })),
    } as never);

    mockGetStandings.mockResolvedValue([] as never);

    const result = await previewPlayoffSeeding('league-1', 'season-1');

    expect(result).toEqual({
      success: false,
      error: 'No standings data available yet — games need to be played first.',
    });
  });
});
