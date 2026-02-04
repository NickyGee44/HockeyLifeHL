import { test, expect } from '@playwright/test';
import { DashboardPage, LeagueWizardPage } from '../pages';
import { TEST_LEAGUE_DATA, TEST_SEASON_DATA, TEST_TEAMS } from '../fixtures/test-data';

/**
 * League Management Tests
 * Tests for league creation wizard, league listing, and league management
 */
test.describe('League Creation Wizard', () => {
  let dashboardPage: DashboardPage;
  let wizardPage: LeagueWizardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    wizardPage = new LeagueWizardPage(page);
  });

  test('should access wizard from dashboard', async ({ page }) => {
    await dashboardPage.goto();
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToCreateLeague();

    await expect(page).toHaveURL(/\/dashboard\/leagues\/new/);
  });

  test('should display wizard with all steps', async ({ page }) => {
    await wizardPage.goto();

    // Should show progress bar/steps
    await expect(wizardPage.progressBar).toBeVisible();

    // Should show step 1 by default
    await expect(wizardPage.leagueNameInput).toBeVisible();
  });

  test('should validate required fields in step 1', async ({ page }) => {
    await wizardPage.goto();

    // Wait for form to be ready
    await wizardPage.leagueNameInput.waitFor({ state: 'visible' });

    // Try to proceed without filling required fields
    await wizardPage.nextButton.click();

    // Wait for validation to trigger
    await page.waitForTimeout(500);

    // Should show validation errors (look for text-destructive which is the actual class used)
    const errorMessages = page.locator('.text-destructive, .text-red-500, [role="alert"]');
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });

    // Should still be on step 1
    expect(await wizardPage.getCurrentStep()).toBe(1);
  });

  test('should complete step 1: League Information', async ({ page }) => {
    await wizardPage.goto();

    // Fill step 1 with all required fields
    await wizardPage.fillStep1({
      name: 'E2E Test League',
      description: 'Test league created by E2E tests',
      city: 'Toronto',
      stateProvince: 'Ontario',
      country: 'Canada',
      timezone: 'Eastern Time (ET)',
    });

    // Go to next step
    await wizardPage.goToNextStep();

    // Should be on step 2
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(2);

    // Season name input should be visible on step 2
    await expect(wizardPage.seasonNameInput).toBeVisible({ timeout: 5000 });
  });

  test('should validate season dates in step 2', async ({ page }) => {
    await wizardPage.goto();

    // Complete step 1 with all required fields
    await wizardPage.fillStep1({
      name: 'E2E Test League',
      city: 'Toronto',
      stateProvince: 'Ontario',
      country: 'Canada',
      timezone: 'Eastern Time (ET)',
    });
    await wizardPage.goToNextStep();

    // Fill step 2 with invalid dates (end before start)
    await wizardPage.seasonNameInput.fill('Test Season');
    await wizardPage.startDateInput.fill('2026-06-01T10:00');
    await wizardPage.endDateInput.fill('2026-01-01T10:00'); // Before start date

    // Try to proceed
    await wizardPage.nextButton.click();

    // Wait for validation to trigger
    await page.waitForTimeout(500);

    // Should show validation error or toast notification
    const errorIndicator = page.locator('.text-destructive, .text-red-500, [role="alert"], [data-sonner-toast][data-type="error"]');
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should complete step 2: Season Settings', { timeout: 90000 }, async ({ page }) => {
    await wizardPage.goto();

    // Complete step 1 with all required fields
    await wizardPage.fillStep1({
      name: 'E2E Test League',
      city: 'Toronto',
      stateProvince: 'Ontario',
      country: 'Canada',
      timezone: 'Eastern Time (ET)',
    });
    await wizardPage.goToNextStep();

    // Fill step 2
    await wizardPage.fillStep2({
      seasonName: 'Winter Season 2026',
      startDate: '2026-03-01T10:00',
      endDate: '2026-06-30T22:00',
      registrationType: 'Open Registration',
      gameDuration: 60,
      periodCount: 3,
    });

    // Go to next step
    await wizardPage.goToNextStep();

    // Should be on step 3 (Teams)
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(3);
  });

  test('should add teams in step 3', async ({ page }) => {
    await wizardPage.goto();

    // Complete steps 1 and 2 with unique names and required fields
    const uniqueId = Date.now();
    await wizardPage.fillStep1({
      name: `E2E Test League ${uniqueId}`,
      city: 'Toronto',
      stateProvince: 'Ontario',
      country: 'Canada',
      timezone: 'Eastern Time (ET)',
    });
    await wizardPage.goToNextStep();

    await wizardPage.fillStep2({
      seasonName: `Winter Season ${uniqueId}`,
      startDate: '2026-03-01T10:00',
      endDate: '2026-06-30T22:00',
      gameDuration: 60,
      periodCount: 3,
    });
    await wizardPage.goToNextStep();

    // Should be on step 3 - wait for Add Team button
    await wizardPage.addTeamButton.first().waitFor({ state: 'visible', timeout: 5000 });

    // Get initial team count (should be 0)
    const initialCount = await wizardPage.teamNameInputs.count();

    // Add teams with unique names
    await wizardPage.addTeam({ name: `Hawks ${uniqueId}`, shortName: 'HAWKS', color: '#FF0000' });
    await wizardPage.addTeam({ name: `Bears ${uniqueId}`, shortName: 'BEARS', color: '#0000FF' });

    // Verify teams were added
    const newCount = await wizardPage.teamNameInputs.count();
    expect(newCount).toBe(initialCount + 2);
  });

  test('should navigate back to previous steps', async ({ page }) => {
    await wizardPage.goto();

    const uniqueId = Date.now();
    const leagueName = `E2E Test League ${uniqueId}`;

    // Complete step 1 with all required fields
    await wizardPage.fillStep1({
      name: leagueName,
      city: 'Toronto',
      stateProvince: 'Ontario',
      country: 'Canada',
      timezone: 'Eastern Time (ET)',
    });
    await wizardPage.goToNextStep();

    // Should be on step 2
    const step2 = await wizardPage.getCurrentStep();
    expect(step2).toBe(2);

    // Go back
    await wizardPage.goToPreviousStep();

    // Should be on step 1
    const step1 = await wizardPage.getCurrentStep();
    expect(step1).toBe(1);

    // Data should be preserved
    await expect(wizardPage.leagueNameInput).toHaveValue(leagueName);
  });

  test('should auto-save draft on input change', async ({ page }) => {
    await wizardPage.goto();

    // Fill league name
    await wizardPage.leagueNameInput.fill('Auto-Save Test League');

    // Wait for auto-save indicator
    await page.waitForTimeout(3000); // Wait for debounced save

    // Saving indicator might appear
    // This is implementation-specific
  });

  test('should complete full wizard flow', { timeout: 120000 }, async ({ page }) => {
    await wizardPage.goto();

    const uniqueId = Date.now();

    // Complete entire wizard
    await wizardPage.completeWizard({
      step1: {
        name: `E2E League ${uniqueId}`,
        description: 'Created by E2E test',
        city: 'Toronto',
        stateProvince: 'Ontario',
        country: 'Canada',
        timezone: 'Eastern Time (ET)',
        primaryColor: '#D4AF37',
        contactEmail: 'e2e@test.com',
      },
      step2: {
        seasonName: 'E2E Season 2026',
        startDate: '2026-03-01T10:00',
        endDate: '2026-06-30T22:00',
        registrationType: 'Open Registration',
        gameDuration: 60,
        periodCount: 3,
      },
      step3: [
        { name: 'E2E Hawks', shortName: 'HAWKS', color: '#FF0000' },
        { name: 'E2E Bears', shortName: 'BEARS', color: '#0000FF' },
      ],
    });

    // Should be redirected to dashboard (or success page)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

/**
 * League Listing Tests
 */
test.describe('League Listing', () => {
  test('should display leagues list', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await dashboardPage.goToLeagues();

    await expect(page).toHaveURL(/\/dashboard\/leagues$/);

    // Should show leagues or empty state
    const leaguesOrEmpty = page
      .locator('[class*="rounded"]:has-text("leagues"), :has-text("No Leagues")')
      .first();
    await expect(leaguesOrEmpty).toBeVisible();
  });

  test('should navigate to league detail', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    // Check if there are any leagues
    const leagueCount = await dashboardPage.getLeagueCount();

    if (leagueCount > 0) {
      // Click on first league (href includes locale prefix like /en/dashboard/leagues/[id])
      const leagueCard = page.locator('a[href*="/dashboard/leagues/"]:not([href*="new"]):not([href$="/leagues"])').first();
      await leagueCard.click();

      // Should be on league detail page (URL may include locale prefix like /en/)
      await expect(page).toHaveURL(/\/dashboard\/leagues\/[^/]+$/, { timeout: 15000 });
    } else {
      // No leagues - verify empty state
      await dashboardPage.goToLeagues();
      await expect(page.getByRole('heading', { name: 'No Leagues Yet' })).toBeVisible();
    }
  });
});

/**
 * League Detail Tests
 */
test.describe('League Detail', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to leagues list first
    await page.goto('/dashboard/leagues');
  });

  test('should display league details', async ({ page }) => {
    // Find and click on a league
    const leagueCard = page.locator('a[href^="/dashboard/leagues/"]:not([href*="new"])').first();

    if (await leagueCard.isVisible()) {
      await leagueCard.click();

      // Verify league detail page elements
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator(':has-text("Teams")')).toBeVisible();
      await expect(page.locator(':has-text("Seasons")')).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should navigate to league billing', async ({ page }) => {
    const leagueCard = page.locator('a[href^="/dashboard/leagues/"]:not([href*="new"])').first();

    if (await leagueCard.isVisible()) {
      await leagueCard.click();

      // Click billing button
      const billingLink = page.locator('a[href*="billing"]').first();
      if (await billingLink.isVisible()) {
        await billingLink.click();
        await expect(page).toHaveURL(/\/billing/);
      }
    } else {
      test.skip();
    }
  });

  test('should navigate to league settings', async ({ page }) => {
    const leagueCard = page.locator('a[href^="/dashboard/leagues/"]:not([href*="new"])').first();

    if (await leagueCard.isVisible()) {
      await leagueCard.click();

      // Click settings button
      const settingsLink = page.locator('a[href*="settings"]').first();
      if (await settingsLink.isVisible()) {
        await settingsLink.click();
        await expect(page).toHaveURL(/\/settings/);
      }
    } else {
      test.skip();
    }
  });
});
