import { describe, expect, it } from '@jest/globals';

import { buildLeaguePlayerSearchResults } from '../player-search';

describe('buildLeaguePlayerSearchResults', () => {
  it('keeps previous-season players searchable while excluding players already on the selected roster', () => {
    const results = buildLeaguePlayerSearchResults({
      profiles: [
        { id: 'player-1', full_name: 'Alex Returner', avatar_url: null },
        { id: 'player-2', full_name: 'Chris Current', avatar_url: null },
      ],
      rosterHistory: [
        {
          player_id: 'player-1',
          team_id: 'team-old',
          season_id: 'season-old',
          team_name: 'Winter Wolves',
          season_name: 'Winter 2025',
          status: 'active',
          joined_at: '2025-01-01T10:00:00.000Z',
        },
        {
          player_id: 'player-2',
          team_id: 'team-current',
          season_id: 'season-current',
          team_name: 'Spring Sharks',
          season_name: 'Spring 2026',
          status: 'active',
          joined_at: '2026-03-01T10:00:00.000Z',
        },
      ],
      registrationHistory: [],
      currentTeamId: 'team-current',
      currentSeasonId: 'season-current',
    });

    expect(results).toEqual([
      {
        id: 'player-1',
        full_name: 'Alex Returner',
        avatar_url: null,
        latest_team_name: 'Winter Wolves',
        latest_season_name: 'Winter 2025',
        source: 'roster',
      },
    ]);
  });

  it('falls back to the latest registration context when there is no roster history', () => {
    const results = buildLeaguePlayerSearchResults({
      profiles: [{ id: 'player-3', full_name: 'Jordan Draft', avatar_url: null }],
      rosterHistory: [],
      registrationHistory: [
        {
          player_id: 'player-3',
          season_id: 'season-old',
          team_id: 'team-requested',
          assigned_team_id: 'team-assigned',
          team_name: 'Requested Team',
          assigned_team_name: 'Assigned Team',
          season_name: 'Spring 2025',
          created_at: '2025-03-01T09:00:00.000Z',
          submitted_at: '2025-03-03T12:00:00.000Z',
        },
      ],
    });

    expect(results).toEqual([
      {
        id: 'player-3',
        full_name: 'Jordan Draft',
        avatar_url: null,
        latest_team_name: 'Assigned Team',
        latest_season_name: 'Spring 2025',
        source: 'registration',
      },
    ]);
  });
});
