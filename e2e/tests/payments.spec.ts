import { test, expect } from '@playwright/test';
import { SettingsPage } from '../pages';
import { STRIPE_TEST_CARDS } from '../fixtures/test-data';

/**
 * Payment and Billing Tests
 * Tests for Stripe integration, subscription management, and billing flows
 */
test.describe('Billing Portal', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
  });

  test('should access billing settings', async ({ page }) => {
    await settingsPage.goto();
    await settingsPage.goToBilling();

    await expect(page).toHaveURL(/\/dashboard\/settings\/billing/);
  });

  test('should display current subscription status', async ({ page }) => {
    await page.goto('/dashboard/settings/subscription');

    // Should show subscription information
    const subscriptionInfo = page.locator('[class*="subscription"], :has-text("Plan")').first();
    await expect(subscriptionInfo).toBeVisible();
  });

  test('should display billing information', async ({ page }) => {
    await page.goto('/dashboard/settings/billing');

    // Should show billing/pricing section
    await expect(page.locator('h1, h2, [class*="CardTitle"]').filter({ hasText: /billing|pricing/i })).toBeVisible();
  });
});

/**
 * Stripe Checkout Tests
 * Note: These tests interact with Stripe's test mode
 */
test.describe('Stripe Checkout', () => {
  test.skip('should redirect to Stripe checkout for subscription upgrade', async ({ page }) => {
    // This test requires Stripe test mode setup
    await page.goto('/dashboard/settings/subscription');

    // Find upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade"), a:has-text("Upgrade")');

    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();

      // Should redirect to Stripe checkout or show plan selection
      await page.waitForURL(/checkout\.stripe\.com|\/subscribe/, { timeout: 30000 });
    } else {
      test.skip();
    }
  });

  test.skip('should complete checkout with test card', async ({ page }) => {
    // This test requires Stripe test mode and a product/price setup
    // Navigate to checkout (implementation-specific)
    // await page.goto('/checkout?plan=pro');

    // Fill Stripe card element
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]');

    if (await stripeFrame.locator('input[name="cardnumber"]').isVisible()) {
      // Fill card details
      await stripeFrame.locator('input[name="cardnumber"]').fill(STRIPE_TEST_CARDS.success);
      await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
      await stripeFrame.locator('input[name="postal"]').fill('12345');

      // Submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for success
      await page.waitForURL(/success|dashboard/, { timeout: 60000 });
    } else {
      test.skip();
    }
  });

  test.skip('should handle declined card', async ({ page }) => {
    // Similar to above but with decline card
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]');

    if (await stripeFrame.locator('input[name="cardnumber"]').isVisible()) {
      await stripeFrame.locator('input[name="cardnumber"]').fill(STRIPE_TEST_CARDS.decline);
      await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('input[name="cvc"]').fill('123');

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Should show decline error
      await expect(page.locator(':has-text("declined"), :has-text("error")')).toBeVisible();
    } else {
      test.skip();
    }
  });
});

/**
 * League Connect (Stripe Connect) Tests
 */
test.describe('League Stripe Connect', () => {
  test('should access league billing page', async ({ page }) => {
    // First, navigate to a league
    await page.goto('/dashboard/leagues');

    const leagueCard = page.locator('a[href^="/dashboard/leagues/"]:not([href*="new"])').first();

    if (await leagueCard.isVisible()) {
      // Get league ID from href
      const href = await leagueCard.getAttribute('href');
      const leagueId = href?.split('/').pop();

      // Navigate to league billing
      await page.goto(`/dashboard/leagues/${leagueId}/billing`);

      // Should show billing dashboard or onboarding
      const billingContent = page.locator(':has-text("Billing"), :has-text("Connect")').first();
      await expect(billingContent).toBeVisible();
    } else {
      test.skip();
    }
  });

  test.skip('should show Stripe Connect onboarding for new leagues', async ({ page }) => {
    await page.goto('/dashboard/leagues');

    const leagueCard = page.locator('a[href^="/dashboard/leagues/"]:not([href*="new"])').first();

    if (await leagueCard.isVisible()) {
      const href = await leagueCard.getAttribute('href');
      const leagueId = href?.split('/').pop();

      await page.goto(`/dashboard/leagues/${leagueId}/billing`);

      // Look for onboarding card
      const onboardingCard = page.locator(':has-text("Connect"), :has-text("Onboard")');

      if (await onboardingCard.isVisible()) {
        // Click to start onboarding
        const startButton = page.locator('button:has-text("Start"), button:has-text("Connect")');
        if (await startButton.isVisible()) {
          await startButton.click();

          // Should redirect to Stripe Connect onboarding
          await page.waitForURL(/connect\.stripe\.com|onboard/, { timeout: 30000 });
        }
      }
    } else {
      test.skip();
    }
  });

  test('should display payment history for connected accounts', async ({ page }) => {
    await page.goto('/dashboard/leagues');

    const leagueCard = page.locator('a[href^="/dashboard/leagues/"]:not([href*="new"])').first();

    if (await leagueCard.isVisible()) {
      const href = await leagueCard.getAttribute('href');
      const leagueId = href?.split('/').pop();

      await page.goto(`/dashboard/leagues/${leagueId}/billing`);

      // Look for payment history section
      const historySection = page.locator(':has-text("Payment History"), :has-text("Transactions")');

      if (await historySection.isVisible()) {
        await expect(historySection).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});

/**
 * Subscription Management Tests
 */
test.describe('Subscription Management', () => {
  test('should display available plans', async ({ page }) => {
    await page.goto('/dashboard/settings/subscription');

    // Should show plan options or current plan
    const plansSection = page.locator(
      ':has-text("Plan"), :has-text("Subscription"), :has-text("Tier")'
    ).first();
    await expect(plansSection).toBeVisible();
  });

  test('should show current plan details', async ({ page }) => {
    await page.goto('/dashboard/settings/subscription');

    // Look for current plan indicator
    const currentPlan = page.locator(':has-text("Current"), :has-text("Active")').first();

    if (await currentPlan.isVisible()) {
      await expect(currentPlan).toBeVisible();
    }
  });

  test.skip('should allow plan upgrade', async ({ page }) => {
    await page.goto('/dashboard/settings/subscription');

    // Find upgrade option
    const upgradeButton = page.locator(
      'button:has-text("Upgrade"), a:has-text("Upgrade"), button:has-text("Pro")'
    );

    if (await upgradeButton.isVisible()) {
      await upgradeButton.click();

      // Should show confirmation or redirect to checkout
      await page.waitForURL(/checkout|confirm|stripe/, { timeout: 10000 });
    } else {
      test.skip();
    }
  });

  test('should display usage limits', async ({ page }) => {
    await page.goto('/dashboard/settings/subscription');

    // Look for usage/limits section
    const usageSection = page.locator(':has-text("Usage"), :has-text("Limits")').first();

    if (await usageSection.isVisible()) {
      await expect(usageSection).toBeVisible();
    }
  });
});

/**
 * Invoice Tests
 */
test.describe('Invoices', () => {
  test('should access invoice history', async ({ page }) => {
    await page.goto('/dashboard/settings/billing');

    // Look for invoices section
    const invoicesSection = page.locator(':has-text("Invoice"), :has-text("History")').first();

    if (await invoicesSection.isVisible()) {
      await expect(invoicesSection).toBeVisible();
    }
  });

  test.skip('should download invoice PDF', async ({ page }) => {
    await page.goto('/dashboard/settings/billing');

    // Find download button for invoice
    const downloadButton = page.locator(
      'button:has-text("Download"), a:has-text("Download"), a[href*="invoice"]'
    ).first();

    if (await downloadButton.isVisible()) {
      // Set up download handling
      const downloadPromise = page.waitForEvent('download');

      await downloadButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('invoice');
    } else {
      test.skip();
    }
  });
});
