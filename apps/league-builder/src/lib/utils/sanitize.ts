/**
 * PII Sanitization Utilities
 *
 * These utilities help prevent PII (Personally Identifiable Information) from
 * being logged or exposed in error messages.
 */

// Email pattern
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;

// Phone number patterns (common formats)
const PHONE_REGEX = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// Name patterns (First Last format - less reliable but catches some)
const NAME_REGEX = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;

/**
 * Sanitizes an error object by removing PII from error messages.
 * Use this before logging errors to prevent PII exposure in logs.
 *
 * @param error - The error object to sanitize
 * @returns A sanitized error object safe for logging
 */
export function sanitizeErrorForLogging(error: unknown): object {
  if (!error) {
    return { message: 'Unknown error' };
  }

  const safe: Record<string, unknown> = {};

  if (error instanceof Error) {
    safe.name = error.name;
    safe.message = sanitizeString(error.message);
    // Don't include stack traces in production as they may contain file paths with usernames
    if (process.env.NODE_ENV === 'development') {
      safe.stack = sanitizeString(error.stack || '');
    }
  } else if (typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;

    // Safe fields that don't typically contain PII
    if (errorObj.code) safe.code = errorObj.code;
    if (errorObj.hint) safe.hint = sanitizeString(String(errorObj.hint));
    if (errorObj.statusCode) safe.statusCode = errorObj.statusCode;
    if (errorObj.status) safe.status = errorObj.status;

    // Sanitize message if present
    if (errorObj.message) {
      safe.message = sanitizeString(String(errorObj.message));
    }

    // Don't include: query, details, data, or any raw database response fields
  } else if (typeof error === 'string') {
    safe.message = sanitizeString(error);
  } else {
    safe.message = 'Unknown error type';
  }

  return safe;
}

/**
 * Removes PII patterns from a string.
 *
 * @param str - The string to sanitize
 * @returns The string with PII replaced by placeholders
 */
export function sanitizeString(str: string): string {
  if (!str) return '';

  return str
    .replace(EMAIL_REGEX, '[EMAIL]')
    .replace(PHONE_REGEX, '[PHONE]')
    // Be careful with name replacement as it can have false positives
    // Only use in error logging context
    .replace(/email[=:]?\s*['"]?[^'"}\s]+['"]?/gi, 'email=[REDACTED]')
    .replace(/full_name[=:]?\s*['"]?[^'"}\s]+['"]?/gi, 'full_name=[REDACTED]');
}

/**
 * Creates a safe log message from an error.
 *
 * @param context - Description of what operation failed
 * @param error - The error that occurred
 * @returns A formatted string safe for logging
 */
export function formatSafeLogMessage(context: string, error: unknown): string {
  const sanitized = sanitizeErrorForLogging(error);
  return `${context}: ${JSON.stringify(sanitized)}`;
}
