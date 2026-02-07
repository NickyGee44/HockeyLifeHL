import { test, expect } from '@playwright/test';

/**
 * Auth Locale E2E Tests
 *
 * Protects locale-aware authentication flows:
 * - Signup page renders correct language for legal links
 * - Legal links preserve locale context
 * - Terms and Privacy pages exist and render content in both locales
 *
 * These tests run in the 'unauthenticated' project (no auth state needed)
 * since they test public signup and legal pages.
 */

test.describe('Auth Locale - English', () => {
  test('signup page in English has English legal links', async ({ page }) => {
    await page.goto('/en/signup');
    await page.waitForLoadState('networkidle');

    // Verify the page renders (form is visible)
    await expect(page.locator('input#email')).toBeVisible();

    // Terms of Service link should have English text
    const termsLink = page.locator('a[href*="/terms"]').first();
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveText(/Terms of Service/);

    // Privacy Policy link should have English text
    const privacyLink = page.locator('a[href*="/privacy"]').first();
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText(/Privacy Policy/);
  });

  test('English Terms of Service page renders content', async ({ page }) => {
    await page.goto('/en/terms');
    await page.waitForLoadState('networkidle');

    // Page should have the Terms of Service heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Terms of Service/);

    // Should have "Last Updated" text
    await expect(page.locator('text=Last Updated')).toBeVisible();

    // Should have prose content (the actual terms text)
    const proseContent = page.locator('.prose');
    await expect(proseContent).toBeVisible();

    // Should have a "Back to Home" link
    const backLink = page.locator('a:has-text("Back to Home")');
    await expect(backLink).toBeVisible();
  });

  test('English Privacy Policy page renders content', async ({ page }) => {
    await page.goto('/en/privacy');
    await page.waitForLoadState('networkidle');

    // Page should have the Privacy Policy heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Privacy Policy/);

    // Should have "Last Updated" text
    await expect(page.locator('text=Last Updated')).toBeVisible();

    // Should have prose content
    const proseContent = page.locator('.prose');
    await expect(proseContent).toBeVisible();
  });

  test('legal links from English signup preserve locale context', async ({ page }) => {
    await page.goto('/en/signup');
    await page.waitForLoadState('networkidle');

    // Click the Terms of Service link (opens in new tab)
    const termsLink = page.locator('a[href*="/terms"]').first();
    await expect(termsLink).toBeVisible();

    // Verify the href includes /en/ or is relative within English locale
    const termsHref = await termsLink.getAttribute('href');
    // The link should route to the English terms page
    // next-intl Link component handles locale prefixing
    expect(termsHref).toBeTruthy();
    // The href should contain /terms (locale prefix is handled by next-intl)
    expect(termsHref).toContain('/terms');

    // Click the Privacy Policy link
    const privacyLink = page.locator('a[href*="/privacy"]').first();
    await expect(privacyLink).toBeVisible();

    const privacyHref = await privacyLink.getAttribute('href');
    expect(privacyHref).toBeTruthy();
    expect(privacyHref).toContain('/privacy');
  });
});

test.describe('Auth Locale - French', () => {
  test('signup page in French has French legal links', async ({ page }) => {
    await page.goto('/fr/signup');
    await page.waitForLoadState('networkidle');

    // Verify the page renders
    await expect(page.locator('input#email')).toBeVisible();

    // Terms link should have French text
    // French: "Conditions d'utilisation"
    const termsLink = page.locator('a[href*="/terms"]').first();
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveText(/Conditions d'utilisation/i);

    // Privacy link should have French text
    // French: "Politique de confidentialite"
    const privacyLink = page.locator('a[href*="/privacy"]').first();
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveText(/Politique de confidentialit/i);
  });

  test('French Terms of Service page renders content', async ({ page }) => {
    await page.goto('/fr/terms');
    await page.waitForLoadState('networkidle');

    // Page should have the French heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    // French: "Conditions d'utilisation"
    await expect(heading).toHaveText(/Conditions d'utilisation/i);

    // Should have prose content
    const proseContent = page.locator('.prose');
    await expect(proseContent).toBeVisible();
  });

  test('French Privacy Policy page renders content', async ({ page }) => {
    await page.goto('/fr/privacy');
    await page.waitForLoadState('networkidle');

    // Page should have the French heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    // French: "Politique de confidentialite"
    await expect(heading).toHaveText(/Politique de confidentialit/i);

    // Should have prose content
    const proseContent = page.locator('.prose');
    await expect(proseContent).toBeVisible();
  });

  test('legal links from French signup preserve locale context', async ({ page }) => {
    await page.goto('/fr/signup');
    await page.waitForLoadState('networkidle');

    // Terms link should route to French terms page
    const termsLink = page.locator('a[href*="/terms"]').first();
    await expect(termsLink).toBeVisible();

    const termsHref = await termsLink.getAttribute('href');
    expect(termsHref).toBeTruthy();
    expect(termsHref).toContain('/terms');

    // Privacy link should route to French privacy page
    const privacyLink = page.locator('a[href*="/privacy"]').first();
    await expect(privacyLink).toBeVisible();

    const privacyHref = await privacyLink.getAttribute('href');
    expect(privacyHref).toBeTruthy();
    expect(privacyHref).toContain('/privacy');
  });

  test('navigating from French signup Terms link goes to French terms page', async ({ page }) => {
    await page.goto('/fr/signup');
    await page.waitForLoadState('networkidle');

    // The Terms link opens in a new tab (target="_blank")
    // We can test navigation in a new page context
    const termsLink = page.locator('a[href*="/terms"]').first();

    // Listen for new page (popup) when clicking the link
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      termsLink.click(),
    ]);

    await newPage.waitForLoadState('networkidle');

    // The new page should be the French terms page
    const url = newPage.url();
    expect(url).toContain('/fr/terms');

    // Verify French heading is displayed
    const heading = newPage.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Conditions d'utilisation/i);

    await newPage.close();
  });

  test('navigating from French signup Privacy link goes to French privacy page', async ({ page }) => {
    await page.goto('/fr/signup');
    await page.waitForLoadState('networkidle');

    // The Privacy link opens in a new tab (target="_blank")
    const privacyLink = page.locator('a[href*="/privacy"]').first();

    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      privacyLink.click(),
    ]);

    await newPage.waitForLoadState('networkidle');

    // The new page should be the French privacy page
    const url = newPage.url();
    expect(url).toContain('/fr/privacy');

    // Verify French heading
    const heading = newPage.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Politique de confidentialit/i);

    await newPage.close();
  });
});

test.describe('Auth Locale - Cross-Locale Consistency', () => {
  test('both locale signup pages have the same form structure', async ({ page }) => {
    // Check English
    await page.goto('/en/signup');
    await page.waitForLoadState('networkidle');

    const enFields = {
      fullName: await page.locator('input#fullName').isVisible(),
      email: await page.locator('input#email').isVisible(),
      password: await page.locator('input#password').isVisible(),
      organizationName: await page.locator('input#organizationName').isVisible(),
      acceptTerms: await page.locator('input#acceptTerms').isVisible(),
      acceptPrivacy: await page.locator('input#acceptPrivacy').isVisible(),
    };

    // Check French
    await page.goto('/fr/signup');
    await page.waitForLoadState('networkidle');

    const frFields = {
      fullName: await page.locator('input#fullName').isVisible(),
      email: await page.locator('input#email').isVisible(),
      password: await page.locator('input#password').isVisible(),
      organizationName: await page.locator('input#organizationName').isVisible(),
      acceptTerms: await page.locator('input#acceptTerms').isVisible(),
      acceptPrivacy: await page.locator('input#acceptPrivacy').isVisible(),
    };

    // Both should have identical form structure
    expect(enFields).toEqual(frFields);

    // All fields should be visible
    expect(enFields.fullName).toBe(true);
    expect(enFields.email).toBe(true);
    expect(enFields.password).toBe(true);
    expect(enFields.organizationName).toBe(true);
    expect(enFields.acceptTerms).toBe(true);
    expect(enFields.acceptPrivacy).toBe(true);
  });
});
