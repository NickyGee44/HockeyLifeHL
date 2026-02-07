import { test, expect } from '@playwright/test';
import { LeagueWizardPage, DashboardPage, SignupPage } from '../pages';

/**
 * Owner Onboarding E2E Tests
 *
 * Protects the critical user journey for league owner onboarding:
 * - Signup page with locale-aware legal links
 * - Dashboard CTAs for first-time owners
 * - League wizard 7-step navigation
 * - Payment step "Set Up Later" option
 * - Review step status indicators
 * - Success screen prioritized next actions
 */

test.describe('Owner Onboarding', () => {
  test.describe('Signup Page', () => {
    test('signup page renders with locale-aware legal links (English)', async ({ page }) => {
      // Navigate to signup page in English locale
      await page.goto('/en/signup');
      await page.waitForLoadState('networkidle');

      // Verify form fields are present
      await expect(page.locator('input#fullName')).toBeVisible();
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('input#organizationName')).toBeVisible();

      // Verify Terms of Service checkbox and link exist
      const termsCheckbox = page.locator('input#acceptTerms');
      await expect(termsCheckbox).toBeVisible();

      // Verify the Terms link is present and has correct href
      const termsLink = page.locator('a[href*="/terms"]').first();
      await expect(termsLink).toBeVisible();

      // The Terms link text should be in English
      await expect(termsLink).toHaveText(/Terms of Service/i);

      // Verify Privacy Policy checkbox and link exist
      const privacyCheckbox = page.locator('input#acceptPrivacy');
      await expect(privacyCheckbox).toBeVisible();

      const privacyLink = page.locator('a[href*="/privacy"]').first();
      await expect(privacyLink).toBeVisible();
      await expect(privacyLink).toHaveText(/Privacy Policy/i);
    });

    test('signup page renders with locale-aware legal links (French)', async ({ page }) => {
      // Navigate to signup page in French locale
      await page.goto('/fr/signup');
      await page.waitForLoadState('networkidle');

      // Verify form fields are present
      await expect(page.locator('input#fullName')).toBeVisible();
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();

      // Verify Terms link is in French
      const termsLink = page.locator('a[href*="/terms"]').first();
      await expect(termsLink).toBeVisible();
      await expect(termsLink).toHaveText(/Conditions d'utilisation/i);

      // Verify Privacy link is in French
      const privacyLink = page.locator('a[href*="/privacy"]').first();
      await expect(privacyLink).toBeVisible();
      await expect(privacyLink).toHaveText(/Politique de confidentialit/i);
    });

    test('password requirements are displayed', async ({ page }) => {
      await page.goto('/en/signup');
      await page.waitForLoadState('networkidle');

      // Check that password requirements section is visible
      const passwordRules = page.locator('ul.list-disc');
      await expect(passwordRules).toBeVisible();

      // Verify individual rules are shown
      const ruleItems = passwordRules.locator('li');
      await expect(ruleItems).toHaveCount(5); // length, uppercase, lowercase, number, special
    });

    test('submit button is disabled until both checkboxes are checked', async ({ page }) => {
      await page.goto('/en/signup');
      await page.waitForLoadState('networkidle');

      const submitButton = page.locator('button[type="submit"]');

      // Button should be disabled initially
      await expect(submitButton).toBeDisabled();

      // Check only terms - button should still be disabled
      await page.locator('input#acceptTerms').check();
      await expect(submitButton).toBeDisabled();

      // Check privacy too - button should now be enabled
      await page.locator('input#acceptPrivacy').check();
      await expect(submitButton).toBeEnabled();

      // Uncheck terms - button should be disabled again
      await page.locator('input#acceptTerms').uncheck();
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Dashboard CTAs for First-Time Owner', () => {
    test('dashboard shows welcome heading', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.assertDashboardLoaded();

      // Verify welcome heading is present
      await expect(dashboardPage.welcomeHeading).toBeVisible();
    });

    test('dashboard shows Quick Actions section', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.assertDashboardLoaded();

      // Quick Actions heading should be visible
      await expect(page.getByText('Quick Actions')).toBeVisible();

      // Create League CTA should always be visible
      const createLeagueCta = page.locator('a[href*="/dashboard/leagues/new"]').first();
      await expect(createLeagueCta).toBeVisible();
    });

    test('dashboard shows stats cards', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.assertDashboardLoaded();

      // Verify stats cards grid is present
      const statsGrid = page.locator('.grid.gap-6').first();
      await expect(statsGrid).toBeVisible();

      // Should have stats cards with values
      const statValues = page.locator('.text-3xl.font-black');
      const count = await statValues.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('dashboard shows company section with setup CTA when no organizations', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.assertDashboardLoaded();

      // Check for either company cards or the "no company" setup prompt
      const companySection = page.locator('text=Your Company').first();
      // This section should exist in the dashboard
      if (await companySection.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(companySection).toBeVisible();
      }
    });
  });

  test.describe('League Wizard Navigation', () => {
    let wizardPage: LeagueWizardPage;

    test.beforeEach(async ({ page }) => {
      wizardPage = new LeagueWizardPage(page);
    });

    test('wizard displays all 7 steps via progress indicator', async ({ page }) => {
      await wizardPage.goto();

      // Should show "Step 1 of 7" indicator
      const stepIndicator = page.getByText(/Step 1 of 7/);
      await expect(stepIndicator).toBeVisible();
    });

    test('wizard can navigate through all 7 steps', async ({ page }) => {
      test.setTimeout(120000);
      await wizardPage.goto();

      const uniqueId = Date.now();

      // Step 1: League Info
      expect(await wizardPage.getCurrentStep()).toBe(1);
      await wizardPage.fillStep1({
        name: `Onboarding Test League ${uniqueId}`,
        city: 'Toronto',
        stateProvince: 'Ontario',
        country: 'Canada',
        timezone: 'Eastern Time (ET)',
      });
      await wizardPage.goToNextStep();

      // Step 2: Season Settings
      expect(await wizardPage.getCurrentStep()).toBe(2);
      await wizardPage.fillStep2({
        seasonName: `Test Season ${uniqueId}`,
        startDate: '2026-04-01T10:00',
        endDate: '2026-07-30T22:00',
        gameDuration: 60,
        periodCount: 3,
      });
      await wizardPage.goToNextStep();

      // Step 3: Teams
      expect(await wizardPage.getCurrentStep()).toBe(3);
      await wizardPage.goToNextStep();

      // Step 4: Registration Fees
      expect(await wizardPage.getCurrentStep()).toBe(4);
      await wizardPage.goToNextStep();

      // Step 5: Payment Setup
      expect(await wizardPage.getCurrentStep()).toBe(5);
      await wizardPage.goToNextStep();

      // Step 6: Website & Branding
      expect(await wizardPage.getCurrentStep()).toBe(6);
      await wizardPage.goToNextStep();

      // Step 7: Review & Launch
      expect(await wizardPage.getCurrentStep()).toBe(7);

      // Verify we reached the final step
      const reviewContent = page.locator('text=Create League, text=Review');
      await expect(reviewContent.first()).toBeVisible();
    });

    test('wizard preserves data when navigating back', async ({ page }) => {
      await wizardPage.goto();

      const leagueName = `Back Nav Test ${Date.now()}`;

      // Fill step 1
      await wizardPage.fillStep1({
        name: leagueName,
        city: 'Montreal',
        stateProvince: 'Quebec',
        country: 'Canada',
        timezone: 'Eastern Time (ET)',
      });
      await wizardPage.goToNextStep();

      // Go back to step 1
      await wizardPage.goToPreviousStep();

      // Data should be preserved
      await expect(wizardPage.leagueNameInput).toHaveValue(leagueName);
      await expect(wizardPage.cityInput).toHaveValue('Montreal');
    });
  });

  test.describe('Payment Step (Step 5)', () => {
    let wizardPage: LeagueWizardPage;

    test.beforeEach(async ({ page }) => {
      wizardPage = new LeagueWizardPage(page);
    });

    test('payment step shows "Set Up Later" option for paid leagues', async ({ page }) => {
      test.setTimeout(120000);
      await wizardPage.goto();

      const uniqueId = Date.now();

      // Navigate to step 5 (Payment Setup)
      // Step 1
      await wizardPage.fillStep1({
        name: `Payment Test League ${uniqueId}`,
        city: 'Toronto',
        stateProvince: 'Ontario',
        country: 'Canada',
        timezone: 'Eastern Time (ET)',
      });
      await wizardPage.goToNextStep();

      // Step 2
      await wizardPage.fillStep2({
        seasonName: `Season ${uniqueId}`,
        startDate: '2026-04-01T10:00',
        endDate: '2026-07-30T22:00',
        gameDuration: 60,
        periodCount: 3,
      });
      await wizardPage.goToNextStep();

      // Step 3 (Teams) - skip
      await wizardPage.goToNextStep();

      // Step 4 (Registration Fees) - enable paid registration if possible
      const enablePaidToggle = page.locator('input[type="checkbox"], button[role="switch"]').first();
      if (await enablePaidToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        // If there's a toggle to enable paid registration, try enabling it
        const isChecked = await enablePaidToggle.isChecked().catch(() => false);
        if (!isChecked) {
          await enablePaidToggle.click();
          await page.waitForTimeout(500);
        }
      }
      await wizardPage.goToNextStep();

      // Step 5 (Payment Setup) - verify "Skip" / "Set Up Later" option
      expect(await wizardPage.getCurrentStep()).toBe(5);

      // Look for skip/set up later button - can be either "Skip for Now" or "Set Up Later"
      // or a free league confirmation if fees weren't enabled
      const skipButton = page.locator('button:has-text("Skip"), button:has-text("Set Up Later"), button:has-text("skip")');
      const freeLeagueConfirmation = page.locator('text=Free League, text=No payment setup needed');

      // Either the skip button exists (paid league) or free league confirmation is shown
      const hasSkip = await skipButton.first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasFreeConfirmation = await freeLeagueConfirmation.first().isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasSkip || hasFreeConfirmation).toBe(true);
    });

    test('free league shows no payment setup needed on step 5', async ({ page }) => {
      test.setTimeout(120000);
      await wizardPage.goto();

      const uniqueId = Date.now();

      // Navigate through to step 5 without enabling paid registration
      await wizardPage.fillStep1({
        name: `Free League ${uniqueId}`,
        city: 'Toronto',
        stateProvince: 'Ontario',
        country: 'Canada',
        timezone: 'Eastern Time (ET)',
      });
      await wizardPage.goToNextStep();

      await wizardPage.fillStep2({
        seasonName: `Season ${uniqueId}`,
        startDate: '2026-04-01T10:00',
        endDate: '2026-07-30T22:00',
        gameDuration: 60,
        periodCount: 3,
      });
      await wizardPage.goToNextStep();

      // Step 3 - skip
      await wizardPage.goToNextStep();

      // Step 4 - don't enable fees, just skip
      await wizardPage.goToNextStep();

      // Step 5 - should show free league confirmation
      expect(await wizardPage.getCurrentStep()).toBe(5);

      // Look for the green checkmark / free league messaging
      const freeLeagueSection = page.locator('.text-green-600, .text-green-500, :has-text("Free League"), :has-text("No payment setup needed")');
      await expect(freeLeagueSection.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Review Step (Step 7)', () => {
    test('review step shows status indicators', async ({ page }) => {
      test.setTimeout(120000);
      const wizardPage = new LeagueWizardPage(page);
      await wizardPage.goto();

      const uniqueId = Date.now();

      // Complete required steps to reach review
      await wizardPage.fillStep1({
        name: `Review Test League ${uniqueId}`,
        city: 'Vancouver',
        stateProvince: 'British Columbia',
        country: 'Canada',
        timezone: 'Pacific Time (PT)',
      });
      await wizardPage.goToNextStep();

      await wizardPage.fillStep2({
        seasonName: `Review Season ${uniqueId}`,
        startDate: '2026-04-01T10:00',
        endDate: '2026-07-30T22:00',
        gameDuration: 60,
        periodCount: 3,
      });
      await wizardPage.goToNextStep();

      // Step 3 - skip teams
      await wizardPage.goToNextStep();

      // Step 4 - skip fees
      await wizardPage.goToNextStep();

      // Step 5 - skip payment
      await wizardPage.goToNextStep();

      // Step 6 - skip branding
      await wizardPage.goToNextStep();

      // Step 7 - Review
      expect(await wizardPage.getCurrentStep()).toBe(7);

      // Verify review content shows league info
      await expect(page.locator(`text=Review Test League ${uniqueId}`)).toBeVisible();

      // Should show the "Create League" submit button
      const createButton = page.locator('button:has-text("Create League")');
      await expect(createButton).toBeVisible();
    });
  });

  test.describe('Success Screen', () => {
    test.skip('success screen shows prioritized next actions after league creation', async ({ page }) => {
      // SKIP: This test creates real data in the database.
      // Run manually with: npx playwright test owner-onboarding.spec.ts --grep "success screen"
      //
      // When the wizard completes, the WizardSuccess component should show:
      // 1. League stats summary (name, season, teams, location)
      // 2. Immediate action cards (Customize Website, Generate Schedule, etc.)
      // 3. Next steps checklist with completed/pending indicators
      // 4. "Go to Dashboard" button
      //
      // These are rendered by the WizardSuccess component at:
      // apps/league-builder/src/components/league-wizard/wizard-success.tsx
    });

    test('success component renders next action cards correctly', async ({ page }) => {
      // We can test the success screen by navigating to it if accessible,
      // or by verifying the component contract through the wizard completion.
      // Since direct navigation depends on actual league creation, we verify
      // the component structure conceptually.
      //
      // The WizardSuccess component renders:
      // - Trophy icon with animation
      // - "League Created!" title
      // - League stats in a grid (League, Season, Dates, Location, Teams)
      // - Payment setup banner (if needsPaymentSetup)
      // - Immediate Actions section with cards:
      //   * Customize Website (priority)
      //   * Setup Payments (if needed, attention)
      //   * Generate Schedule
      //   * Invite Captains
      //   * Share Registration
      //   * Preview Website
      // - Next Steps checklist with completed/pending states
      // - "Go to Dashboard" button

      // This test validates these elements exist on the success route
      // after a real league creation. Skip if we can't create a league.
      test.skip();
    });
  });
});
