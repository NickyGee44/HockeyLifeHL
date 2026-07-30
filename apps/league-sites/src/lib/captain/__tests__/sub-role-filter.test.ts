import { describe, expect, it } from '@jest/globals';

import {
  filterSubCandidatesByReplacementRole,
  getSubPositionRole,
  matchesSubCandidateSearch,
} from '../sub-role-filter';

describe('sub role filtering', () => {
  it('classifies goalies separately from skaters', () => {
    expect(getSubPositionRole('Goalie')).toBe('goalie');
    expect(getSubPositionRole('G')).toBe('goalie');
    expect(getSubPositionRole('Forward')).toBe('skater');
    expect(getSubPositionRole('Defense')).toBe('skater');
    expect(getSubPositionRole('D')).toBe('skater');
    expect(getSubPositionRole('LW')).toBe('skater');
    expect(getSubPositionRole(null)).toBeNull();
  });

  it('shows only goalies when replacing a goalie', () => {
    const filtered = filterSubCandidatesByReplacementRole(
      [
        { id: 'goalie', position: 'Goalie' },
        { id: 'skater', position: 'Forward' },
        { id: 'unknown', position: null },
      ],
      'Goalie',
    );

    expect(filtered.map((candidate) => candidate.id)).toEqual(['goalie']);
  });

  it('shows forwards and defense only when replacing a skater', () => {
    const filtered = filterSubCandidatesByReplacementRole(
      [
        { id: 'forward', position: 'Forward' },
        { id: 'defense', position: 'Defense' },
        { id: 'skater', position: 'Skater' },
        { id: 'goalie', position: 'Goalie' },
        { id: 'unknown', position: null },
      ],
      'Defense',
    );

    expect(filtered.map((candidate) => candidate.id)).toEqual(['forward', 'defense', 'skater']);
  });

  it('matches a one-character spelling variant in player search', () => {
    expect(
      matchesSubCandidateSearch(
        { full_name: 'Vince Mitalas', email: null, position: 'Goalie' },
        'Vince Mitalis',
      ),
    ).toBe(true);
  });
});
