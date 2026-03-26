import {
  buildArticleMentions,
  splitArticleParagraphIntoSegments,
} from '../linkify';

describe('article linkification', () => {
  it('builds player, team, and tagged game mentions', () => {
    const mentions = buildArticleMentions({
      leagueSlug: 'north-division',
      players: [{ id: 'player-1', fullName: 'Connor Smith' }],
      teams: [{ id: 'team-1', name: 'North Stars', slug: 'north-stars' }],
      games: [
        {
          id: 'game-9',
          awayTeamName: 'North Stars',
          homeTeamName: 'Ice Dogs',
        },
      ],
    });

    expect(mentions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'Connor Smith',
          href: '/north-division/players/player-1',
          kind: 'player',
        }),
        expect.objectContaining({
          text: 'Smith',
          href: '/north-division/players/player-1',
          kind: 'player',
        }),
        expect.objectContaining({
          text: 'North Stars',
          href: '/north-division/teams/north-stars',
          kind: 'team',
        }),
        expect.objectContaining({
          text: 'North Stars @ Ice Dogs',
          href: '/north-division/games/game-9',
          kind: 'game',
        }),
      ]),
    );
  });

  it('splits paragraphs into linked and plain segments', () => {
    const mentions = buildArticleMentions({
      leagueSlug: 'north-division',
      players: [{ id: 'player-1', fullName: 'Connor Smith' }],
      teams: [
        { id: 'team-1', name: 'North Stars', slug: 'north-stars' },
        { id: 'team-2', name: 'Ice Dogs', slug: 'ice-dogs' },
      ],
      games: [
        {
          id: 'game-9',
          awayTeamName: 'North Stars',
          homeTeamName: 'Ice Dogs',
        },
      ],
    });

    const segments = splitArticleParagraphIntoSegments(
      'Connor Smith scored in the North Stars @ Ice Dogs matchup.',
      mentions,
    );

    expect(segments).toEqual([
      {
        text: 'Connor Smith',
        href: '/north-division/players/player-1',
        kind: 'player',
      },
      {
        text: ' scored in the ',
        href: null,
        kind: null,
      },
      {
        text: 'North Stars @ Ice Dogs',
        href: '/north-division/games/game-9',
        kind: 'game',
      },
      {
        text: ' matchup.',
        href: null,
        kind: null,
      },
    ]);
  });

  it('links multiple tagged games without overlap', () => {
    const mentions = buildArticleMentions({
      leagueSlug: 'north-division',
      players: [],
      teams: [
        { id: 'team-1', name: 'North Stars', slug: 'north-stars' },
        { id: 'team-2', name: 'Ice Dogs', slug: 'ice-dogs' },
        { id: 'team-3', name: 'River Kings', slug: 'river-kings' },
        { id: 'team-4', name: 'Blades', slug: 'blades' },
      ],
      games: [
        {
          id: 'game-9',
          awayTeamName: 'Ice Dogs',
          homeTeamName: 'North Stars',
        },
        {
          id: 'game-10',
          awayTeamName: 'River Kings',
          homeTeamName: 'Blades',
        },
      ],
    });

    const segments = splitArticleParagraphIntoSegments(
      'Tonight features North Stars vs. Ice Dogs and River Kings at Blades.',
      mentions,
    );

    expect(segments).toEqual([
      {
        text: 'Tonight features ',
        href: null,
        kind: null,
      },
      {
        text: 'North Stars vs. Ice Dogs',
        href: '/north-division/games/game-9',
        kind: 'game',
      },
      {
        text: ' and ',
        href: null,
        kind: null,
      },
      {
        text: 'River Kings at Blades',
        href: '/north-division/games/game-10',
        kind: 'game',
      },
      {
        text: '.',
        href: null,
        kind: null,
      },
    ]);
  });

  it('avoids partial word matches and prefers longer phrases', () => {
    const segments = splitArticleParagraphIntoSegments('The Allstars beat John Smith late.', [
      {
        text: 'Stars',
        href: '/league/teams/stars',
        kind: 'team',
        priority: 3,
      },
      {
        text: 'Smith',
        href: '/league/players/player-1',
        kind: 'player',
        priority: 1,
      },
      {
        text: 'John Smith',
        href: '/league/players/player-1',
        kind: 'player',
        priority: 0,
      },
    ]);

    expect(segments).toEqual([
      {
        text: 'The Allstars beat ',
        href: null,
        kind: null,
      },
      {
        text: 'John Smith',
        href: '/league/players/player-1',
        kind: 'player',
      },
      {
        text: ' late.',
        href: null,
        kind: null,
      },
    ]);
  });
});
