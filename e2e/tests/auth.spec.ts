import { test, expect } from '@playwright/test';
import { LoginPage, SignupPage, DashboardPage } from '../pages';
import { TEST_USERS, TestDataSeeder } from '../fixtures/test-data';

/**
 * Authentication Tests
 * Tests for signup, login, logout, and protected routes
 */
test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login page correctly', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Verify page elements
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Attempt login with invalid credentials
      await loginPage.login('invalid@example.com', 'wrongpassword');

      // Should show error message
      await loginPage.assertLoginError();
    });

    test('should show error for empty fields', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Click login without filling fields
      await loginPage.loginButton.click();

      // Should show validation error
      const emailError = page.locator('text=required, text=email');
      await expect(emailError.first()).toBeVisible();
    });

    test('should navigate to signup page', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.goToSignup();

      // Should be on signup page
      await expect(page).toHaveURL(/\/(signup|register)/);
    });

    test('should redirect to dashboard after successful login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Use test user credentials
      const email = process.env.E2E_TEST_USER_EMAIL || TEST_USERS.organizer.email;
      const password = process.env.E2E_TEST_USER_PASSWORD || TEST_USERS.organizer.password;

      await loginPage.loginAndRedirect(email, password);

      // Should be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      const dashboardPage = new DashboardPage(page);
      await dashboardPage.assertDashboardLoaded();
    });
  });

  test.describe('Signup', () => {
    test('should display signup page correctly', async ({ page }) => {
      const signupPage = new SignupPage(page);
      await signupPage.goto();

      // Verify page elements
      await expect(signupPage.emailInput).toBeVisible();
      await expect(signupPage.passwordInput).toBeVisible();
      await expect(signupPage.signupButton).toBeVisible();
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      const signupPage = new SignupPage(page);
      await signupPage.goto();

      // Fill with invalid email
      await signupPage.fillSignupForm({
        email: 'notanemail',
        password: '123', // Too short
        acceptTerms: true,
      });

      // The signup page now requires both terms and privacy checkboxes
      // Check both so the submit button becomes enabled
      const privacyCheckbox = page.locator('input#acceptPrivacy');
      if (await privacyCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await privacyCheckbox.check();
      }

      await signupPage.submitSignup();

      // Should show validation errors
      await signupPage.assertSignupError();
    });

    test('should show error for existing email', async ({ page }) => {
      const signupPage = new SignupPage(page);
      await signupPage.goto();

      // Try to signup with existing test user email
      // The signup page now requires both terms and privacy checkboxes
      await signupPage.signup({
        email: process.env.E2E_TEST_USER_EMAIL || TEST_USERS.organizer.email,
        password: 'TestPassword123!',
        fullName: 'Duplicate User',
        acceptTerms: true,
        acceptPrivacy: true,
      });

      // Should show error about existing account
      await signupPage.assertSignupError();
    });

    test.skip('should complete signup flow for new user', async ({ page }) => {
      // Skip in CI - creates real users
      const signupPage = new SignupPage(page);
      await signupPage.goto();

      // Generate unique email
      const uniqueEmail = `test+${Date.now()}@example.com`;

      await signupPage.signup({
        email: uniqueEmail,
        password: 'TestPassword123!',
        fullName: 'E2E New User',
        organizationName: 'E2E Test Org',
        acceptTerms: true,
        acceptPrivacy: true,
      });

      // Should redirect to verification or dashboard
      await signupPage.assertSignupSuccess();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Clear any existing auth state
      await page.context().clearCookies();

      // Try to access dashboard directly
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect unauthenticated users from settings', async ({ page }) => {
      await page.context().clearCookies();

      await page.goto('/dashboard/settings');

      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect unauthenticated users from league creation', async ({ page }) => {
      await page.context().clearCookies();

      await page.goto('/dashboard/leagues/new');

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page navigations', async ({ page, context }) => {
      // This test uses the authenticated state from setup
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Login
      const email = process.env.E2E_TEST_USER_EMAIL || TEST_USERS.organizer.email;
      const password = process.env.E2E_TEST_USER_PASSWORD || TEST_USERS.organizer.password;
      await loginPage.loginAndRedirect(email, password);

      // Navigate to different pages
      await page.goto('/dashboard/settings');
      await expect(page).not.toHaveURL(/\/login/);

      await page.goto('/dashboard/analytics');
      await expect(page).not.toHaveURL(/\/login/);

      // Return to dashboard
      await page.goto('/dashboard');
      await expect(page.locator('h1:has-text("Welcome")')).toBeVisible();
    });
  });
});

/**
 * End-to-End User Journey Test
 * Complete flow: Signup → Organization Creation → Dashboard Access
 */
test.describe('User Onboarding Journey', () => {
  test.skip('complete onboarding: signup → organization → dashboard', async ({ page }) => {
    // This test creates real data - skip in CI by default
    // Run manually with: npx playwright test auth.spec.ts --grep "complete onboarding"

    const seeder = new TestDataSeeder();
    const uniqueId = Date.now();
    const testEmail = `e2e+onboard${uniqueId}@test.com`;
    const testPassword = 'TestPassword123!';

    try {
      // Step 1: Signup
      const signupPage = new SignupPage(page);
      await signupPage.goto();

      await signupPage.signup({
        email: testEmail,
        password: testPassword,
        fullName: 'E2E Onboarding User',
        organizationName: 'E2E Test Organization',
        acceptTerms: true,
        acceptPrivacy: true,
      });

      // Wait for email verification or auto-login
      await page.waitForURL(/\/(dashboard|verify|confirm)/, { timeout: 30000 });

      // If verification required, skip the rest
      if (page.url().includes('verify') || page.url().includes('confirm')) {
        console.log('Email verification required - skipping rest of test');
        return;
      }

      // Step 2: Should be on dashboard or organization creation
      await expect(page).toHaveURL(/\/dashboard/);

      // Step 3: Create organization if prompted
      const createOrgButton = page.locator('button:has-text("Create Organization")');
      if (await createOrgButton.isVisible()) {
        await createOrgButton.click();

        // Fill organization form
        await page.fill('input[name="name"]', 'E2E Test Organization');
        await page.click('button[type="submit"]');

        // Wait for success
        await page.waitForURL(/\/dashboard/);
      }

      // Step 4: Verify dashboard access
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.assertDashboardLoaded();

      // Verify user data is displayed
      await expect(page.locator('text=E2E Onboarding User')).toBeVisible();

      console.log('✅ Onboarding journey complete');
    } finally {
      // Cleanup would require admin access to delete the user
      console.log('Test user created:', testEmail);
    }
  });
});
