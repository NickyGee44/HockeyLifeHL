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

  it('requires division selection when multiple divisions exist in the standings', async () => {
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                playoff_teams_total: 4,
                use_division_playoffs: true,
                playoff_teams_per_division: 2,
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
    ] as never);

    const result = await previewPlayoffSeeding('league-1', 'season-1');

    expect(result).toEqual({
      success: false,
      error: 'Select a division to preview playoff seeding.',
    });
  });

  it('builds a read-only bracket from the selected division standings', async () => {
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                playoff_teams_total: 8,
                use_division_playoffs: true,
                playoff_teams_per_division: 4,
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
        team_name: 'Sharks',
        team_logo: null,
        points: 22,
        division_id: 'east',
        division_name: 'East',
      },
      {
        team_id: 't3',
        team_name: 'Lynx',
        team_logo: null,
        points: 19,
        division_id: 'east',
        division_name: 'East',
      },
      {
        team_id: 't4',
        team_name: 'Owls',
        team_logo: null,
        points: 16,
        division_id: 'east',
        division_name: 'East',
      },
      {
        team_id: 't5',
        team_name: 'Wolves',
        team_logo: null,
        points: 25,
        division_id: 'west',
        division_name: 'West',
      },
      {
        team_id: 't6',
        team_name: 'Bears',
        team_logo: null,
        points: 20,
        division_id: 'west',
        division_name: 'West',
      },
    ] as never);

    const result = await previewPlayoffSeeding('league-1', 'season-1', 'east');

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.playoffTeamCount).toBe(4);
    expect(result.data.useDivisionPlayoffs).toBe(true);
    expect(result.data.divisionName).toBe('East');
    expect(result.data.firstRound).toEqual([
      expect.objectContaining({
        seriesNumber: 1,
        highSeed: expect.objectContaining({ teamName: 'Falcons', rank: 1 }),
        lowSeed: expect.objectContaining({ teamName: 'Owls', rank: 4 }),
      }),
      expect.objectContaining({
        seriesNumber: 2,
        highSeed: expect.objectContaining({ teamName: 'Sharks', rank: 2 }),
        lowSeed: expect.objectContaining({ teamName: 'Lynx', rank: 3 }),
      }),
    ]);
  });

  it('still supports overall preview when the league has no divisions', async () => {
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                playoff_teams_total: 4,
                use_division_playoffs: false,
                playoff_teams_per_division: null,
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
        division_id: null,
        division_name: null,
      },
      {
        team_id: 't2',
        team_name: 'Wolves',
        team_logo: null,
        points: 22,
        division_id: null,
        division_name: null,
      },
      {
        team_id: 't3',
        team_name: 'Sharks',
        team_logo: null,
        points: 21,
        division_id: null,
        division_name: null,
      },
      {
        team_id: 't4',
        team_name: 'Bears',
        team_logo: null,
        points: 18,
        division_id: null,
        division_name: null,
      },
    ] as never);

    const result = await previewPlayoffSeeding('league-1', 'season-1');

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.useDivisionPlayoffs).toBe(false);
    expect(result.data.divisionName).toBeNull();
    expect(result.data.firstRound[0]).toEqual(
      expect.objectContaining({
        highSeed: expect.objectContaining({ teamName: 'Falcons', rank: 1 }),
        lowSeed: expect.objectContaining({ teamName: 'Bears', rank: 4 }),
      }),
    );
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
