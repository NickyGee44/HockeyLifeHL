import {
  buildArticleMentions,
  splitArticleParagraphIntoSegments,
} from '../linkify';

describe('article linkification', () => {
  it('builds player, team, and related game mentions', () => {
    const mentions = buildArticleMentions({
      leagueSlug: 'north-division',
      players: [{id: 'player-1', fullName: 'Connor Smith'}],
      teams: [{id: 'team-1', name: 'North Stars', slug: 'north-stars'}],
      relatedGame: {
        id: 'game-9',
        awayTeamName: 'North Stars',
        homeTeamName: 'Ice Dogs',
      },
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
      players: [{id: 'player-1', fullName: 'Connor Smith'}],
      teams: [
        {id: 'team-1', name: 'North Stars', slug: 'north-stars'},
        {id: 'team-2', name: 'Ice Dogs', slug: 'ice-dogs'},
      ],
      relatedGame: {
        id: 'game-9',
        awayTeamName: 'North Stars',
        homeTeamName: 'Ice Dogs',
      },
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

  it('links matchup phrases written with vs. punctuation', () => {
    const mentions = buildArticleMentions({
      leagueSlug: 'north-division',
      players: [],
      teams: [
        {id: 'team-1', name: 'North Stars', slug: 'north-stars'},
        {id: 'team-2', name: 'Ice Dogs', slug: 'ice-dogs'},
      ],
      relatedGame: {
        id: 'game-9',
        awayTeamName: 'Ice Dogs',
        homeTeamName: 'North Stars',
      },
    });

    const segments = splitArticleParagraphIntoSegments(
      'Tonight features North Stars vs. Ice Dogs in a key matchup.',
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
        text: ' in a key matchup.',
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
