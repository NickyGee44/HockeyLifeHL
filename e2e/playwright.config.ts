import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from e2e/.env first, then app's .env.local
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../apps/league-builder/.env.local') });

/**
 * Playwright Configuration for HockeyLifeHL E2E Tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI for stability */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    // Add GitHub Actions reporter in CI
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'on-first-retry',

    /* Viewport size */
    viewport: { width: 1280, height: 720 },

    /* Action timeout */
    actionTimeout: 15000,

    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    /* Setup project for authentication */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated state
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      // Exclude auth tests - they run in unauthenticated project
      testIgnore: /auth\.spec\.ts/,
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
        // Firefox-specific launch options
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
          },
        },
        // Firefox is slower at loading heavy Next.js pages
        navigationTimeout: 60000, // 60 seconds (default is 30s)
        actionTimeout: 30000, // 30 seconds for actions
      },
      dependencies: ['setup'],
      // Exclude auth tests - they run in unauthenticated project
      testIgnore: /auth\.spec\.ts/,
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json',
        // Webkit-specific launch options
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
      dependencies: ['setup'],
      // Exclude auth tests - they run in unauthenticated project
      testIgnore: /auth\.spec\.ts/,
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      // Exclude auth tests - they run in unauthenticated project
      testIgnore: /auth\.spec\.ts/,
    },

    /* Unauthenticated tests (signup, login) */
    {
      name: 'unauthenticated',
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm --filter league-builder dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for dev server startup
    cwd: path.resolve(__dirname, '..'),
  },

  /* Global timeout for each test */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results',

  /* Preserve output on failure */
  preserveOutput: 'failures-only',

  /* Global setup and teardown */
  globalSetup: require.resolve('./utils/global-setup'),
  globalTeardown: require.resolve('./utils/global-teardown'),
});
