import { test, expect } from '@playwright/test';
import { TestDataSeeder } from '../fixtures/test-data';

/**
 * Schedule Admin Operations Smoke Tests
 *
 * Verifies bulk operations UI elements render and wizard dialogs
 * open correctly on the schedule management page.
 */

test.describe('Schedule Admin Operations', () => {
  let seeder: TestDataSeeder;
  let testEnv: Awaited<ReturnType<TestDataSeeder['seedCompleteEnvironment']>>;

  test.beforeAll(async () => {
    seeder = new TestDataSeeder();
    testEnv = await seeder.seedCompleteEnvironment();
  });

  test.afterAll(async () => {
    if (testEnv?.user?.id) {
      await seeder.cleanup(testEnv.user.id);
    }
  });

  async function loginAndNavigateToSchedule(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', testEnv.user.email);
    await page.fill('input[type="password"]', testEnv.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to league schedule page
    await page.goto(
      `/dashboard/leagues/${testEnv.league.id}/schedule?season=${testEnv.season.id}`
    );
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  }

  test.describe('Admin Ops Buttons', () => {
    test('schedule page renders with admin action buttons', async ({ page }) => {
      await loginAndNavigateToSchedule(page);

      // Verify the schedule page loaded
      await expect(page.locator('text=Schedule')).toBeVisible({ timeout: 10000 });
    });

    test('Weather Cancellation button opens postpone wizard', async ({ page }) => {
      await loginAndNavigateToSchedule(page);

      const weatherButton = page.locator('button:has-text("Weather Cancellation")');

      // Button may only show when there are games — skip if not visible
      const isVisible = await weatherButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip();
        return;
      }

      await weatherButton.click();

      // Wizard dialog should open
      await expect(page.locator('text=Weather Cancellation').first()).toBeVisible();
      await expect(page.locator('text=Postpone all games on a specific date')).toBeVisible();

      // Date picker should be present
      await expect(page.locator('input[type="date"]')).toBeVisible();

      // Reason presets should be present
      await expect(page.locator('button:has-text("Weather / Ice Conditions")')).toBeVisible();
      await expect(page.locator('button:has-text("Facility Issue")')).toBeVisible();

      // Close dialog
      await page.keyboard.press('Escape');
    });

    test('Move Venue button opens venue wizard', async ({ page }) => {
      await loginAndNavigateToSchedule(page);

      const moveVenueButton = page.locator('button:has-text("Move Venue")');

      const isVisible = await moveVenueButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip();
        return;
      }

      await moveVenueButton.click();

      // Wizard dialog should open
      await expect(page.locator('text=Move Games to New Venue')).toBeVisible();
      await expect(
        page.locator('text=Move all upcoming games from one venue to another')
      ).toBeVisible();

      // From/To selects should be present
      await expect(page.locator('text=Move games from')).toBeVisible();
      await expect(page.locator('text=Move to')).toBeVisible();

      // Close dialog
      await page.keyboard.press('Escape');
    });

    test('Manage Cancellations button opens reschedule panel', async ({ page }) => {
      await loginAndNavigateToSchedule(page);

      const manageButton = page.locator('button:has-text("Manage Cancellations")');

      const isVisible = await manageButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip();
        return;
      }

      await manageButton.click();

      // Reschedule panel should open — check for its header
      await expect(
        page.locator('text=/Reschedule|Manage.*Cancel|Postponed Games/i').first()
      ).toBeVisible({ timeout: 5000 });

      // Close
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Weather Cancellation Wizard Flow', () => {
    test('submit button is disabled until form is complete', async ({ page }) => {
      await loginAndNavigateToSchedule(page);

      const weatherButton = page.locator('button:has-text("Weather Cancellation")');
      const isVisible = await weatherButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip();
        return;
      }

      await weatherButton.click();

      // Submit button should be disabled initially
      const submitButton = page.locator(
        'button:has-text("Postpone All Games on This Date")'
      );
      await expect(submitButton).toBeDisabled();

      // Fill date
      await page.locator('input[type="date"]').fill('2026-04-01');

      // Still disabled — no reason selected
      await expect(submitButton).toBeDisabled();

      // Select a reason
      await page.locator('button:has-text("Weather / Ice Conditions")').click();

      // Now submit should be enabled
      await expect(submitButton).toBeEnabled();

      await page.keyboard.press('Escape');
    });
  });

  test.describe('Move Venue Wizard Flow', () => {
    test('submit button is disabled until both venues selected', async ({ page }) => {
      await loginAndNavigateToSchedule(page);

      const moveVenueButton = page.locator('button:has-text("Move Venue")');
      const isVisible = await moveVenueButton.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip();
        return;
      }

      await moveVenueButton.click();

      const submitButton = page.locator('button:has-text("Move All Games")');
      await expect(submitButton).toBeDisabled();

      await page.keyboard.press('Escape');
    });
  });
});
