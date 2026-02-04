import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Multi-tenant subdomain routing middleware for Platform 2 (League Sites)
 *
 * Handles routing for:
 * - [league-slug].beerleaguehockey.ca -> /[leagueSlug]/...
 * - Custom domains (future) -> /[leagueSlug]/...
 *
 * Examples:
 * - metro-hockey.beerleaguehockey.ca -> /metro-hockey/
 * - metro-hockey.beerleaguehockey.ca/schedule -> /metro-hockey/schedule
 * - metro-hockey.beerleaguehockey.ca/teams/dragons -> /metro-hockey/teams/dragons
 */

// List of reserved subdomains that should not be treated as league slugs
const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'builder',
  'auth',
  'cdn',
  'static',
  'assets',
];

// Production domain for the league sites
const PRODUCTION_DOMAIN = 'beerleaguehockey.ca';

// Development domain patterns
const DEV_DOMAINS = ['localhost', '127.0.0.1', '.local'];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Extract subdomain
  const subdomain = getSubdomain(hostname);

  // If no subdomain or reserved subdomain, continue normally
  if (!subdomain || RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return NextResponse.next();
  }

  // Check if already on a league route (avoid infinite rewrite)
  if (url.pathname.startsWith(`/${subdomain}`)) {
    return NextResponse.next();
  }

  // Rewrite URL to include league slug
  // metro-hockey.beerleaguehockey.ca/schedule -> /metro-hockey/schedule
  const newPath = `/${subdomain}${url.pathname}`;
  url.pathname = newPath;

  // Add league slug header for components to read
  const response = NextResponse.rewrite(url);
  response.headers.set('x-league-slug', subdomain);

  return response;
}

/**
 * Extract subdomain from hostname
 *
 * Examples:
 * - metro-hockey.beerleaguehockey.ca -> metro-hockey
 * - metro-hockey.sites.beerleaguehockey.ca -> metro-hockey
 * - metro-hockey.localhost:3001 -> metro-hockey
 * - localhost:3001 -> null
 * - beerleaguehockey.ca -> null
 */
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Check for development environments
  const isDev = DEV_DOMAINS.some(
    (dev) => host === dev || host.endsWith(dev)
  );

  if (isDev) {
    // For local dev: metro-hockey.localhost -> metro-hockey
    const parts = host.split('.');
    if (parts.length > 1 && parts[0] !== 'www') {
      return parts[0];
    }
    return null;
  }

  // Production: metro-hockey.beerleaguehockey.ca
  // or: metro-hockey.sites.beerleaguehockey.ca
  if (host.endsWith(PRODUCTION_DOMAIN)) {
    // Remove the base domain
    const withoutBase = host.replace(`.${PRODUCTION_DOMAIN}`, '');

    // Handle sites subdomain pattern
    if (withoutBase.endsWith('.sites')) {
      return withoutBase.replace('.sites', '');
    }

    // Direct subdomain
    if (withoutBase && !withoutBase.includes('.')) {
      return withoutBase;
    }
  }

  return null;
}

export const config = {
  // Match all paths except static files and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
