import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Multi-tenant subdomain routing middleware for Platform 2 (League Sites)
 *
 * Handles routing for:
 * - [league-slug].beerleaguehockey.ca -> /[leagueSlug]/...
 * - Custom domains (e.g. truenorthhockey.ca) -> /[leagueSlug]/...
 *
 * Examples:
 * - metro-hockey.beerleaguehockey.ca -> /metro-hockey/
 * - metro-hockey.beerleaguehockey.ca/schedule -> /metro-hockey/schedule
 * - truenorthhockey.ca -> /[slug from DB]/
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

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Extract subdomain
  const subdomain = getSubdomain(hostname);

  // Build the base response (rewrite or passthrough)
  let response: NextResponse;

  if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    // -----------------------------------------------------------------------
    // Subdomain route: metro-hockey.beerleaguehockey.ca -> /metro-hockey/...
    // -----------------------------------------------------------------------
    if (url.pathname.startsWith(`/${subdomain}`)) {
      // Already on a league route (avoid infinite rewrite)
      response = NextResponse.next();
    } else {
      const newPath = `/${subdomain}${url.pathname}`;
      url.pathname = newPath;
      response = NextResponse.rewrite(url);
      response.headers.set('x-league-slug', subdomain);
    }
  } else if (!subdomain && isCustomDomainCandidate(hostname)) {
    // -----------------------------------------------------------------------
    // Custom domain route: truenorthhockey.ca -> look up slug in DB
    // -----------------------------------------------------------------------
    const slug = await resolveCustomDomain(hostname.split(':')[0]);

    if (slug) {
      if (url.pathname.startsWith(`/${slug}`)) {
        // Already rewritten — passthrough
        response = NextResponse.next();
      } else {
        const newPath = `/${slug}${url.pathname}`;
        url.pathname = newPath;
        response = NextResponse.rewrite(url);
        response.headers.set('x-league-slug', slug);
      }
    } else {
      // Unknown custom domain — passthrough (will 404 naturally)
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  // Refresh the Supabase session on every request so server actions always
  // receive a valid, non-expired auth token.
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    // This call refreshes the session token if it's expired
    await supabase.auth.getUser();
  }

  return response;
}

/**
 * Returns true if hostname looks like a real external custom domain
 * (not a BLH subdomain, not localhost).
 */
function isCustomDomainCandidate(hostname: string): boolean {
  const host = hostname.split(':')[0];

  // Skip dev environments
  if (DEV_DOMAINS.some((dev) => host === dev || host.endsWith(dev))) {
    return false;
  }

  // Skip anything that is (or is a subdomain of) beerleaguehockey.ca
  if (host === PRODUCTION_DOMAIN || host.endsWith(`.${PRODUCTION_DOMAIN}`)) {
    return false;
  }

  return true;
}

/**
 * Look up a verified custom domain in the organizations table and return the
 * league slug. Uses the Supabase service-role key so RLS does not block the
 * query (middleware runs outside user session context).
 *
 * Returns null if no matching verified domain is found.
 */
async function resolveCustomDomain(hostname: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn('[middleware] Supabase service role key not configured — cannot resolve custom domain');
    return null;
  }

  try {
    // Use the Supabase REST API directly via fetch (no client lib needed in edge)
    const encodedHostname = encodeURIComponent(hostname);
    const res = await fetch(
      `${supabaseUrl}/rest/v1/organizations?custom_domain=eq.${encodedHostname}&custom_domain_verified=eq.true&select=slug&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: 'application/json',
        },
        // Don't cache — domain mappings can change
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.error('[middleware] Custom domain lookup failed', { status: res.status, hostname });
      return null;
    }

    const rows = (await res.json()) as Array<{ slug: string }>;
    return rows.length > 0 ? rows[0].slug : null;
  } catch (err) {
    console.error('[middleware] Custom domain lookup threw', err);
    return null;
  }
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
 * - truenorthhockey.ca -> null  (custom domain, handled separately)
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
    '/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|.*\\.ico$|.*\\.webmanifest$|badges/|sponsors/).*)',
  ],
};
