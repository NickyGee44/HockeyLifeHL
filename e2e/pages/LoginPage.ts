import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login Page Object Model
 * Handles authentication flows: login, signup, password reset
 */
export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly googleButton: Locator;

  constructor(page: Page) {
    super(page, '/login');

    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.signupLink = page.locator('a:has-text("Sign up"), a:has-text("Create account")');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("Reset")');
    this.errorMessage = page.locator('[role="alert"], .error-message, .text-red-500');
    this.googleButton = page.locator('button:has-text("Google")');
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Login and wait for dashboard redirect
   */
  async loginAndRedirect(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.waitForNavigation(/\/dashboard/);
  }

  /**
   * Assert login error is displayed
   */
  async assertLoginError(expectedMessage?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (expectedMessage) {
      await expect(this.errorMessage).toContainText(expectedMessage);
    }
  }

  /**
   * Navigate to signup page
   */
  async goToSignup(): Promise<void> {
    await this.signupLink.click();
    await this.waitForNavigation(/\/(signup|register)/);
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.waitForNavigation(/\/(forgot|reset)/);
  }

  /**
   * Check if login page is displayed
   */
  async isDisplayed(): Promise<boolean> {
    return (
      (await this.emailInput.isVisible()) &&
      (await this.passwordInput.isVisible()) &&
      (await this.loginButton.isVisible())
    );
  }
}

/**
 * Signup Page Object Model
 *
 * Updated for the new signup form which includes:
 * - Full name, email, password fields
 * - Organization/company name field
 * - Separate Terms of Service and Privacy Policy checkboxes
 * - Submit button disabled until both checkboxes are checked
 */
export class SignupPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly fullNameInput: Locator;
  readonly organizationNameInput: Locator;
  readonly signupButton: Locator;
  readonly loginLink: Locator;
  readonly termsCheckbox: Locator;
  readonly privacyCheckbox: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page, '/signup');

    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator(
      'input[name="password"]:not([name*="confirm"]), input[type="password"]:first-of-type'
    );
    this.confirmPasswordInput = page.locator(
      'input[name*="confirm"], input[type="password"]:last-of-type'
    );
    this.fullNameInput = page.locator('input[name="name"], input[name="fullName"], input[name="full_name"], input#fullName');
    this.organizationNameInput = page.locator('input[name="organizationName"], input#organizationName');
    this.signupButton = page.locator('button[type="submit"]');
    this.loginLink = page.locator('a:has-text("Log in"), a:has-text("Sign in")');
    // Separate locators for the two required checkboxes
    this.termsCheckbox = page.locator('input#acceptTerms');
    this.privacyCheckbox = page.locator('input#acceptPrivacy');
    this.errorMessage = page.locator('[role="alert"], .error-message, .text-red-400, .text-red-500');
    this.successMessage = page.locator('.text-green-500, [data-success]');
  }

  /**
   * Fill signup form
   */
  async fillSignupForm(data: {
    email: string;
    password: string;
    fullName?: string;
    organizationName?: string;
    acceptTerms?: boolean;
    acceptPrivacy?: boolean;
  }): Promise<void> {
    // Fill name if provided
    if (data.fullName && (await this.fullNameInput.isVisible())) {
      await this.fullNameInput.fill(data.fullName);
    }

    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);

    // Some forms have confirm password
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(data.password);
    }

    // Fill organization name if field exists
    if (data.organizationName && (await this.organizationNameInput.isVisible())) {
      await this.organizationNameInput.fill(data.organizationName);
    }

    // Accept Terms of Service checkbox
    if (data.acceptTerms !== false && (await this.termsCheckbox.isVisible())) {
      await this.termsCheckbox.check();
    }

    // Accept Privacy Policy checkbox
    if (data.acceptPrivacy !== false && (await this.privacyCheckbox.isVisible())) {
      await this.privacyCheckbox.check();
    }
  }

  /**
   * Submit signup form
   */
  async submitSignup(): Promise<void> {
    await this.signupButton.click();
  }

  /**
   * Complete signup flow
   */
  async signup(data: {
    email: string;
    password: string;
    fullName?: string;
    organizationName?: string;
    acceptTerms?: boolean;
    acceptPrivacy?: boolean;
  }): Promise<void> {
    await this.fillSignupForm({
      ...data,
      // Default both checkboxes to true for signup convenience
      acceptTerms: data.acceptTerms ?? true,
      acceptPrivacy: data.acceptPrivacy ?? true,
    });
    await this.submitSignup();
  }

  /**
   * Assert signup error
   */
  async assertSignupError(expectedMessage?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (expectedMessage) {
      await expect(this.errorMessage).toContainText(expectedMessage);
    }
  }

  /**
   * Assert signup success (email verification message)
   */
  async assertSignupSuccess(): Promise<void> {
    // After signup, usually shows verification message or redirects
    await this.page.waitForURL(/\/(verify|confirm|dashboard|check-email)/, {
      timeout: 10000,
    });
  }
}
