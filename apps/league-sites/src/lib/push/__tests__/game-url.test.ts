import { buildPublicGameUrl, resolveSharedGameOrigin } from '../game-url';

describe('buildPublicGameUrl', () => {
  const gameId = 'game-123';

  it('uses the league slug as the tenant subdomain by default', () => {
    expect(buildPublicGameUrl({ slug: 'hockey-life' }, gameId)).toBe(
      'https://hockey-life.beerleaguehockey.ca/games/game-123',
    );
  });

  it('uses an explicit league subdomain when it matches the routable slug', () => {
    expect(
      buildPublicGameUrl({ slug: 'hockey-life', subdomain: 'hockey-life' }, gameId),
    ).toBe('https://hockey-life.beerleaguehockey.ca/games/game-123');
  });

  it('uses a verified custom domain', () => {
    expect(
      buildPublicGameUrl(
        {
          slug: 'hockey-life',
          custom_domain: 'hockey.example.com',
          custom_domain_verified: true,
        },
        gameId,
      ),
    ).toBe('https://hockey.example.com/games/game-123');
  });

  it('falls back to the tenant subdomain for an unverified custom domain', () => {
    expect(
      buildPublicGameUrl(
        {
          slug: 'hockey-life',
          subdomain: 'hockey-life',
          custom_domain: 'unverified.example.com',
          custom_domain_verified: false,
        },
        gameId,
      ),
    ).toBe('https://hockey-life.beerleaguehockey.ca/games/game-123');
  });

  it('adds the recap fragment when requested', () => {
    expect(buildPublicGameUrl({ slug: 'hockey-life' }, gameId, { recap: true })).toBe(
      'https://hockey-life.beerleaguehockey.ca/games/game-123#recap',
    );
  });

  it('retains slug-prefixed routes for an explicit shared host', () => {
    expect(
      buildPublicGameUrl({ slug: 'hockey-life' }, gameId, {
        recap: true,
        sharedOrigin: 'https://league-sites.example.com/',
      }),
    ).toBe('https://league-sites.example.com/hockey-life/games/game-123#recap');
  });

  it('does not use a distinct subdomain that middleware cannot resolve as the league slug', () => {
    expect(
      buildPublicGameUrl({ slug: 'hockey-life', subdomain: 'hl' }, gameId),
    ).toBe('https://hockey-life.beerleaguehockey.ca/games/game-123');
  });
});

describe('resolveSharedGameOrigin', () => {
  it('uses localhost and non-BLH hosts as shared deployments', () => {
    expect(resolveSharedGameOrigin('http://localhost:3001/')).toBe('http://localhost:3001');
    expect(resolveSharedGameOrigin('https://league-sites-preview.vercel.app')).toBe(
      'https://league-sites-preview.vercel.app',
    );
  });

  it('does not treat the BLH apex or tenant hosts as shared league-site origins', () => {
    expect(resolveSharedGameOrigin('https://www.beerleaguehockey.ca')).toBeNull();
    expect(resolveSharedGameOrigin('https://hockey-life.beerleaguehockey.ca')).toBeNull();
  });

  it('rejects invalid configured origins', () => {
    expect(resolveSharedGameOrigin('not a URL')).toBeNull();
  });
});
