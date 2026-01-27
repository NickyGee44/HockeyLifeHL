/**
 * Rate Limiting Tests
 *
 * Run with: npx tsx src/lib/rate-limit.test.ts
 */

import { createRateLimiter, RateLimiters } from './rate-limit';

async function runTests() {
  console.log('🧪 Starting Rate Limiting Tests\n');

  // Test 1: Basic rate limiting
  console.log('Test 1: Basic rate limiting (5 requests/minute)');
  const testLimiter = createRateLimiter({ interval: 60000, limit: 5 });

  let passCount = 0;
  let failCount = 0;

  for (let i = 1; i <= 10; i++) {
    const result = await testLimiter.check('test-user-1');
    if (result.success) {
      passCount++;
      console.log(`  ✅ Request ${i}: Allowed (${result.remaining} remaining)`);
    } else {
      failCount++;
      console.log(`  ❌ Request ${i}: Blocked (rate limit exceeded)`);
    }
  }

  if (passCount === 5 && failCount === 5) {
    console.log('✅ Test 1 PASSED: Rate limiting works correctly\n');
  } else {
    console.log(`❌ Test 1 FAILED: Expected 5 pass, 5 fail. Got ${passCount} pass, ${failCount} fail\n`);
  }

  // Test 2: Different users are tracked separately
  console.log('Test 2: Different users tracked separately');
  const user1Result = await RateLimiters.strict.check('user-1');
  const user2Result = await RateLimiters.strict.check('user-2');

  if (user1Result.success && user2Result.success) {
    console.log('✅ Test 2 PASSED: Different users tracked separately\n');
  } else {
    console.log('❌ Test 2 FAILED: Users should be tracked independently\n');
  }

  // Test 3: Pre-configured limiters
  console.log('Test 3: Pre-configured limiters');
  const strictTest = await RateLimiters.strict.check('strict-test');
  const standardTest = await RateLimiters.standard.check('standard-test');
  const generousTest = await RateLimiters.generous.check('generous-test');

  console.log(`  Strict limiter: ${strictTest.limit} req/min`);
  console.log(`  Standard limiter: ${standardTest.limit} req/min`);
  console.log(`  Generous limiter: ${generousTest.limit} req/min`);

  if (
    strictTest.limit === 5 &&
    standardTest.limit === 10 &&
    generousTest.limit === 30
  ) {
    console.log('✅ Test 3 PASSED: Pre-configured limiters work correctly\n');
  } else {
    console.log('❌ Test 3 FAILED: Limiter configurations incorrect\n');
  }

  // Test 4: Reset functionality
  console.log('Test 4: Reset functionality');
  const resetLimiter = createRateLimiter({ interval: 60000, limit: 2 });

  await resetLimiter.check('reset-user');
  await resetLimiter.check('reset-user');
  const blockedResult = await resetLimiter.check('reset-user');

  if (!blockedResult.success) {
    console.log('  ✅ User blocked after limit');

    resetLimiter.reset('reset-user');
    const afterResetResult = await resetLimiter.check('reset-user');

    if (afterResetResult.success) {
      console.log('  ✅ User can make requests after reset');
      console.log('✅ Test 4 PASSED: Reset functionality works\n');
    } else {
      console.log('  ❌ User still blocked after reset');
      console.log('❌ Test 4 FAILED\n');
    }
  } else {
    console.log('  ❌ User should be blocked');
    console.log('❌ Test 4 FAILED\n');
  }

  // Test 5: Time window expiry (simulated)
  console.log('Test 5: Time window expiry');
  const shortLimiter = createRateLimiter({ interval: 100, limit: 1 }); // 100ms window

  await shortLimiter.check('expiry-user');
  const immediateResult = await shortLimiter.check('expiry-user');

  if (!immediateResult.success) {
    console.log('  ✅ User blocked within time window');

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    const afterExpiryResult = await shortLimiter.check('expiry-user');

    if (afterExpiryResult.success) {
      console.log('  ✅ User can make requests after window expires');
      console.log('✅ Test 5 PASSED: Time window expiry works\n');
    } else {
      console.log('  ❌ User still blocked after window expires');
      console.log('❌ Test 5 FAILED\n');
    }
  } else {
    console.log('  ❌ User should be blocked');
    console.log('❌ Test 5 FAILED\n');
  }

  console.log('✅ All Rate Limiting Tests Complete!');
}

// Run tests
runTests().catch(console.error);
