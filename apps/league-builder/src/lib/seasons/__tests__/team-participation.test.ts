import { describe, expect, it } from '@jest/globals';

import { resolveSeasonParticipationTeamIds } from '../team-participation';

describe('resolveSeasonParticipationTeamIds', () => {
  it('falls back to season preference teams when no hard participation markers exist', () => {
    const ids = resolveSeasonParticipationTeamIds({
      seasonPreferenceTeamIds: ['team-a', 'team-b', 'team-a'],
      rosterTeamIds: [],
      registrationTeamIds: [],
      gameTeamIds: [],
    });

    expect(ids).toEqual(['team-a', 'team-b']);
  });

  it('prefers hard participation markers over broad season preference rows', () => {
    const ids = resolveSeasonParticipationTeamIds({
      seasonPreferenceTeamIds: ['team-a', 'team-b', 'team-c', 'team-d'],
      rosterTeamIds: ['team-a'],
      registrationTeamIds: ['team-b'],
      gameTeamIds: ['team-c'],
    });

    expect(ids).toEqual(['team-a', 'team-b', 'team-c']);
  });

  it('deduplicates mixed hard participation markers', () => {
    const ids = resolveSeasonParticipationTeamIds({
      seasonPreferenceTeamIds: ['team-a', 'team-b'],
      rosterTeamIds: ['team-a'],
      registrationTeamIds: ['team-a', 'team-b'],
      gameTeamIds: ['team-b', 'team-c', 'team-c'],
    });

    expect(ids).toEqual(['team-a', 'team-b', 'team-c']);
  });
});
