import { describe, expect, it } from '@jest/globals';
import {
  buildDefaultLineupLayout,
  buildLineupDisplay,
  normalizeLineupLayout,
  type LineupRosterPlayer,
} from '../types';

function player(overrides: Partial<LineupRosterPlayer>): LineupRosterPlayer {
  return {
    playerId: overrides.playerId ?? `player-${Math.random()}`,
    fullName: overrides.fullName ?? 'Player',
    avatarUrl: overrides.avatarUrl ?? null,
    jerseyNumber: overrides.jerseyNumber ?? null,
    position: overrides.position ?? null,
    availability: overrides.availability ?? 'confirmed',
  };
}

describe('lineup layout helpers', () => {
  it('builds a seeded lineup from the active RSVP roster', () => {
    const roster = [
      player({ playerId: 'g1', fullName: 'Goalie', jerseyNumber: 1, position: 'G' }),
      player({ playerId: 'c1', fullName: 'Center', jerseyNumber: 19, position: 'C' }),
      player({ playerId: 'lw1', fullName: 'Left Wing', jerseyNumber: 12, position: 'LW' }),
      player({ playerId: 'rw1', fullName: 'Right Wing', jerseyNumber: 91, position: 'RW' }),
      player({ playerId: 'ld1', fullName: 'Left D', jerseyNumber: 4, position: 'LD' }),
      player({ playerId: 'rd1', fullName: 'Right D', jerseyNumber: 5, position: 'RD' }),
      player({ playerId: 'out1', fullName: 'Unavailable', jerseyNumber: 30, position: 'F', availability: 'out' }),
    ];

    const layout = buildDefaultLineupLayout(roster);
    const placedIds = layout.placedPlayers.map((entry) => entry.playerId);

    expect(layout.roster).toHaveLength(7);
    expect(placedIds).toEqual(expect.arrayContaining(['g1', 'c1', 'lw1', 'rw1', 'ld1', 'rd1']));
    expect(placedIds).toContain('out1');
    expect(layout.placedPlayers.find((entry) => entry.playerId === 'g1')).toEqual(
      expect.objectContaining({ x: 50, y: 90 })
    );
  });

  it('normalizes saved layouts against the current roster', () => {
    const roster = [
      player({ playerId: 'c1', fullName: 'Center', jerseyNumber: 19, position: 'C' }),
      player({ playerId: 'w1', fullName: 'Wing', jerseyNumber: 12, position: 'LW' }),
    ];

    const layout = normalizeLineupLayout(
      {
        placedPlayers: [
          { playerId: 'c1', x: 2, y: 150 },
          { playerId: 'c1', x: 44, y: 55 },
          { playerId: 'ghost', x: 50, y: 50 },
        ],
      },
      roster
    );

    expect(layout.placedPlayers).toEqual([
      { playerId: 'c1', x: 8, y: 92 },
    ]);
    expect(layout.roster.map((entry) => entry.playerId)).toEqual(['w1', 'c1']);
  });

  it('builds display rows in saved rink-coordinate order instead of edit insertion order', () => {
    const roster = [
      player({ playerId: 'right-wing', fullName: 'Right Wing', jerseyNumber: 91, position: 'RW' }),
      player({ playerId: 'left-wing', fullName: 'Left Wing', jerseyNumber: 12, position: 'LW' }),
      player({ playerId: 'center', fullName: 'Center', jerseyNumber: 19, position: 'C' }),
      player({ playerId: 'right-d', fullName: 'Right D', jerseyNumber: 5, position: 'RD' }),
      player({ playerId: 'left-d', fullName: 'Left D', jerseyNumber: 4, position: 'LD' }),
      player({ playerId: 'goalie', fullName: 'Goalie', jerseyNumber: 1, position: 'G' }),
    ];

    const display = buildLineupDisplay({
      version: 1,
      roster,
      // Deliberately scrambled insertion order: the UI must render by saved slot,
      // otherwise Game Day and team page can show the same lineup differently.
      placedPlayers: [
        { playerId: 'right-wing', x: 72, y: 22 },
        { playerId: 'left-d', x: 35, y: 58 },
        { playerId: 'center', x: 50, y: 22 },
        { playerId: 'goalie', x: 50, y: 90 },
        { playerId: 'left-wing', x: 28, y: 22 },
        { playerId: 'right-d', x: 65, y: 58 },
      ],
    });

    expect(display.skaters.map((entry) => entry.playerId)).toEqual([
      'left-wing',
      'center',
      'right-wing',
      'left-d',
      'right-d',
    ]);
    expect(display.goalies.map((entry) => entry.playerId)).toEqual(['goalie']);
  });
});
