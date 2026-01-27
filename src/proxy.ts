import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Multi-Instance Domain Routing Proxy
 *
 * This proxy handles domain-based routing for the multi-tenant architecture:
 * 1. Platform domains (beerleaguehockey.ca) -> Marketing/platform pages
 * 2. Subdomains (pilot.beerleaguehockey.ca) -> League-specific pages
 * 3. Custom domains (customleague.com) -> League-specific pages
 *
 * Performance target: < 10ms execution time
 */

// Platform domains that should NOT be routed to league instances
const PLATFORM_DOMAINS = [
  'beerleaguehockey.ca',
  'www.beerleaguehockey.ca',
  'localhost',
  'localhost:3000',
  '127.0.0.1',
  '127.0.0.1:3000',
];

// Marketing/public paths that should be accessible on platform domain
const MARKETING_PATHS = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pilot',
];

/**
 * Check if a path is a marketing/public path
 */
function isMarketingPath(pathname: string): boolean {
  // Exact match for root
  if (pathname === '/') return true;

  // Check if path starts with any marketing path prefix
  return MARKETING_PATHS.some(marketingPath => {
    if (marketingPath === '/') return false; // Already handled
    return pathname === marketingPath || pathname.startsWith(marketingPath + '/');
  });
}

/**
 * Check if hostname is a platform domain
 */
function isPlatformDomain(hostname: string): boolean {
  // Remove port if present for comparison
  const hostnameWithoutPort = hostname.split(':')[0];

  return PLATFORM_DOMAINS.some(domain => {
    const domainWithoutPort = domain.split(':')[0];
    return hostnameWithoutPort === domainWithoutPort ||
           hostnameWithoutPort === `www.${domainWithoutPort}`;
  });
}

/**
 * Check if hostname is a subdomain of the platform
 */
function isSubdomain(hostname: string): boolean {
  const hostnameWithoutPort = hostname.split(':')[0].toLowerCase();

  // Check for subdomain pattern: xxx.beerleaguehockey.ca or xxx.localhost
  const subdomainPatterns = [
    /^[a-z0-9-]+\.beerleaguehockey\.ca$/,
    /^[a-z0-9-]+\.localhost$/,
    /^[a-z0-9-]+\.127\.0\.0\.1$/,
  ];

  // Don't match www as subdomain
  if (hostnameWithoutPort.startsWith('www.')) {
    return false;
  }

  return subdomainPatterns.some(pattern => pattern.test(hostnameWithoutPort));
}

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
  const hostnameWithoutPort = hostname.split(':')[0].toLowerCase();

  // Extract the first part before the first dot
  const parts = hostnameWithoutPort.split('.');
  if (parts.length > 1 && parts[0] !== 'www') {
    return parts[0];
  }

  return null;
}

/**
 * Check if this is a custom domain (not platform, not subdomain)
 */
function isCustomDomain(hostname: string): boolean {
  return !isPlatformDomain(hostname) && !isSubdomain(hostname);
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Performance: Early return for static assets (should be caught by matcher but double-check)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files
  ) {
    return await updateSession(request);
  }

  // ===== ADMIN SUBDOMAIN ROUTING =====
  // If this is admin subdomain (admin.beerleaguehockey.ca), rewrite to /admin
  if (hostname === 'admin.beerleaguehockey.ca' || hostname === 'admin.localhost') {
    const url = request.nextUrl.clone();

    // If not already accessing /admin path, rewrite to it
    if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`;
    }

    // Run session update first to handle auth
    const sessionResponse = await updateSession(request);

    // If session middleware returned a redirect, respect it
    if (sessionResponse.status >= 300 && sessionResponse.status < 400) {
      return sessionResponse;
    }

    // Create rewrite response
    const response = NextResponse.rewrite(url);

    // Copy cookies from session response
    sessionResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
  }

  // ===== PLATFORM DOMAIN ROUTING =====
  // If this is a platform domain, handle normally (marketing pages, auth, etc.)
  if (isPlatformDomain(hostname)) {
    // Marketing paths and auth paths are handled normally on platform
    if (isMarketingPath(pathname)) {
      return await updateSession(request);
    }

    // Dashboard and other protected paths are also handled normally
    return await updateSession(request);
  }

  // ===== SUBDOMAIN ROUTING =====
  // If this is a subdomain (pilot.beerleaguehockey.ca), rewrite to /league/*
  if (isSubdomain(hostname)) {
    const subdomain = extractSubdomain(hostname);

    if (subdomain) {
      // Create new headers with league context
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-league-hostname', hostname);
      requestHeaders.set('x-league-subdomain', subdomain);

      // Rewrite the URL to /league/* path while preserving original URL in browser
      const url = request.nextUrl.clone();

      // If already accessing /league path, don't double-rewrite
      if (!pathname.startsWith('/league')) {
        url.pathname = `/league${pathname}`;
      }

      // Run session update first to handle auth
      const sessionResponse = await updateSession(request);

      // If session middleware returned a redirect, respect it
      if (sessionResponse.status >= 300 && sessionResponse.status < 400) {
        return sessionResponse;
      }

      // Create rewrite response with headers
      const response = NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });

      // Copy cookies from session response
      sessionResponse.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, cookie);
      });

      return response;
    }
  }

  // ===== CUSTOM DOMAIN ROUTING =====
  // If this is a custom domain (customleague.com), rewrite to /league/*
  if (isCustomDomain(hostname)) {
    // Create new headers with league context
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-league-hostname', hostname);
    // Custom domains don't have a subdomain - the full hostname is used for lookup

    // Rewrite the URL to /league/* path
    const url = request.nextUrl.clone();

    // If already accessing /league path, don't double-rewrite
    if (!pathname.startsWith('/league')) {
      url.pathname = `/league${pathname}`;
    }

    // Run session update first to handle auth
    const sessionResponse = await updateSession(request);

    // If session middleware returned a redirect, respect it
    if (sessionResponse.status >= 300 && sessionResponse.status < 400) {
      return sessionResponse;
    }

    // Create rewrite response with headers
    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });

    // Copy cookies from session response
    sessionResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
  }

  // Default: pass through to session middleware
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
