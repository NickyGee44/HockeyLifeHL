import { describe, expect, it } from '@jest/globals';

import { buildImportablePreviousSeasonPlayers } from '../previous-season-import';

describe('buildImportablePreviousSeasonPlayers', () => {
  it('keeps same-team assignments only when the team participates in the target season', () => {
    const players = buildImportablePreviousSeasonPlayers({
      profiles: [
        {
          id: 'player-1',
          full_name: 'Alex Skater',
          email: 'alex@example.com',
          phone: null,
          avatar_url: null,
        },
      ],
      registrations: [
        {
          player_id: 'player-1',
          team_id: 'team-1',
          assigned_team_id: 'team-1',
          preferred_position: 'Forward',
          preferred_jersey_number: 16,
          registration_type: 'team_registration',
          submitted_at: '2025-03-10T00:00:00.000Z',
          created_at: '2025-03-01T00:00:00.000Z',
        },
      ],
      rosters: [],
      teamNameById: new Map([['team-1', 'FitzRays Flyers']]),
      existingTargetPlayerIds: new Set<string>(),
      eligibleTargetTeamIds: new Set<string>(),
    });

    expect(players).toEqual([
      {
        playerId: 'player-1',
        fullName: 'Alex Skater',
        email: 'alex@example.com',
        phone: null,
        avatarUrl: null,
        teamId: null,
        teamName: 'FitzRays Flyers',
        position: 'Forward',
        jerseyNumber: 16,
        registrationType: 'free_agent',
        alreadyInTargetSeason: false,
      },
    ]);
  });

  it('uses roster details and marks players already present in the target season', () => {
    const players = buildImportablePreviousSeasonPlayers({
      profiles: [
        {
          id: 'player-2',
          full_name: 'Jordan Carryover',
          email: 'jordan@example.com',
          phone: '555-0101',
          avatar_url: null,
        },
      ],
      registrations: [
        {
          player_id: 'player-2',
          team_id: 'team-2',
          assigned_team_id: 'team-2',
          preferred_position: 'Defense',
          preferred_jersey_number: 4,
          registration_type: 'team_registration',
          submitted_at: '2025-03-05T00:00:00.000Z',
          created_at: '2025-03-01T00:00:00.000Z',
        },
      ],
      rosters: [
        {
          player_id: 'player-2',
          team_id: 'team-2',
          position: 'Goalie',
          jersey_number: 30,
          status: 'active',
          joined_at: '2025-03-15T00:00:00.000Z',
          start_date: '2025-03-15',
          end_date: null,
        },
      ],
      teamNameById: new Map([['team-2', 'First General London']]),
      existingTargetPlayerIds: new Set(['player-2']),
      eligibleTargetTeamIds: new Set(['team-2']),
    });

    expect(players).toEqual([
      {
        playerId: 'player-2',
        fullName: 'Jordan Carryover',
        email: 'jordan@example.com',
        phone: '555-0101',
        avatarUrl: null,
        teamId: 'team-2',
        teamName: 'First General London',
        position: 'Goalie',
        jerseyNumber: 30,
        registrationType: 'team_registration',
        alreadyInTargetSeason: true,
      },
    ]);
  });
});
