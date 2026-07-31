import { describe, expect, it } from '@jest/globals';

import {
  SPARE_PLAYER_OPTION_ID,
  buildStatEntryPlayerOptions,
  normalizeGoalParticipantIds,
} from '../stat-entry-players';

describe('buildStatEntryPlayerOptions', () => {
  const teamId = 'team-lem';

  const rosterRows = [
    {
      player_id: 'regular-in',
      team_id: teamId,
      jersey_number: 7,
      position: 'Forward',
      player_type: 'regular',
      profiles: { full_name: 'Regular In' },
    },
    {
      player_id: 'regular-out',
      team_id: teamId,
      jersey_number: 8,
      position: 'Defense',
      player_type: 'regular',
      profiles: { full_name: 'Regular Out' },
    },
    {
      player_id: 'invited-sub-in',
      team_id: teamId,
      jersey_number: 32,
      position: 'Defense',
      player_type: 'sub',
      profiles: { full_name: 'Invited Sub In' },
    },
    {
      player_id: 'roster-only-sub',
      team_id: teamId,
      jersey_number: 91,
      position: 'Forward',
      player_type: 'sub',
      profiles: { full_name: 'Roster Only Sub' },
    },
    {
      player_id: 'accepted-but-out-sub',
      team_id: teamId,
      jersey_number: 92,
      position: 'Forward',
      player_type: 'sub',
      profiles: { full_name: 'Accepted But Out Sub' },
    },
    {
      player_id: 'uninvited-checkin-sub',
      team_id: teamId,
      jersey_number: 93,
      position: 'Forward',
      player_type: 'sub',
      profiles: { full_name: 'Uninvited Checkin Sub' },
    },
  ];

  it('includes only checked-in players and accepted invited subs', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows,
      checkinRows: [
        { player_id: 'regular-in', team_id: teamId, status: 'confirmed' },
        { player_id: 'regular-out', team_id: teamId, status: 'out' },
        { player_id: 'invited-sub-in', team_id: teamId, status: 'confirmed' },
        { player_id: 'accepted-but-out-sub', team_id: teamId, status: 'out' },
        { player_id: 'uninvited-checkin-sub', team_id: teamId, status: 'confirmed' },
      ],
      subInvitationRows: [
        { invited_player_id: 'invited-sub-in', team_id: teamId, status: 'accepted' },
        { invited_player_id: 'roster-only-sub', team_id: teamId, status: 'pending' },
        { invited_player_id: 'accepted-but-out-sub', team_id: teamId, status: 'accepted' },
      ],
    });

    expect(result.map((player) => player.id)).toEqual(['regular-in', 'invited-sub-in']);
    expect(result.map((player) => player.full_name)).not.toContain('Regular Out');
    expect(result.map((player) => player.full_name)).not.toContain('Roster Only Sub');
    expect(result.map((player) => player.full_name)).not.toContain('Accepted But Out Sub');
    expect(result.map((player) => player.full_name)).not.toContain('Uninvited Checkin Sub');
  });

  it('deduplicates players who are both checked in and accepted as a sub', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows,
      checkinRows: [{ player_id: 'invited-sub-in', team_id: teamId, status: 'confirmed' }],
      subInvitationRows: [{ invited_player_id: 'invited-sub-in', team_id: teamId, status: 'accepted' }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('invited-sub-in');
  });

  it('includes accepted checked-in invited subs even when they do not have a roster row', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows,
      checkinRows: [{ player_id: 'invite-only-sub', team_id: teamId, status: 'confirmed' }],
      subInvitationRows: [
        {
          invited_player_id: 'invite-only-sub',
          team_id: teamId,
          status: 'accepted',
          invited_player: { full_name: 'Invite Only Sub' },
        },
      ],
    });

    expect(result).toEqual([
      {
        id: 'invite-only-sub',
        full_name: 'Invite Only Sub',
        jersey_number: 0,
        team_id: teamId,
        position: 'Forward',
      },
    ]);
  });

  it('normalizes spare scorer and assist selections without awarding player points', () => {
    expect(
      normalizeGoalParticipantIds({
        scorerId: SPARE_PLAYER_OPTION_ID,
        assist1Id: SPARE_PLAYER_OPTION_ID,
        assist2Id: 'known-assist',
      }),
    ).toEqual({
      playerId: null,
      assist1PlayerId: 'known-assist',
      assist2PlayerId: undefined,
    });
  });

  it('removes none, spare, duplicate, and scorer assist selections', () => {
    expect(
      normalizeGoalParticipantIds({
        scorerId: 'known-scorer',
        assist1Id: 'known-scorer',
        assist2Id: SPARE_PLAYER_OPTION_ID,
      }),
    ).toEqual({
      playerId: 'known-scorer',
      assist1PlayerId: undefined,
      assist2PlayerId: undefined,
    });
  });
});
