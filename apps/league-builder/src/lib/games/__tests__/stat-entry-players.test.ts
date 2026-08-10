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

  it('includes every regular roster player as no response when nobody checked in', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows,
      checkinRows: [],
      subInvitationRows: [],
    });

    expect(result.map(({ id, attendance_status }) => ({ id, attendance_status }))).toEqual([
      { id: 'regular-in', attendance_status: 'no_response' },
      { id: 'regular-out', attendance_status: 'no_response' },
    ]);
  });

  it('keeps explicit-out regular players selectable after checked-in and no-response players', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [
        { ...rosterRows[1], player_id: 'regular-out' },
        { ...rosterRows[0], player_id: 'regular-no-response' },
        { ...rosterRows[0], player_id: 'regular-in' },
      ],
      checkinRows: [
        { player_id: 'regular-out', team_id: teamId, status: 'out' },
        { player_id: 'regular-in', team_id: teamId, status: 'confirmed' },
      ],
      subInvitationRows: [],
    });

    expect(result.map(({ id, attendance_status }) => ({ id, attendance_status }))).toEqual([
      { id: 'regular-in', attendance_status: 'checked_in' },
      { id: 'regular-no-response', attendance_status: 'no_response' },
      { id: 'regular-out', attendance_status: 'out' },
    ]);
  });

  it('keeps tentative attendance distinct from no response', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [
        { ...rosterRows[0], player_id: 'regular-no-response' },
        { ...rosterRows[0], player_id: 'regular-tentative' },
        { ...rosterRows[0], player_id: 'regular-in' },
      ],
      checkinRows: [
        { player_id: 'regular-tentative', team_id: teamId, status: 'tentative' },
        { player_id: 'regular-in', team_id: teamId, status: 'confirmed' },
      ],
      subInvitationRows: [],
    });

    expect(result.map(({ id, attendance_status }) => ({ id, attendance_status }))).toEqual([
      { id: 'regular-in', attendance_status: 'checked_in' },
      { id: 'regular-tentative', attendance_status: 'tentative' },
      { id: 'regular-no-response', attendance_status: 'no_response' },
    ]);
  });

  it('sorts players within an attendance group by numbered jersey then name, with unassigned last', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [
        {
          player_id: 'unassigned-zulu',
          team_id: teamId,
          jersey_number: 0,
          position: 'Forward',
          player_type: 'regular',
          profiles: { full_name: 'Zulu Unassigned' },
        },
        {
          player_id: 'jersey-twelve',
          team_id: teamId,
          jersey_number: 12,
          position: 'Forward',
          player_type: 'regular',
          profiles: { full_name: 'Twelve' },
        },
        {
          player_id: 'jersey-two-zulu',
          team_id: teamId,
          jersey_number: 2,
          position: 'Forward',
          player_type: 'regular',
          profiles: { full_name: 'Zulu Two' },
        },
        {
          player_id: 'jersey-two-alpha',
          team_id: teamId,
          jersey_number: 2,
          position: 'Forward',
          player_type: 'regular',
          profiles: { full_name: 'Alpha Two' },
        },
        {
          player_id: 'jersey-one',
          team_id: teamId,
          jersey_number: 1,
          position: 'Forward',
          player_type: 'regular',
          profiles: { full_name: 'One' },
        },
        {
          player_id: 'unassigned-alpha',
          team_id: teamId,
          jersey_number: null,
          position: 'Forward',
          player_type: 'regular',
          profiles: { full_name: 'Alpha Unassigned' },
        },
      ],
      checkinRows: [],
      subInvitationRows: [],
    });

    expect(result.map((player) => player.id)).toEqual([
      'jersey-one',
      'jersey-two-alpha',
      'jersey-two-zulu',
      'jersey-twelve',
      'unassigned-alpha',
      'unassigned-zulu',
    ]);
  });

  it('includes accepted invited spares without a check-in after regular players', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [rosterRows[0]],
      checkinRows: [],
      subInvitationRows: [
        {
          invited_player_id: 'invite-only-sub',
          team_id: teamId,
          status: 'accepted',
          invited_player: { full_name: 'Invite Only Sub' },
        },
      ],
    });

    expect(result.map(({ id, full_name, attendance_status }) => ({
      id,
      full_name,
      attendance_status,
    }))).toEqual([
      { id: 'regular-in', full_name: 'Regular In', attendance_status: 'no_response' },
      { id: 'invite-only-sub', full_name: 'Invite Only Sub', attendance_status: 'spare' },
    ]);
  });

  it('keeps an accepted spare who is explicitly out selectable at the bottom', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [rosterRows[0], rosterRows[4]],
      checkinRows: [
        { player_id: 'accepted-but-out-sub', team_id: teamId, status: 'out' },
      ],
      subInvitationRows: [
        { invited_player_id: 'accepted-but-out-sub', team_id: teamId, status: 'accepted' },
      ],
    });

    expect(result.map(({ id, attendance_status }) => ({ id, attendance_status }))).toEqual([
      { id: 'regular-in', attendance_status: 'no_response' },
      { id: 'accepted-but-out-sub', attendance_status: 'out' },
    ]);
  });

  it('excludes unaccepted and uninvited sub roster rows', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [rosterRows[2], rosterRows[3], rosterRows[5]],
      checkinRows: [
        { player_id: 'uninvited-checkin-sub', team_id: teamId, status: 'confirmed' },
      ],
      subInvitationRows: [
        { invited_player_id: 'invited-sub-in', team_id: teamId, status: 'accepted' },
        { invited_player_id: 'roster-only-sub', team_id: teamId, status: 'pending' },
      ],
    });

    expect(result.map(({ id, attendance_status }) => ({ id, attendance_status }))).toEqual([
      { id: 'invited-sub-in', attendance_status: 'spare' },
    ]);
  });

  it('includes accepted part-time roster players as spares', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [{
        player_id: 'accepted-part-time',
        team_id: teamId,
        jersey_number: 44,
        position: 'Defense',
        player_type: 'part_time',
        profiles: { full_name: 'Accepted Part Time' },
      }],
      checkinRows: [],
      subInvitationRows: [{
        invited_player_id: 'accepted-part-time',
        team_id: teamId,
        status: 'accepted',
      }],
    });

    expect(result).toEqual([{
      id: 'accepted-part-time',
      full_name: 'Accepted Part Time',
      jersey_number: 44,
      team_id: teamId,
      position: 'Defense',
      attendance_status: 'spare',
    }]);
  });

  it('excludes part-time roster players without an accepted invitation', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [{
        player_id: 'unaccepted-part-time',
        team_id: teamId,
        jersey_number: 45,
        position: 'Forward',
        player_type: 'part_time',
        profiles: { full_name: 'Unaccepted Part Time' },
      }],
      checkinRows: [{
        player_id: 'unaccepted-part-time',
        team_id: teamId,
        status: 'confirmed',
      }],
      subInvitationRows: [{
        invited_player_id: 'unaccepted-part-time',
        team_id: teamId,
        status: 'pending',
      }],
    });

    expect(result).toEqual([]);
  });

  it('excludes roster rows with an unknown player type', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [{
        player_id: 'malformed-player-type',
        team_id: teamId,
        jersey_number: 46,
        position: 'Forward',
        player_type: 'unexpected',
        profiles: { full_name: 'Malformed Player Type' },
      }],
      checkinRows: [],
      subInvitationRows: [],
    });

    expect(result).toEqual([]);
  });

  it('deduplicates invite and roster overlaps while preserving roster metadata', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [rosterRows[2]],
      checkinRows: [],
      subInvitationRows: [{
        invited_player_id: 'invited-sub-in',
        team_id: teamId,
        status: 'accepted',
        invited_player: { full_name: 'Duplicate Invite Name' },
      }],
    });

    expect(result).toEqual([{
      id: 'invited-sub-in',
      full_name: 'Invited Sub In',
      jersey_number: 32,
      team_id: teamId,
      position: 'Defense',
      attendance_status: 'spare',
    }]);
  });

  it('includes accepted invited subs even when they do not have a roster row', () => {
    const result = buildStatEntryPlayerOptions({
      rosterRows: [],
      checkinRows: [],
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
        attendance_status: 'spare',
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
