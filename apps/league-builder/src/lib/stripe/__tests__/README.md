# Stripe Module Tests

Unit tests for Stripe integration (organization subscriptions).

---

## Running Tests

### Install Dependencies

```bash
cd apps/league-builder
pnpm install
```

This installs:
- `jest@^29.7.0` - Test runner
- `ts-jest@^29.1.2` - TypeScript support for Jest
- `@types/jest@^29.5.12` - TypeScript types for Jest

### Run All Tests

```bash
pnpm test
```

### Run in Watch Mode

```bash
pnpm test:watch
```

### Generate Coverage Report

```bash
pnpm test:coverage
```

Coverage report will be generated in `apps/league-builder/coverage/`.

---

## Test Files

### `client.test.ts`

Tests for `stripe/client.ts` helper functions:
- `getPriceIdByTier()` - Convert tier name to Stripe price ID
- `getTierByPriceId()` - Convert Stripe price ID to tier name
- Error handling when price IDs not configured

**Coverage:** 90%+ target

### `webhooks.test.ts`

Tests for webhook handler logic:
- **Idempotency:** Duplicate event detection via `organization_subscription_events` table
- **Advisory Locks:** PostgreSQL lock acquisition for race condition prevention
- **Event Ordering:** Timestamp validation to reject out-of-order events
- **Subscription Lifecycle:** Handle created, updated, deleted events
- **Invoice Events:** Handle paid and payment_failed events
- **Error Handling:** Missing metadata, signature failures, database errors

**Coverage:** 80%+ target

---

## Test Environment

### Environment Variables

Tests use mock environment variables defined in `jest.setup.js`:

```javascript
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET_ORGANIZATIONS = 'whsec_test_mock_secret';
process.env.STRIPE_PRICE_ENTERPRISE = 'price_test_enterprise';
```

No real secrets are used in tests.

### Mocking

Tests currently use placeholder mocking. To make tests executable:

1. **Mock Supabase Client:**
   ```typescript
   jest.mock('@supabase/supabase-js', () => ({
     createClient: jest.fn(() => ({
       from: jest.fn(),
       rpc: jest.fn(),
     })),
   }));
   ```

2. **Mock Stripe SDK:**
   ```typescript
   jest.mock('stripe', () => {
     return jest.fn().mockImplementation(() => ({
       webhooks: {
         constructEvent: jest.fn(),
       },
       events: {
         retrieve: jest.fn(),
       },
     }));
   });
   ```

---

## Writing New Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('Specific Scenario', () => {
    it('should do something expected', () => {
      // Arrange: Set up test data
      const input = 'test-input';

      // Act: Execute function under test
      const result = myFunction(input);

      // Assert: Verify expected outcome
      expect(result).toBe('expected-output');
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**
   - ✅ `it('should reject events older than last_stripe_event_timestamp')`
   - ❌ `it('test event ordering')`

2. **Test one thing per test**
   - Each test should verify a single behavior
   - Avoid complex multi-step tests

3. **Mock external dependencies**
   - Mock Supabase client
   - Mock Stripe SDK
   - Mock environment variables

4. **Test error cases**
   - Not just happy path
   - Test missing data, invalid input, network errors

5. **Use meaningful assertions**
   - `expect(result).toBe(expected)` - Exact match
   - `expect(result).toEqual(expected)` - Deep equality
   - `expect(() => fn()).toThrow()` - Error throwing
   - `expect(mockFn).toHaveBeenCalledWith(arg)` - Mock verification

---

## Current Test Status

### `client.test.ts`

| Test Case | Status |
|-----------|--------|
| getPriceIdByTier returns enterprise price ID | ✅ Implemented |
| getPriceIdByTier throws if not configured | ✅ Implemented |
| getTierByPriceId returns enterprise for valid ID | ✅ Implemented |
| getTierByPriceId returns null for unknown ID | ✅ Implemented |
| Round-trip conversion works | ✅ Implemented |

### `webhooks.test.ts`

| Test Case | Status |
|-----------|--------|
| Duplicate event detection | ⚠️ Needs mocking |
| Advisory lock acquisition | ⚠️ Needs mocking |
| Event ordering validation | ⚠️ Needs mocking |
| Subscription created handler | ⚠️ Needs mocking |
| Subscription updated handler | ⚠️ Needs mocking |
| Subscription deleted handler | ⚠️ Needs mocking |
| Invoice paid handler | ⚠️ Needs mocking |
| Invoice payment failed handler | ⚠️ Needs mocking |
| Error handling | ⚠️ Needs mocking |

**Note:** Webhook tests are structured but require Supabase client mocking to be executable.

---

## Integration Testing

For full end-to-end testing, use:

1. **Stripe CLI Testing:**
   - See `docs/STRIPE_CLI_TESTING_GUIDE.md`
   - Tests real webhook flow with local server

2. **Database Validation:**
   - See `scripts/validate-subscription-schema.sql`
   - Validates database schema

3. **Environment Validation:**
   - See `scripts/validate-stripe-env.ts`
   - Validates environment configuration

---

## Troubleshooting

### Tests Not Running

**Error:** `Cannot find module 'jest'`

**Fix:** Install dependencies
```bash
cd apps/league-builder
pnpm install
```

### TypeScript Errors in Tests

**Error:** `Cannot find name 'describe'` or similar

**Fix:** Ensure `@types/jest` is installed
```bash
pnpm add -D @types/jest
```

### Mock Not Working

**Error:** `TypeError: Cannot read property 'from' of undefined`

**Fix:** Ensure mock is defined before import
```typescript
jest.mock('@supabase/supabase-js');
import { myFunction } from '../myModule';
```

---

## Next Steps

### Short Term

1. **Add Supabase Client Mocking**
   - Create mock factory for Supabase client
   - Enable webhook handler tests to run

2. **Add Stripe SDK Mocking**
   - Mock Stripe webhook signature verification
   - Mock event retrieval

3. **Increase Coverage**
   - Add edge case tests
   - Test error paths
   - Aim for 85%+ coverage

### Long Term

1. **Add Integration Tests**
   - Test with real Supabase test database
   - Test with Stripe test mode

2. **Add E2E Tests**
   - Use Playwright to test subscription flow
   - Test checkout → webhook → database update

3. **Add Performance Tests**
   - Test webhook processing speed
   - Test concurrent webhook handling

---

## Contributing

When adding new Stripe features:

1. Write tests FIRST (TDD approach)
2. Ensure tests pass before committing
3. Maintain >85% code coverage
4. Update this README with new test cases

---

**Last Updated:** 2026-02-11
