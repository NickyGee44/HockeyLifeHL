import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages';
import { TEST_USERS } from '../fixtures/test-data';

const authFile = 'e2e/.auth/user.json';

/**
 * Authentication Setup
 * Logs in a test user and saves the authenticated state for other tests
 */
setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Navigate to login
  await loginPage.goto();

  // Use existing test user credentials (should be seeded in test environment)
  const testUser = {
    email: process.env.E2E_TEST_USER_EMAIL || TEST_USERS.organizer.email,
    password: process.env.E2E_TEST_USER_PASSWORD || TEST_USERS.organizer.password,
  };

  // Perform login
  await loginPage.login(testUser.email, testUser.password);

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });

  // Verify we're logged in
  await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });

  console.log('✅ Authentication setup complete');
});
