# E2E Test Suites Documentation

This document provides an overview of all E2E test suites for the HockeyLifeHL platform.

## Test Suites Overview

### 1. Captain Workflows (`captain.spec.ts`)

Tests for team captain functionality including roster management and game stats verification.

**Test Categories:**
- **Team Dashboard Access**
  - Captain can access their team dashboard
  - Captain cannot access other teams
  - Non-captain cannot access captain features

- **Join Request Management**
  - Captain can view join requests
  - Captain can approve join requests
  - Captain can deny join requests

- **Roster Management**
  - Captain can view team roster
  - Captain can add players to roster
  - Captain can remove players from roster
  - Captain cannot remove themselves

- **Game Stats Verification**
  - Captain can view games requiring verification
  - Captain can verify game stats with valid token
  - Captain cannot verify with invalid token
  - Captain can view stats before verification
  - Captain cannot verify stats twice

- **Captain Permissions**
  - Captain can edit team details
  - Captain cannot delete team
  - Captain can view team statistics

**Key Features Tested:**
- Role-based access control
- Roster management workflows
- Verification token system
- Data isolation between teams

**Success Criteria:**
- All access control tests pass
- Verification flow works end-to-end
- Error handling is robust

---

### 2. Scorekeeper Assignment (`scorekeeper-admin.spec.ts`)

Tests for league owners assigning scorekeepers to games and scorekeeper access flow.

**Test Categories:**
- **Assigning Scorekeeper**
  - League owner can access game management
  - Owner can assign scorekeeper to game
  - Token is generated and displayed
  - Email notification is sent
  - Cannot assign scorekeeper twice to same game
  - Can reassign to different person

- **Scorekeeper Token Access**
  - Scorekeeper can access token entry page
  - Valid token grants access to game
  - Invalid token shows error
  - Expired token shows error
  - Token is case-insensitive
  - Token whitespace is trimmed

- **Scorekeeper Game Interface**
  - Scorekeeper can view game details
  - Scorekeeper can record goals
  - Scorekeeper can record penalties
  - Scorekeeper can undo events
  - Scorekeeper can submit for verification

- **Scorekeeper Permissions**
  - Scorekeeper cannot access league admin features
  - Scorekeeper cannot modify after verification
  - Session is isolated to single game

- **Token Management**
  - Owner can view active tokens
  - Owner can revoke tokens
  - Owner can regenerate tokens
  - Tokens expire after 24 hours

**Key Features Tested:**
- Token generation and validation
- Session management
- Event recording system
- Email notifications
- Access control

**Success Criteria:**
- Token system is secure
- Event recording is reliable
- Email notifications are sent
- Access is properly restricted

---

### 3. Subscription Management (`subscription.spec.ts`)

Tests for organization subscription management including viewing, upgrading, and cancellation.

**Test Categories:**
- **View Current Subscription**
  - Owner can view subscription page
  - Displays current plan details
  - Displays plan features
  - Non-owner cannot access

- **Plan Selection**
  - Displays available plans
  - Can select plan to upgrade
  - Shows correct pricing
  - Highlights current plan

- **Stripe Checkout Integration**
  - Redirects to Stripe Checkout
  - Checkout contains correct details
  - Successful payment upgrades subscription
  - Failed payment shows error
  - Cancelled checkout returns to app

- **Subscription Downgrade**
  - Owner can downgrade to lower tier
  - Shows feature comparison
  - Takes effect at end of billing period

- **Subscription Cancellation**
  - Owner can cancel subscription
  - Shows confirmation dialog
  - Requires confirmation
  - Retains access until period end
  - Can reactivate cancelled subscription

- **Billing History**
  - Owner can view billing history
  - Shows past invoices
  - Can download invoice PDF
  - Shows payment method
  - Can update payment method

- **Usage Limits**
  - Shows current usage vs limits
  - Warns when approaching limits
  - Blocks actions when limit exceeded
  - Removes limits after upgrading

**Key Features Tested:**
- Stripe integration
- Plan comparison and selection
- Billing history
- Usage tracking
- Cancellation flow

**Success Criteria:**
- Stripe Checkout flow works
- Payment processing is reliable
- Billing history is accurate
- Usage limits are enforced

---

### 4. Player Fee Collection (`player-payments.spec.ts`)

Tests for configuring season fees and processing player registration payments.

**Test Categories:**
- **Fee Configuration**
  - Owner can access fee settings
  - Owner can configure registration fee
  - Can set multiple payment tiers
  - Can configure payment plans
  - Can set refund policy
  - Validates fee amounts and dates

- **Player Registration Flow**
  - Player can view registration page
  - Displays fee breakdown
  - Player can select payment plan
  - Applies early bird discount
  - Shows late fee if applicable
  - Validates player information

- **Payment Processing**
  - Redirects to Stripe payment
  - Shows correct amount
  - Successful payment completes registration
  - Failed payment shows error
  - Can retry failed payment
  - Handles 3D Secure authentication
  - Processes in correct currency

- **Payment Confirmation**
  - Shows confirmation page
  - Sends confirmation email
  - Marks registration as paid
  - Generates receipt

- **League Owner Dashboard**
  - Owner can view all payments
  - Displays payment statistics
  - Can filter by status
  - Can search for payments
  - Can export payment report
  - Shows pending reminders

- **Refund Processing**
  - Owner can issue full refund
  - Owner can issue partial refund
  - Requires confirmation
  - Updates registration status
  - Sends refund confirmation

- **Payment Plans**
  - Player can select installment plan
  - Processes first installment
  - Automatically charges future installments
  - Handles failed installments
  - Allows early payoff

- **Stripe Connect Integration**
  - Payments go to league owner account
  - Handles leagues without Stripe Connect
  - Verifies account before enabling fees

**Key Features Tested:**
- Fee configuration
- Stripe payment processing
- Payment plans and installments
- Refund processing
- Stripe Connect integration

**Success Criteria:**
- Payment flow is smooth
- Fees are processed correctly
- Refunds work properly
- Stripe Connect integration works

---

### 5. Schedule Generation (`schedule-generation.spec.ts`)

Tests for automated schedule generation wizard and schedule management.

**Test Categories:**
- **Access Schedule Wizard**
  - Owner can access from season page
  - Non-owner cannot access
  - Displays for seasons without schedule

- **Schedule Configuration**
  - Can configure basic settings
  - Validates start/end dates
  - Validates games per team
  - Can select preferred days
  - Can set preferred time

- **Advanced Options**
  - Can enable avoid back-to-back games
  - Can enable balance home/away
  - Can set minimum rest days

- **Schedule Generation**
  - Generates schedule successfully
  - Shows generation progress
  - Displays schedule preview
  - Validates sufficient teams
  - Validates date range

- **Schedule Preview**
  - Shows all generated games
  - Groups games by date
  - Highlights conflicts
  - Can regenerate if not satisfied
  - Can edit parameters

- **Saving Schedule**
  - Can save generated schedule
  - Shows confirmation
  - Appears on season page
  - Can navigate back without saving

- **Concurrent Generation**
  - Prevents concurrent generation for same season
  - Allows generation for different seasons

- **Schedule Conflicts**
  - Detects team playing twice same day
  - Detects venue double-booking
  - Respects team availability

- **Schedule Export**
  - Can export as PDF
  - Can export as CSV
  - Can export to calendar (iCal)

**Key Features Tested:**
- Schedule generation algorithms
- Conflict detection
- Preview and editing
- Concurrent access control
- Export functionality

**Success Criteria:**
- Schedules generate successfully
- Conflicts are detected
- Preview is accurate
- Export works properly

---

## Running the Tests

### Run All Test Suites
```bash
cd e2e
pnpm test
```

### Run Specific Suite
```bash
pnpm test captain.spec.ts
pnpm test scorekeeper-admin.spec.ts
pnpm test subscription.spec.ts
pnpm test player-payments.spec.ts
pnpm test schedule-generation.spec.ts
```

### Run in Specific Browser
```bash
pnpm test --project=chromium
pnpm test --project=firefox
pnpm test --project=webkit
```

### Run in Debug Mode
```bash
pnpm test --debug
```

### Generate HTML Report
```bash
pnpm test --reporter=html
```

---

## Test Data Management

### Seeding Test Data

All test suites use the `TestDataSeeder` class to create test data:

```typescript
const seeder = new TestDataSeeder();
const testEnv = await seeder.seedCompleteEnvironment();
```

This creates:
- Test user
- Organization
- League
- Season
- Teams

### Cleanup

Tests automatically clean up after themselves:

```typescript
test.afterAll(async () => {
  if (testEnv?.user?.id) {
    await seeder.cleanup(testEnv.user.id);
  }
});
```

### Additional Test Data Helpers

- `createGame()` - Create a game between teams
- `assignScorekeeper()` - Assign scorekeeper with token
- `setTeamCaptain()` - Set captain for team
- `addPlayerToRoster()` - Add player to team
- `createJoinRequest()` - Create pending join request
- `configureSeasonFees()` - Configure registration fees
- `createPaymentRecord()` - Create test payment

---

## Test Status

### Fully Implemented Tests
- Authentication flows
- League creation wizard
- Basic payment flows

### Partially Implemented Tests (Skipped)
Most tests in the new suites are marked as `test.skip()` because they require:
- Complete implementation of features
- Test environment configuration
- Mock Stripe integration
- Email testing infrastructure

### Running Skipped Tests

To run skipped tests individually:

```bash
pnpm test captain.spec.ts --grep "captain can access their team dashboard"
```

Or remove `test.skip()` and run:

```bash
pnpm test captain.spec.ts
```

---

## Environment Setup

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test Users
E2E_TEST_USER_EMAIL=test@example.com
E2E_TEST_USER_PASSWORD=password

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# App URL
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

---

## CI/CD Integration

Tests are configured to run in GitHub Actions:

```yaml
- name: Run E2E Tests
  run: |
    cd e2e
    pnpm install
    pnpm test
```

### Test Reports

- HTML report: `e2e/playwright-report/index.html`
- JSON results: `e2e/test-results/results.json`
- Screenshots: `e2e/test-results/*/test-failed-*.png`
- Videos: `e2e/test-results/*/video.webm`

---

## Best Practices

### Writing New Tests

1. Use Page Object Model pattern
2. Create page objects in `e2e/pages/`
3. Use test data helpers from fixtures
4. Clean up after tests
5. Use appropriate timeouts
6. Add meaningful assertions
7. Handle errors gracefully

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent
- Avoid hard-coded waits (use `waitFor`)

### Debugging Tests

```bash
# Run with headed browser
pnpm test --headed

# Run with debug mode
pnpm test --debug

# Run specific test
pnpm test captain.spec.ts:25

# Run with trace
pnpm test --trace on
```

---

## Future Improvements

### Short Term
1. Complete implementation of skipped tests
2. Add Stripe test mode helpers
3. Add email testing infrastructure
4. Improve test data seeding
5. Add visual regression tests

### Long Term
1. Add performance tests
2. Add accessibility tests
3. Add mobile-specific tests
4. Add API integration tests
5. Add load testing

---

## Support

For questions or issues with tests:
- Check existing tests for examples
- Review Page Object Models in `e2e/pages/`
- Check test fixtures in `e2e/fixtures/`
- Consult Playwright documentation
- Review CI/CD logs for failures

---

## Test Coverage Summary

| Feature | Test Suite | Status | Coverage |
|---------|-----------|--------|----------|
| Captain Workflows | `captain.spec.ts` | Partial | 40% |
| Scorekeeper Assignment | `scorekeeper-admin.spec.ts` | Partial | 30% |
| Subscription Management | `subscription.spec.ts` | Partial | 50% |
| Player Payments | `player-payments.spec.ts` | Partial | 35% |
| Schedule Generation | `schedule-generation.spec.ts` | Partial | 25% |

**Overall E2E Coverage: ~36%**

Coverage will increase as features are fully implemented and skipped tests are enabled.
