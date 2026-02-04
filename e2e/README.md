# HockeyLifeHL E2E Tests

End-to-end tests for the HockeyLifeHL platform using Playwright.

## Setup

### 1. Install Dependencies

```bash
cd e2e
pnpm install
```

### 2. Install Browsers

All three browsers (Chromium, Firefox, and Webkit) are required for cross-browser testing:

```bash
pnpm run install-browsers
```

This will install:
- Chromium (Chrome for Testing)
- Firefox
- Webkit (Safari)

### 3. Verify Browser Installation

To verify all browsers are properly installed and working:

```bash
pnpm run verify-browsers
```

This script will:
- Launch each browser
- Run a simple page load test
- Report which browsers are working correctly
- Exit with error if any browser fails

### 4. Configure Environment

Create a `.env` file in the `e2e` directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# E2E Test User Credentials
E2E_TEST_USER_EMAIL=e2e-test@example.com
E2E_TEST_USER_PASSWORD=your_secure_password

# Playwright Configuration
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Running Tests

### Run All Tests (All Browsers)

```bash
pnpm test
```

### Run Tests by Browser

```bash
pnpm test:chromium    # Chrome only
pnpm test:firefox     # Firefox only
pnpm test:webkit      # Safari/Webkit only
pnpm test:mobile      # Mobile Chrome emulation
```

### Run Specific Test Files

```bash
pnpm test:auth        # Authentication tests
pnpm test:leagues     # League management tests
pnpm test:payments    # Payment flow tests
```

### Interactive Test Running

```bash
pnpm test:ui          # Playwright UI mode
pnpm test:headed      # Run tests in headed mode (visible browser)
pnpm test:debug       # Debug mode with Playwright Inspector
```

### Code Generation

Generate test code by recording actions:

```bash
pnpm run codegen
```

## Test Structure

```
e2e/
├── tests/              # Test files
│   ├── auth.spec.ts
│   ├── auth.setup.ts   # Authentication setup for other tests
│   ├── leagues.spec.ts
│   └── payments.spec.ts
├── pages/              # Page Object Models
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   └── LeagueWizardPage.ts
├── fixtures/           # Test data and fixtures
│   └── test-data.ts
├── utils/              # Utility functions
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   └── verify-browsers.ts
└── playwright.config.ts
```

## Browser-Specific Features

### Firefox Configuration

- Fake media streams enabled for testing
- Navigator permissions disabled for testing
- Auto-save disabled to prevent download dialogs

### Webkit Configuration

- Web security disabled for local testing
- Proper Safari user agent and viewport

### Mobile Chrome

- Pixel 5 emulation
- Touch events enabled
- Mobile viewport and user agent

## Troubleshooting

### Tests Failing Immediately (<100ms)

This indicates browser initialization failure. Run:

```bash
pnpm run verify-browsers
```

If any browser fails:

```bash
pnpm run install-browsers
```

### Authentication Failures

1. Verify `.env` file exists with correct credentials
2. Check that test user exists in Supabase Auth
3. Verify `.auth` directory exists: `mkdir -p .auth`

### Timeout Errors

1. Ensure dev server is running: `pnpm --filter league-builder dev`
2. Check `PLAYWRIGHT_BASE_URL` in `.env`
3. Increase timeouts in `playwright.config.ts` if needed

### Global Setup Errors

The global setup:
1. Verifies all browsers can launch
2. Checks Supabase connection
3. Creates `.auth` directory

If global setup fails, tests will not run.

## CI/CD

In CI environments:
- Tests run in parallel with 1 worker
- Retries are enabled (2 retries)
- GitHub Actions reporter is enabled
- Cleanup runs after tests

Set `CI=true` to enable CI mode.

## Debugging

### View Test Report

After test runs:

```bash
pnpm run report
```

### Test Artifacts

On failure, Playwright saves:
- Screenshots (`test-results/`)
- Videos (`test-results/`)
- Traces (`test-results/`)

### Debug Specific Test

```bash
pnpm test:debug tests/leagues.spec.ts
```

## Best Practices

1. **Use Page Object Models**: Keep selectors and actions in page objects
2. **Independent Tests**: Each test should be runnable independently
3. **Test Data**: Use unique IDs/timestamps to avoid conflicts
4. **Authentication**: Use `auth.setup.ts` to avoid repeated logins
5. **Cross-Browser**: Test critical flows in all browsers
6. **Assertions**: Use Playwright's auto-waiting assertions
7. **Cleanup**: Use global teardown or per-test cleanup

## Browser Versions

Current Playwright versions:
- Chromium: Chrome for Testing 145.x
- Firefox: 146.x
- Webkit: 26.x

Update browsers:

```bash
pnpm add -D @playwright/test@latest
pnpm run install-browsers
```
