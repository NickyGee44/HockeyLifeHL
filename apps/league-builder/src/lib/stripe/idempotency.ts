/**
 * Idempotency Key Generation for Stripe Operations
 *
 * Generates deterministic idempotency keys to prevent duplicate charges
 * and ensure safe retries of Stripe API operations.
 */

import crypto from 'crypto';

/**
 * Generate a deterministic idempotency key from operation data
 *
 * Uses SHA-256 hash of the operation data to ensure:
 * - Same input always produces same key (idempotent retries work)
 * - Different inputs produce different keys (prevents collision)
 * - Keys are unique across operation types
 */
export function generateIdempotencyKey(
  operation: string,
  data: Record<string, any>
): string {
  // Sort keys for deterministic stringification
  const sortedData = Object.keys(data)
    .sort()
    .reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {} as Record<string, any>);

  // Create hash of operation + sorted data
  const hash = crypto
    .createHash('sha256')
    .update(operation + JSON.stringify(sortedData))
    .digest('hex')
    .substring(0, 16);

  return `${operation}-${hash}`;
}

/**
 * Generate time-based idempotency key (less safe but simpler)
 * Use only when operation data is not available
 */
export function generateTimedIdempotencyKey(
  operation: string,
  uniqueId: string
): string {
  const timestamp = Date.now();
  return `${operation}-${uniqueId}-${timestamp}`;
}
