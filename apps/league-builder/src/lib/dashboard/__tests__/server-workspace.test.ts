import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCookies = jest.fn();

jest.mock('next/headers', () => ({
  cookies: mockCookies,
}));

import { getPreferredSeasonWorkspace } from '../server-workspace';
import { serializeActiveSeasonWorkspaceCookie } from '../workspace-cookie';

describe('server workspace helpers', () => {
  beforeEach(() => {
    mockCookies.mockReset();
  });

  it('prefers the stored season workspace when it matches the league season list', async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({
        value: serializeActiveSeasonWorkspaceCookie({
          'league-123': {
            seasonId: 'season-stored',
            seasonName: 'Stored Season',
          },
        }),
      }),
    });

    const season = await getPreferredSeasonWorkspace('league-123', [
      {
        id: 'season-active',
        name: 'Active Season',
        status: 'active',
        start_date: '2025-04-01',
        end_date: '2025-08-01',
      },
      {
        id: 'season-stored',
        name: 'Stored Season',
        status: 'completed',
        start_date: '2024-04-01',
        end_date: '2024-08-01',
      },
    ]);

    expect(season?.id).toBe('season-stored');
  });

  it('falls back to the operational season when the stored season is missing', async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({
        value: serializeActiveSeasonWorkspaceCookie({
          'league-123': {
            seasonId: 'season-missing',
            seasonName: 'Old Season',
          },
        }),
      }),
    });

    const season = await getPreferredSeasonWorkspace('league-123', [
      {
        id: 'season-completed',
        name: 'Completed Season',
        status: 'completed',
        start_date: '2024-04-01',
        end_date: '2024-08-01',
      },
      {
        id: 'season-draft',
        name: 'Draft Season',
        status: 'draft',
        start_date: '2026-04-01',
        end_date: '2026-08-01',
      },
      {
        id: 'season-active',
        name: 'Active Season',
        status: 'active',
        start_date: '2025-04-01',
        end_date: '2025-08-01',
      },
    ]);

    expect(season?.id).toBe('season-active');
  });
});
