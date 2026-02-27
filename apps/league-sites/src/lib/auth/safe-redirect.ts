/**
 * Validate a redirect path to prevent open-redirect attacks.
 * Only relative paths starting with "/" are allowed; anything else
 * (absolute URLs, protocol-relative "//evil.com", etc.) falls back to "/".
 */
export function safeRedirectPath(next: string | null): string {
  if (!next) return '/';
  // Must start with "/" and must NOT start with "//" (protocol-relative URL)
  if (next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/';
}
