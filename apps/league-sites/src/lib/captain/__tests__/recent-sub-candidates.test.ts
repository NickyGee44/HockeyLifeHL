import { describe, expect, it } from '@jest/globals';

import {
  buildRecentSubCandidates,
  selectRecentSubGoalieSeasonIds,
  selectRecentSubSeasonIds,
} from '../recent-sub-candidates';

describe('recent sub candidates', () => {
  it('selects the current game season plus the immediately previous league season', () => {
    const seasonIds = selectRecentSubSeasonIds(
      [
        { id: 'summer-2026', name: 'Summer 2026', start_date: '2026-06-01', created_at: '2026-05-01' },
        { id: 'spring-2026', name: 'Spring 2026', start_date: '2026-03-01', created_at: '2026-02-01' },
        { id: 'winter-2026', name: 'Winter 2026', start_date: '2026-01-01', created_at: '2025-12-01' },
      ],
      'summer-2026',
    );

    expect(seasonIds).toEqual(['summer-2026', 'spring-2026']);
  });

  it('excludes historical baseline seasons when finding the previous season', () => {
    const seasonIds = selectRecentSubSeasonIds(
      [
        { id: 'summer-2026', name: 'Summer 2026', start_date: '2026-06-01', created_at: '2026-05-01' },
        { id: 'baseline', name: 'Historical Career Baseline (Pre-BLH)', start_date: '2026-04-01', created_at: '2026-04-01' },
        { id: 'spring-2026', name: 'Spring 2026', start_date: '2026-03-01', created_at: '2026-02-01' },
      ],
      'summer-2026',
    );

    expect(seasonIds).toEqual(['summer-2026', 'spring-2026']);
  });

  it('includes historical baseline seasons for goalie replacement searches', () => {
    const seasonIds = selectRecentSubGoalieSeasonIds(
      [
        { id: 'summer-2026', name: 'Summer 2026', start_date: '2026-06-01', created_at: '2026-05-01' },
        { id: 'baseline', name: 'Historical Career Baseline (Pre-BLH)', start_date: '2026-04-01', created_at: '2026-04-01' },
        { id: 'spring-2026', name: 'Spring 2026', start_date: '2026-03-01', created_at: '2026-02-01' },
      ],
      'summer-2026',
    );

    expect(seasonIds).toEqual(['summer-2026', 'spring-2026', 'baseline']);
  });

  it('deduplicates skater and goalie stat rows while excluding active current-season rostered players', () => {
    const candidates = buildRecentSubCandidates({
      currentSeasonRosterPlayerIds: ['current-roster-player'],
      skaterRows: [
        {
          player_id: 'recent-skater',
          game: { scheduled_at: '2026-07-10T01:00:00Z' },
          player: { id: 'recent-skater', full_name: 'Recent Skater', email: 'skater@example.com' },
        },
        {
          player_id: 'current-roster-player',
          game: { scheduled_at: '2026-07-09T01:00:00Z' },
          player: { id: 'current-roster-player', full_name: 'Rostered Player', email: 'rostered@example.com' },
        },
      ],
      goalieRows: [
        {
          player_id: 'recent-skater',
          game: { scheduled_at: '2026-07-11T01:00:00Z' },
          player: { id: 'recent-skater', full_name: 'Recent Skater', email: 'skater@example.com' },
        },
        {
          player_id: 'recent-goalie',
          game: { scheduled_at: '2026-07-08T01:00:00Z' },
          player: { id: 'recent-goalie', full_name: 'Recent Goalie', email: null },
        },
      ],
    });

    expect(candidates).toEqual([
      {
        id: 'recent-goalie',
        full_name: 'Recent Goalie',
        email: null,
        position: 'Goalie',
        last_played_at: '2026-07-08T01:00:00Z',
      },
      {
        id: 'recent-skater',
        full_name: 'Recent Skater',
        email: 'skater@example.com',
        position: 'Skater',
        last_played_at: '2026-07-11T01:00:00Z',
      },
    ]);
  });
});
