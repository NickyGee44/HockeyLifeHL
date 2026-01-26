/**
 * League Slug Utilities
 *
 * Utilities for generating and validating league slugs.
 * Slugs are used in subdomains: {slug}.hockeylifehl.app
 */

/**
 * Generate a URL-safe slug from a league name
 * Example: "Winter Warriors Hockey" -> "winter-warriors-hockey"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters
    .replace(/[^a-z0-9-]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50);
}

/**
 * Validate a league slug
 * Returns { valid: boolean, error?: string }
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  // Check if slug is empty
  if (!slug || slug.trim().length === 0) {
    return { valid: false, error: 'Slug cannot be empty' };
  }

  // Check length (minimum 3, maximum 50)
  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters long' };
  }

  if (slug.length > 50) {
    return { valid: false, error: 'Slug must be less than 50 characters' };
  }

  // Check format (lowercase letters, numbers, hyphens only)
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return {
      valid: false,
      error: 'Slug must contain only lowercase letters, numbers, and hyphens (no spaces or special characters)',
    };
  }

  // Check for reserved slugs that would conflict with platform routes
  const reservedSlugs = [
    'www',
    'app',
    'api',
    'admin',
    'auth',
    'login',
    'signup',
    'dashboard',
    'settings',
    'help',
    'support',
    'docs',
    'blog',
    'about',
    'contact',
    'pricing',
    'features',
    'privacy',
    'terms',
    'status',
    'cdn',
    'assets',
    'static',
    'public',
    'hockeylife',
    'hockeylifehl',
    'test',
    'demo',
    'staging',
    'prod',
    'production',
    'dev',
    'development',
  ];

  if (reservedSlugs.includes(slug)) {
    return { valid: false, error: `The slug "${slug}" is reserved and cannot be used` };
  }

  return { valid: true };
}

/**
 * Check if a slug is available (not already taken)
 * NOTE: This is a client-side utility. Server-side validation
 * should query the database directly.
 */
export function isSafeSlu(slug: string): boolean {
  const validation = validateSlug(slug);
  return validation.valid;
}
