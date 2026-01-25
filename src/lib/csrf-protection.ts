/**
 * CSRF Protection for API Routes
 *
 * Next.js Server Actions have built-in CSRF protection.
 * This utility provides CSRF protection for API routes through Origin header validation.
 */

/**
 * Validates the Origin header to prevent CSRF attacks
 * Ensures requests come from the same origin
 *
 * @param request - Next.js request object
 * @returns true if valid, false otherwise
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Get allowed origins from environment or use current host
  const allowedOrigins = getAllowedOrigins(host);

  // Allow requests without origin header (same-origin requests from browsers don't always send it)
  // But this is actually a security risk for state-changing operations
  // For POST/PUT/DELETE we should require origin
  const method = request.method;
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (!origin) {
      // No origin header on state-changing request - likely not from browser or curl
      console.warn(`CSRF Warning: ${method} request without Origin header to ${request.url}`);
      return false;
    }
  }

  // If origin exists, validate it
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`CSRF Warning: Request from unauthorized origin: ${origin}`);
    return false;
  }

  return true;
}

/**
 * Get list of allowed origins for CSRF validation
 * @param host - Current host from request headers
 * @returns Array of allowed origins
 */
function getAllowedOrigins(host: string | null): string[] {
  const allowedOrigins: string[] = [];

  // Add production URL from environment
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    allowedOrigins.push(process.env.NEXT_PUBLIC_SITE_URL);
  }

  // Add current host
  if (host) {
    // Add both http and https variants
    allowedOrigins.push(`https://${host}`);
    allowedOrigins.push(`http://${host}`);
  }

  // Development
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://127.0.0.1:3000');
  }

  return allowedOrigins;
}

/**
 * Generate a JSON response for CSRF validation failure
 * @returns NextResponse with 403 status
 */
export function csrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Invalid request origin. This request was blocked for security reasons.',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
