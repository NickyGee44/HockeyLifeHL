/**
 * Input Sanitization Utilities
 *
 * Sanitizes user inputs to prevent XSS, SQL injection, and other attacks.
 * React automatically escapes JSX, but this provides additional protection
 * for edge cases and server-side rendering.
 */

/**
 * Remove HTML tags from string
 * Prevents stored XSS attacks
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters
 * Prevents XSS when rendering user content
 */
export function escapeHtml(input: string): string {
  if (!input) return '';

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Sanitize name input (full name, team name, etc.)
 * Allows letters, spaces, hyphens, apostrophes
 */
export function sanitizeName(input: string): string {
  if (!input) return '';

  // Remove HTML tags first
  let sanitized = stripHtml(input);

  // Allow only: letters (any language), spaces, hyphens, apostrophes, periods
  sanitized = sanitized.replace(/[^\p{L}\s\-'.]/gu, '');

  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');

  // Limit length
  sanitized = sanitized.slice(0, 100);

  return sanitized;
}

/**
 * Sanitize email input
 * Removes dangerous characters while preserving valid email format
 */
export function sanitizeEmail(input: string): string {
  if (!input) return '';

  // Remove HTML tags
  let sanitized = stripHtml(input);

  // Convert to lowercase
  sanitized = sanitized.toLowerCase();

  // Remove whitespace
  sanitized = sanitized.trim();

  // Allow only valid email characters
  sanitized = sanitized.replace(/[^a-z0-9@._+-]/g, '');

  // Limit length
  sanitized = sanitized.slice(0, 254); // RFC 5321

  return sanitized;
}

/**
 * Sanitize numeric input
 * Returns null if invalid
 */
export function sanitizeNumber(input: string | number): number | null {
  if (input === null || input === undefined) return null;

  const num = typeof input === 'string' ? parseFloat(input) : input;

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return num;
}

/**
 * Sanitize integer input
 * Returns null if invalid
 */
export function sanitizeInteger(input: string | number): number | null {
  const num = sanitizeNumber(input);
  if (num === null) return null;

  return Math.floor(num);
}

/**
 * Sanitize URL input
 * Returns null if invalid or potentially dangerous
 */
export function sanitizeUrl(input: string): string | null {
  if (!input) return null;

  let sanitized = input.trim();

  // Remove HTML tags
  sanitized = stripHtml(sanitized);

  try {
    const url = new URL(sanitized);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    // Prevent javascript: and data: URLs
    if (url.protocol === 'javascript:' || url.protocol === 'data:') {
      return null;
    }

    return url.toString();
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Sanitize phone number input
 * Removes all non-numeric characters except + at the start
 */
export function sanitizePhone(input: string): string {
  if (!input) return '';

  // Remove HTML tags
  let sanitized = stripHtml(input);

  // Allow + at the beginning, then only numbers, spaces, hyphens, parentheses
  sanitized = sanitized.trim();

  // Remove everything except numbers and common phone formatting
  sanitized = sanitized.replace(/[^\d+() -]/g, '');

  // Limit length
  sanitized = sanitized.slice(0, 20);

  return sanitized;
}

/**
 * Sanitize textarea/multiline input
 * Removes HTML but allows newlines
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (!input) return '';

  // Remove HTML tags
  let sanitized = stripHtml(input);

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Limit consecutive newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Trim
  sanitized = sanitized.trim();

  // Limit length
  sanitized = sanitized.slice(0, maxLength);

  return sanitized;
}

/**
 * Sanitize jersey number
 * Must be 0-99
 */
export function sanitizeJerseyNumber(input: string | number): number | null {
  const num = sanitizeInteger(input);

  if (num === null || num < 0 || num > 99) {
    return null;
  }

  return num;
}

/**
 * Sanitize object keys and values recursively
 * Useful for sanitizing entire form data objects
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sanitizers: Partial<Record<keyof T, (value: any) => any>> = {}
): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizer = sanitizers[key as keyof T];

    if (sanitizer) {
      // Use custom sanitizer for this field
      sanitized[key] = sanitizer(value);
    } else if (typeof value === 'string') {
      // Default: strip HTML from strings
      sanitized[key] = stripHtml(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, {});
    } else {
      // Keep other types as-is
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate and sanitize invite code
 * Must be alphanumeric, 6-20 characters
 */
export function sanitizeInviteCode(input: string): string | null {
  if (!input) return null;

  let sanitized = stripHtml(input);
  sanitized = sanitized.trim().toUpperCase();

  // Allow only alphanumeric
  sanitized = sanitized.replace(/[^A-Z0-9]/g, '');

  // Check length
  if (sanitized.length < 6 || sanitized.length > 20) {
    return null;
  }

  return sanitized;
}
