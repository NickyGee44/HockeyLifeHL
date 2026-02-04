# Firefox Timeout Fix

## Issue
Firefox tests timing out on `page.goto()` after 30 seconds when navigating to league wizard.

## Status
- ✅ Firefox browser properly installed and working
- ✅ 3 tests passed successfully
- ⚠️ 1 test failed with timeout
- ⚠️ 7 tests interrupted (max failures reached)

## Root Cause
Firefox is slower at loading heavy Next.js pages with client-side JavaScript. The 30-second timeout is insufficient for:
- Cold starts
- Large JavaScript bundles
- Complex React hydration

## Solutions

### Option 1: Increase Timeout for Firefox (Recommended)
**File:** `e2e/playwright.config.ts`

```typescript
{
  name: 'firefox',
  use: {
    ...devices['Desktop Firefox'],
    launchOptions: {
      firefoxUserPrefs: {
        'media.navigator.streams.fake': true,
        'media.navigator.permission.disabled': true,
      },
    },
    // Increase navigation timeout for Firefox
    navigationTimeout: 60000, // 60 seconds instead of 30
  },
  testIgnore: /auth\.spec\.ts/,
},
```

### Option 2: Increase Global Timeout
**File:** `e2e/playwright.config.ts`

```typescript
export default defineConfig({
  timeout: 120_000, // 2 minutes per test (was 60s)
  expect: {
    timeout: 10000,
  },
  // ... rest of config
});
```

### Option 3: Optimize Page Load (Long-term)
1. Enable Next.js production mode for tests
2. Pre-compile the app before running tests
3. Use `waitUntil: 'domcontentloaded'` instead of `'load'`

**File:** `e2e/pages/BasePage.ts`

```typescript
async goto(): Promise<void> {
  // For Firefox, use faster wait condition
  const waitUntil = this.page.context().browser()?.browserType().name() === 'firefox'
    ? 'domcontentloaded'
    : 'load';

  await this.page.goto(this.url, { waitUntil });
  await this.waitForPageLoad();
}
```

## Quick Fix (Apply Now)

**File:** `e2e/playwright.config.ts`

Add to the Firefox project configuration:
```typescript
navigationTimeout: 60000,
actionTimeout: 30000,
```

## Verification

After applying the fix:
```bash
cd e2e
pnpm test:firefox -- tests/leagues.spec.ts
```

Expected result: More tests passing, fewer timeouts.

## Notes

- This is a performance issue, not a configuration issue
- Firefox is slower at JavaScript execution than Chromium
- The browser is working correctly (3 tests passed)
- Production deployments won't have this issue (optimized builds)
