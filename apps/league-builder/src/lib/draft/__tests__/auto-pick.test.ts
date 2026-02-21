import { describe, expect, it } from '@jest/globals';
import {
  compareAutoPickPlayers,
  getBestAutoPickPlayer,
  type DraftAutoPickPlayer,
} from '@/lib/draft/auto-pick';

function player(
  playerId: string,
  playerName: string,
  autoPickRank: number | null,
  skillLevel: string | null
): DraftAutoPickPlayer {
  return {
    player_id: playerId,
    player_name: playerName,
    auto_pick_rank: autoPickRank,
    skill_level: skillLevel,
  };
}

describe('draft auto-pick ranking', () => {
  it('prioritizes explicit auto-pick rank over skill level', () => {
    const ranked = player('1', 'Ranked C Player', 1, 'C');
    const unranked = player('2', 'Unranked A Player', null, 'A');

    expect(compareAutoPickPlayers(ranked, unranked)).toBeLessThan(0);
    expect(getBestAutoPickPlayer([unranked, ranked])).toEqual(ranked);
  });

  it('falls back to skill level and then alphabetical name ordering', () => {
    const players = [
      player('1', 'Zed', null, 'B'),
      player('2', 'Amy', null, 'B'),
      player('3', 'Chris', null, 'A'),
      player('4', 'Dale', null, 'd'),
    ];

    expect(getBestAutoPickPlayer(players)?.player_name).toBe('Chris');
    expect(getBestAutoPickPlayer([players[0], players[1]])?.player_name).toBe('Amy');
  });

  it('returns null when no players are available', () => {
    expect(getBestAutoPickPlayer([])).toBeNull();
  });
});

