/**
 * Validates that a redirect URL belongs to an allowed origin.
 *
 * Prevents attackers from passing arbitrary URLs (e.g. phishing sites)
 * as success/cancel URLs in Stripe Checkout sessions.
 */
export function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_LEAGUE_SITES_URL,
    ].filter(Boolean) as string[];

    // In development, also allow localhost
    if (process.env.NODE_ENV === 'development') {
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1'
      ) {
        return true;
      }
    }

    return allowedOrigins.some((origin) => {
      try {
        return new URL(origin).origin === parsed.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
