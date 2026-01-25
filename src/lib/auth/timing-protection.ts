/**
 * Timing Attack Protection
 *
 * Prevents attackers from determining if a user account exists
 * by measuring response times of authentication operations.
 *
 * All auth operations should take approximately the same amount of time,
 * regardless of whether the email exists or not.
 */

/**
 * Adds a random delay to make timing attacks more difficult
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 */
export async function addRandomDelay(minMs: number = 200, maxMs: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Executes an async function and ensures it takes at least a minimum amount of time
 * This prevents timing attacks by making all operations take consistent time
 *
 * @param fn - Async function to execute
 * @param minMs - Minimum time the operation should take
 * @returns The result of the function
 */
export async function withMinimumTime<T>(
  fn: () => Promise<T>,
  minMs: number = 1000
): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const elapsed = Date.now() - start;

  if (elapsed < minMs) {
    await new Promise(resolve => setTimeout(resolve, minMs - elapsed));
  }

  return result;
}

/**
 * Executes an async function with consistent timing regardless of outcome
 * Adds random delay at the end to make timing analysis harder
 *
 * @param fn - Async function to execute
 * @param minMs - Minimum time the operation should take
 * @param maxMs - Maximum time (adds random delay up to this)
 * @returns The result of the function
 */
export async function withConsistentTiming<T>(
  fn: () => Promise<T>,
  minMs: number = 1000,
  maxMs: number = 1500
): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const elapsed = Date.now() - start;

  // Calculate remaining time to reach minimum
  let remainingTime = minMs - elapsed;
  if (remainingTime < 0) remainingTime = 0;

  // Add random delay on top
  const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1));
  const totalDelay = remainingTime + randomDelay;

  if (totalDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, totalDelay));
  }

  return result;
}
