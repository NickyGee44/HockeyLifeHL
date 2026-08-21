export interface PublicGameLeague {
  slug: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  custom_domain_verified?: boolean | null;
}

export interface PublicGameUrlOptions {
  recap?: boolean;
  sharedOrigin?: string | null;
}

export function resolveSharedGameOrigin(configuredOrigin?: string | null): string | null {
  if (!configuredOrigin) return null;

  try {
    const url = new URL(configuredOrigin);
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'beerleaguehockey.ca' || hostname.endsWith('.beerleaguehockey.ca')) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function buildPublicGameUrl(
  league: PublicGameLeague,
  gameId: string,
  options: PublicGameUrlOptions = {},
): string {
  const customDomain = league.custom_domain?.replace(/\/$/, '');
  const suffix = options.recap ? '#recap' : '';
  if (customDomain && league.custom_domain_verified) {
    const origin = /^https?:\/\//i.test(customDomain) ? customDomain : `https://${customDomain}`;
    return `${origin}/games/${gameId}${suffix}`;
  }

  const sharedOrigin = options.sharedOrigin?.replace(/\/$/, '');
  if (sharedOrigin) {
    return `${sharedOrigin}/${league.slug}/games/${gameId}${suffix}`;
  }

  // Middleware treats the tenant hostname as the league slug. A legacy/custom
  // subdomain that differs from the slug is not routable without a DB lookup,
  // so use the always-routable slug hostname instead of producing a 404.
  const tenantSubdomain = league.subdomain === league.slug ? league.subdomain : league.slug;
  return `https://${tenantSubdomain}.beerleaguehockey.ca/games/${gameId}${suffix}`;
}
