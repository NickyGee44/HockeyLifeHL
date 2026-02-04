import { NextRequest, NextResponse } from 'next/server';

// Multi-tenant subdomain routing for Platform 2
// Routes: subdomain.hockeylife.com -> /[league] internally

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Get the subdomain
  // localhost:3001 -> no subdomain (use slug from path)
  // bmhl.localhost:3001 -> subdomain "bmhl"
  // bmhl.hockeylife.com -> subdomain "bmhl"
  // bmhl.com (custom domain) -> lookup in database

  // Skip for static files and API routes
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Parse the hostname
  const currentHost = hostname.replace(':3001', '').replace(':3000', '');

  // Check if it's the main site (no subdomain)
  const isMainSite =
    currentHost === 'localhost' ||
    currentHost === '127.0.0.1' ||
    currentHost === 'hockeylife.com' ||
    currentHost === 'www.hockeylife.com' ||
    currentHost === 'leagues.hockeylife.com';

  if (isMainSite) {
    // Main site shows league listing or redirect to specific league via path
    // e.g., /bmhl will be handled by the app's routing
    return NextResponse.next();
  }

  // Extract subdomain
  let subdomain: string | null = null;

  // Handle *.localhost for local development
  if (currentHost.endsWith('.localhost')) {
    subdomain = currentHost.replace('.localhost', '');
  }
  // Handle *.hockeylife.com for production
  else if (currentHost.endsWith('.hockeylife.com')) {
    subdomain = currentHost.replace('.hockeylife.com', '');
    // Skip if it's a reserved subdomain
    if (['www', 'admin', 'app', 'api', 'leagues'].includes(subdomain)) {
      return NextResponse.next();
    }
  }
  // Handle custom domains (e.g., bmhl.com)
  else {
    // For custom domains, we'll need to look up the domain in the database
    // For now, store the hostname as a header for the app to handle
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-custom-domain', currentHost);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (subdomain) {
    // Rewrite the URL to include the subdomain as a path prefix for routing
    // bmhl.localhost:3001/ -> /league/bmhl/
    // bmhl.localhost:3001/schedule -> /league/bmhl/schedule

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-subdomain', subdomain);

    // Rewrite to the [league] dynamic route
    url.pathname = `/league/${subdomain}${url.pathname}`;

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
